import { apiRequest } from "./queryClient";
import { auth } from "./firebase";

// Send notification when appointment is booked
export async function notifyAppointmentBooked(
  patientId: string,
  doctorUid: string | null,
  appointmentDate: Date,
  appointmentType: string,
  createdBy: "patient" | "doctor"
): Promise<boolean> {
  try {
    // Get authentication token
    if (!auth.currentUser) {
      console.warn("⚠️ User not authenticated, cannot send notification");
      return false;
    }
    
    const token = await auth.currentUser.getIdToken();
    
    // Notify patient
    console.log("📤 Sending appointment notification to patient:", patientId);
    try {
      const patientResponse = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          type: "appointment_booked_patient",
          recipientId: patientId,
          recipientType: "patient",
          data: {
            appointmentDate: appointmentDate.toISOString(),
            appointmentType,
          },
        }),
      });

      if (!patientResponse.ok) {
        const errorText = await patientResponse.text();
        console.warn("⚠️ Patient notification HTTP error:", errorText);
        // Continue even if notification fails
      } else {
        const patientData = await patientResponse.json();
        console.log("✅ Patient notification result:", patientData);
        
        if (!patientData.success) {
          console.warn("⚠️ Patient notification failed:", patientData.message || patientData.error);
        }
      }
    } catch (error: any) {
      // Network error or server unavailable - don't break the flow
      console.warn("⚠️ Could not send patient notification (server may be unavailable):", error?.message || "Connection error");
      // Notification is optional, so we continue even if it fails
    }

    // Notify doctor if appointment was created by patient or if doctorUid exists
    if (doctorUid && (createdBy === "patient" || createdBy === "doctor")) {
      console.log("📤 Sending appointment notification to doctor:", doctorUid);
      try {
        const doctorResponse = await fetch("/api/notifications/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            type: "appointment_booked_doctor",
            recipientId: doctorUid,
            recipientType: "doctor",
            data: {
              patientId,
              appointmentDate: appointmentDate.toISOString(),
              appointmentType,
            },
          }),
        });
        
        if (doctorResponse.ok) {
          const doctorData = await doctorResponse.json();
          console.log("✅ Doctor notification result:", doctorData);
          
          if (!doctorData.success) {
            console.warn("⚠️ Doctor notification failed:", doctorData.message || doctorData.error);
          }
        } else {
          const errorText = await doctorResponse.text();
          console.warn("⚠️ Doctor notification HTTP error:", errorText);
        }
      } catch (error: any) {
        // Network error or server unavailable - don't break the flow
        console.warn("⚠️ Could not send doctor notification (server may be unavailable):", error?.message || "Connection error");
        // Notification is optional, so we continue even if it fails
      }
    }
    
    return true;
  } catch (error: any) {
    console.error("❌ Error sending appointment notification:", error?.message || error);
    // Don't throw error - notification failure shouldn't break appointment creation
    return false;
  }
}

// Send high risk alert notification
export async function notifyHighRisk(
  patientId: string,
  doctorUid: string | null
): Promise<boolean> {
  try {
    // Get authentication token
    if (!auth.currentUser) {
      console.warn("⚠️ User not authenticated, cannot send notification");
      return false;
    }
    
    const token = await auth.currentUser.getIdToken();
    
    // Notify patient
    try {
      const patientResponse = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          type: "high_risk_patient",
          recipientId: patientId,
          recipientType: "patient",
          data: {},
        }),
      });
      
      if (!patientResponse.ok) {
        console.warn("⚠️ Failed to send high risk notification to patient");
        // Continue even if notification fails
      }
    } catch (error: any) {
      console.warn("⚠️ Could not send high risk notification to patient (server may be unavailable):", error?.message || "Connection error");
      // Continue even if notification fails
    }

    // Notify doctor if assigned
    if (doctorUid) {
      try {
        const doctorResponse = await fetch("/api/notifications/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            type: "high_risk_doctor",
            recipientId: doctorUid,
            recipientType: "doctor",
            data: {
              patientId,
            },
          }),
        });
        
        if (!doctorResponse.ok) {
          console.warn("⚠️ Failed to send high risk notification to doctor");
        }
      } catch (error: any) {
        console.warn("⚠️ Could not send high risk notification to doctor (server may be unavailable):", error?.message || "Connection error");
      }
    }

    return true;
  } catch (error: any) {
    console.error("❌ Error sending high risk notification:", error?.message || error);
    return false;
  }
}

// Send notification when medication is added by doctor
export async function notifyMedicationAdded(
  patientId: string,
  medicationName: string,
  dosage: string,
  times: string[],
  startDate: string
): Promise<boolean> {
  try {
    // Get authentication token
    if (!auth.currentUser) {
      console.warn("⚠️ User not authenticated, cannot send notification");
      return false;
    }
    
    const token = await auth.currentUser.getIdToken();
    
    // Notify patient
    console.log("📤 Sending medication added notification to patient:", patientId);
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          type: "medication_added",
          recipientId: patientId,
          recipientType: "patient",
          data: {
            medicationName,
            dosage,
            times,
            startDate,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("⚠️ Medication notification HTTP error:", errorText);
        // Continue even if notification fails
      } else {
        const data = await response.json();
        console.log("✅ Medication notification result:", data);
        
        if (!data.success) {
          console.warn("⚠️ Medication notification failed:", data.message || data.error);
        }
      }
      return true;
    } catch (error: any) {
      console.warn("⚠️ Could not send medication notification (server may be unavailable):", error?.message || "Connection error");
      // Notification is optional, so we continue even if it fails
      return true;
    }
  } catch (error: any) {
    console.error("❌ Error sending medication notification:", error?.message || error);
    return false;
  }
}

// Test notification (for debugging)
export async function testNotification(phone: string, message: string): Promise<boolean> {
  try {
    // Get authentication token
    if (!auth.currentUser) {
      console.warn("⚠️ User not authenticated, cannot send test notification");
      return false;
    }
    
    const token = await auth.currentUser.getIdToken();
    
    const response = await fetch("/api/notifications/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({
        phone,
        message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Test notification failed:", errorText);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error: any) {
    console.error("❌ Error sending test notification:", error?.message || error);
    return false;
  }
}

