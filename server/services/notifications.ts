import { sendWhatsAppMessage, NotificationTemplates, formatDateTime, isTwilioConfigured } from "./twilio";
import { firestoreDb } from "../lib/firebase-admin";

// Get patient phone number from Firestore
export async function getPatientPhone(patientId: string): Promise<string | null> {
  try {
    if (!firestoreDb) {
      console.warn("Firestore not initialized");
      return null;
    }
    const patientDoc = await firestoreDb.collection("patients").doc(patientId).get();
    if (patientDoc.exists) {
      const data = patientDoc.data();
      return data?.phone || data?.phoneNumber || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting patient phone:", error);
    return null;
  }
}

// Get doctor phone number from Firestore
export async function getDoctorPhone(doctorUid: string): Promise<string | null> {
  try {
    if (!firestoreDb) {
      console.warn("Firestore not initialized");
      return null;
    }
    const doctorDoc = await firestoreDb.collection("doctors").doc(doctorUid).get();
    if (doctorDoc.exists) {
      const data = doctorDoc.data();
      return data?.phone || data?.phoneNumber || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting doctor phone:", error);
    return null;
  }
}

// Get patient name from Firestore
export async function getPatientName(patientId: string): Promise<string> {
  try {
    if (!firestoreDb) {
      return "المريضة";
    }
    const patientDoc = await firestoreDb.collection("patients").doc(patientId).get();
    if (patientDoc.exists) {
      const data = patientDoc.data();
      return data?.name || "المريضة";
    }
    return "المريضة";
  } catch (error) {
    console.error("Error getting patient name:", error);
    return "المريضة";
  }
}

// Get doctor name from Firestore
export async function getDoctorName(doctorUid: string): Promise<string> {
  try {
    if (!firestoreDb) {
      return "الدكتور";
    }
    const doctorDoc = await firestoreDb.collection("doctors").doc(doctorUid).get();
    if (doctorDoc.exists) {
      const data = doctorDoc.data();
      return data?.name || "الدكتور";
    }
    return "الدكتور";
  } catch (error) {
    console.error("Error getting doctor name:", error);
    return "الدكتور";
  }
}

// Send appointment booked notification to patient
export async function notifyAppointmentBookedToPatient(
  patientId: string,
  appointmentDate: Date,
  appointmentType: string
): Promise<boolean> {
  console.log(`🔔 Attempting to send appointment notification to patient ${patientId}`);
  
  if (!isTwilioConfigured()) {
    console.warn("⚠️ Twilio not configured, skipping notification");
    return false;
  }

  try {
    const phone = await getPatientPhone(patientId);
    console.log(`📱 Patient phone for ${patientId}:`, phone ? `${phone.substring(0, 5)}...` : "NOT FOUND");
    
    if (!phone) {
      console.warn(`❌ No phone number found for patient ${patientId}`);
      return false;
    }

    const patientName = await getPatientName(patientId);
    console.log(`👤 Patient name: ${patientName}`);
    
    const { date, time } = formatDateTime(appointmentDate);
    
    const typeMap: Record<string, string> = {
      consultation: "استشارة",
      followup: "متابعة",
      examination: "فحص",
      medication_review: "مراجعة دواء",
      risk_assessment: "تقييم مخاطر",
      other: "أخرى",
    };

    const typeText = typeMap[appointmentType] || appointmentType;
    const message = NotificationTemplates.appointmentBooked(patientName, date, time, typeText);
    
    console.log(`📤 Sending WhatsApp message to ${phone}...`);
    const result = await sendWhatsAppMessage(phone, message);
    
    if (result.success) {
      console.log(`✅ WhatsApp message sent successfully to patient ${patientId}`);
    } else {
      console.error(`❌ Failed to send WhatsApp message:`, result.error);
    }
    
    return result.success;
  } catch (error: any) {
    console.error("❌ Error sending appointment booked notification to patient:", error?.message || error);
    return false;
  }
}

// Send appointment booked notification to doctor
export async function notifyAppointmentBookedToDoctor(
  doctorUid: string,
  patientId: string,
  appointmentDate: Date,
  appointmentType: string
): Promise<boolean> {
  console.log(`🔔 Attempting to send appointment notification to doctor ${doctorUid}`);
  
  if (!isTwilioConfigured()) {
    console.warn("⚠️ Twilio not configured, skipping notification");
    return false;
  }

  try {
    const phone = await getDoctorPhone(doctorUid);
    console.log(`📱 Doctor phone for ${doctorUid}:`, phone ? `${phone.substring(0, 5)}...` : "NOT FOUND");
    
    if (!phone) {
      console.warn(`❌ No phone number found for doctor ${doctorUid}`);
      console.warn(`   Please add phone number to doctor profile in Firestore: doctors/${doctorUid}`);
      return false;
    }

    const doctorName = await getDoctorName(doctorUid);
    const patientName = await getPatientName(patientId);
    console.log(`👤 Doctor name: ${doctorName}, Patient name: ${patientName}`);
    
    const { date, time } = formatDateTime(appointmentDate);
    
    const typeMap: Record<string, string> = {
      consultation: "استشارة",
      followup: "متابعة",
      examination: "فحص",
      medication_review: "مراجعة دواء",
      risk_assessment: "تقييم مخاطر",
      other: "أخرى",
    };

    const typeText = typeMap[appointmentType] || appointmentType;
    const message = NotificationTemplates.appointmentBookedDoctor(doctorName, patientName, date, time, typeText);
    
    console.log(`📤 Sending WhatsApp message to ${phone}...`);
    const result = await sendWhatsAppMessage(phone, message);
    
    if (result.success) {
      console.log(`✅ WhatsApp message sent successfully to doctor ${doctorUid}`);
    } else {
      console.error(`❌ Failed to send WhatsApp message:`, result.error);
    }
    
    return result.success;
  } catch (error: any) {
    console.error("❌ Error sending appointment booked notification to doctor:", error?.message || error);
    return false;
  }
}

// Send appointment reminder
export async function notifyAppointmentReminder(
  patientId: string,
  appointmentDate: Date,
  hoursUntil: number
): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.warn("Twilio not configured, skipping notification");
    return false;
  }

  try {
    const phone = await getPatientPhone(patientId);
    if (!phone) {
      console.warn(`No phone number found for patient ${patientId}`);
      return false;
    }

    const patientName = await getPatientName(patientId);
    const { date, time } = formatDateTime(appointmentDate);
    const message = NotificationTemplates.appointmentReminder(patientName, date, time, hoursUntil);
    
    const result = await sendWhatsAppMessage(phone, message);
    return result.success;
  } catch (error) {
    console.error("Error sending appointment reminder:", error);
    return false;
  }
}

// Send medication added notification to patient
export async function notifyMedicationAddedToPatient(
  patientId: string,
  medicationName: string,
  dosage: string,
  times: string[],
  startDate: string
): Promise<boolean> {
  console.log(`🔔 Attempting to send medication added notification to patient ${patientId}`);
  
  if (!isTwilioConfigured()) {
    console.warn("⚠️ Twilio not configured, skipping notification");
    return false;
  }

  try {
    const phone = await getPatientPhone(patientId);
    console.log(`📱 Patient phone for ${patientId}:`, phone ? `${phone.substring(0, 5)}...` : "NOT FOUND");
    
    if (!phone) {
      console.warn(`❌ No phone number found for patient ${patientId}`);
      return false;
    }

    const patientName = await getPatientName(patientId);
    console.log(`👤 Patient name: ${patientName}`);
    
    // Format start date in Arabic
    const startDateObj = new Date(startDate);
    const formattedStartDate = new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(startDateObj);
    
    const message = NotificationTemplates.medicationAdded(patientName, medicationName, dosage, times, formattedStartDate);
    
    console.log(`📤 Sending WhatsApp message to ${phone}...`);
    const result = await sendWhatsAppMessage(phone, message);
    
    if (result.success) {
      console.log(`✅ WhatsApp message sent successfully to patient ${patientId}`);
    } else {
      console.error(`❌ Failed to send WhatsApp message:`, result.error);
    }
    
    return result.success;
  } catch (error: any) {
    console.error("❌ Error sending medication added notification to patient:", error?.message || error);
    return false;
  }
}

// Send medication reminder
export async function notifyMedicationReminder(
  patientId: string,
  medicationName: string,
  time: string
): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.warn("Twilio not configured, skipping notification");
    return false;
  }

  try {
    const phone = await getPatientPhone(patientId);
    if (!phone) {
      console.warn(`No phone number found for patient ${patientId}`);
      return false;
    }

    const patientName = await getPatientName(patientId);
    const message = NotificationTemplates.medicationReminder(patientName, medicationName, time);
    
    const result = await sendWhatsAppMessage(phone, message);
    return result.success;
  } catch (error) {
    console.error("Error sending medication reminder:", error);
    return false;
  }
}

// Send high risk alert to patient
export async function notifyHighRiskToPatient(patientId: string): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.warn("Twilio not configured, skipping notification");
    return false;
  }

  try {
    const phone = await getPatientPhone(patientId);
    if (!phone) {
      console.warn(`No phone number found for patient ${patientId}`);
      return false;
    }

    const patientName = await getPatientName(patientId);
    const message = NotificationTemplates.highRiskAlert(patientName);
    
    const result = await sendWhatsAppMessage(phone, message);
    return result.success;
  } catch (error) {
    console.error("Error sending high risk alert to patient:", error);
    return false;
  }
}

// Send high risk alert to doctor
export async function notifyHighRiskToDoctor(doctorUid: string, patientId: string): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.warn("Twilio not configured, skipping notification");
    return false;
  }

  try {
    const phone = await getDoctorPhone(doctorUid);
    if (!phone) {
      console.warn(`No phone number found for doctor ${doctorUid}`);
      return false;
    }

    const doctorName = await getDoctorName(doctorUid);
    const patientName = await getPatientName(patientId);
    const message = NotificationTemplates.highRiskAlertDoctor(doctorName, patientName);
    
    const result = await sendWhatsAppMessage(phone, message);
    return result.success;
  } catch (error) {
    console.error("Error sending high risk alert to doctor:", error);
    return false;
  }
}

// Send custom message
export async function sendCustomNotification(
  recipientId: string,
  recipientType: "patient" | "doctor",
  message: string
): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.warn("Twilio not configured, skipping notification");
    return false;
  }

  try {
    const phone = recipientType === "patient"
      ? await getPatientPhone(recipientId)
      : await getDoctorPhone(recipientId);
    
    if (!phone) {
      console.warn(`No phone number found for ${recipientType} ${recipientId}`);
      return false;
    }

    const recipientName = recipientType === "patient"
      ? await getPatientName(recipientId)
      : await getDoctorName(recipientId);
    
    const fullMessage = NotificationTemplates.customMessage(recipientName, message);
    const result = await sendWhatsAppMessage(phone, fullMessage);
    return result.success;
  } catch (error) {
    console.error("Error sending custom notification:", error);
    return false;
  }
}

