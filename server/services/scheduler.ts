import { firestoreDb, Timestamp } from "../lib/firebase-admin";
import {
  notifyAppointmentReminder,
  notifyMedicationReminder,
} from "./notifications";

// Check and send appointment reminders
export async function checkAppointmentReminders(): Promise<void> {
  if (!firestoreDb) {
    // Silently skip if Firestore is not initialized
    return;
  }

  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

    // Get upcoming appointments within the next 24 hours
    const appointmentsSnapshot = await firestoreDb
      .collection("appointments")
      .where("status", "==", "upcoming")
      .where("reminder", "==", true)
      .get();
    const appointments = appointmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    for (const appointment of appointments) {
      if (!appointment.at || !appointment.patientId) continue;

      // Handle Firestore Timestamp or ISO string
      let appointmentDate: Date;
      if (appointment.at?.toDate) {
        appointmentDate = appointment.at.toDate();
      } else if (appointment.at?.seconds) {
        appointmentDate = new Date(appointment.at.seconds * 1000);
      } else {
        appointmentDate = new Date(appointment.at);
      }
      
      const timeUntil = appointmentDate.getTime() - now.getTime();
      const hoursUntil = timeUntil / (1000 * 60 * 60);

      // Send reminder 1 hour before appointment
      if (hoursUntil > 0 && hoursUntil <= 1.5 && !appointment.reminderSent1h) {
        await notifyAppointmentReminder(appointment.patientId, appointmentDate, Math.round(hoursUntil));
        
        // Mark reminder as sent
        if (firestoreDb) {
          await firestoreDb.collection("appointments").doc(appointment.id).update({
            reminderSent1h: true,
            reminderSent1hAt: Timestamp.now(),
          });
        }
      }

      // Send reminder 24 hours before appointment
      if (hoursUntil > 20 && hoursUntil <= 25 && !appointment.reminderSent24h) {
        await notifyAppointmentReminder(appointment.patientId, appointmentDate, Math.round(hoursUntil));
        
        // Mark reminder as sent
        if (firestoreDb) {
          await firestoreDb.collection("appointments").doc(appointment.id).update({
            reminderSent24h: true,
            reminderSent24hAt: Timestamp.now(),
          });
        }
      }
    }
  } catch (error: any) {
    // Only log if it's not a project ID error (which is expected if Firebase Admin is not configured)
    if (error?.message && !error.message.includes("Project Id")) {
      console.error("Error checking appointment reminders:", error.message);
    }
    // Silently ignore Firebase Admin not configured errors
  }
}

// Check and send medication reminders
export async function checkMedicationReminders(): Promise<void> {
  if (!firestoreDb) {
    // Silently skip if Firestore is not initialized
    return;
  }

  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Get all medications from medications collection
    const medicationsSnapshot = await firestoreDb
      .collection("medications")
      .where("reminder", "==", true)
      .get();
    const medications = medicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    for (const medication of medications) {
      if (!medication.patientId || !medication.name || !medication.times) continue;
      
      // Check if medication is still active (not past endDate)
      if (medication.endDate) {
        const endDate = medication.endDate?.toDate ? medication.endDate.toDate() : new Date(medication.endDate);
        if (endDate < now) continue; // Medication has ended
      }
      
      // Check if medication has started
      if (medication.startDate) {
        const startDate = medication.startDate?.toDate ? medication.startDate.toDate() : new Date(medication.startDate);
        if (startDate > now) continue; // Medication hasn't started yet
      }

      if (!medication.times || !Array.isArray(medication.times)) continue;

      for (const time of medication.times) {
        // Parse time (format: "HH:MM" or "HH:MM AM/PM")
        const timeParts = time.split(":");
        if (timeParts.length !== 2) continue;

        let reminderHour = parseInt(timeParts[0]);
        let reminderMinute = parseInt(timeParts[1].split(" ")[0]);
        
        // Handle AM/PM if present
        if (time.includes("PM") && reminderHour !== 12) {
          reminderHour += 12;
        } else if (time.includes("AM") && reminderHour === 12) {
          reminderHour = 0;
        }

        // Check if it's time to send reminder (within 5 minutes of scheduled time)
        const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (reminderHour * 60 + reminderMinute));
        
        if (timeDiff <= 5) {
          // Check if reminder was already sent today
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          const lastReminderKey = `lastReminder_${medication.id}_${time}_${today}`;
          
          // Get patient document to check last reminder
          const patientDoc = await firestoreDb.collection("patients").doc(medication.patientId).get();
          const patientData = patientDoc.exists ? patientDoc.data() : {};
          
          if (!patientData || !patientData[lastReminderKey]) {
            await notifyMedicationReminder(medication.patientId, medication.name, time);
            
            // Mark reminder as sent in patient document
            if (firestoreDb) {
              await firestoreDb.collection("patients").doc(medication.patientId).update({
                [lastReminderKey]: Timestamp.now(),
              });
            }
          }
        }
      }
    }
  } catch (error: any) {
    // Only log if it's not a project ID error (which is expected if Firebase Admin is not configured)
    if (error?.message && !error.message.includes("Project Id")) {
      console.error("Error checking medication reminders:", error.message);
    }
    // Silently ignore Firebase Admin not configured errors
  }
}

// Run scheduler checks periodically
export function startScheduler(): void {
  // Check if Firestore is initialized
  if (!firestoreDb) {
    console.log("ℹ️  Scheduler disabled - Firebase Admin not configured. Scheduled reminders won't work, but manual notifications via API will still work.");
    return;
  }


  // Check reminders every 5 minutes
  setInterval(() => {
    checkAppointmentReminders();
    checkMedicationReminders();
  }, 5 * 60 * 1000); // 5 minutes

  // Also run immediately on startup (but don't wait for it)
  checkAppointmentReminders().catch(() => {});
  checkMedicationReminders().catch(() => {});

  console.log("✅ Scheduler started - checking reminders every 5 minutes");
}

