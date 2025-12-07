import twilio from "twilio";

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // Format: whatsapp:+14155238886

// Initialize Twilio client
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Check if Twilio is configured
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && whatsappFrom);
}

// Format phone number to E.164 format (required by Twilio)
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // If it starts with 0, replace with country code for Egypt (+20)
  if (cleaned.startsWith("0")) {
    cleaned = "20" + cleaned.substring(1);
  }
  
  // If it doesn't start with country code, add +20 for Egypt
  if (!cleaned.startsWith("20")) {
    cleaned = "20" + cleaned;
  }
  
  // Add + prefix and whatsapp: prefix for Twilio
  return `whatsapp:+${cleaned}`;
}

// Send WhatsApp message
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!client || !isTwilioConfigured()) {
    console.warn("⚠️ Twilio is not configured. Message not sent.");
    return {
      success: false,
      error: "Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in environment variables.",
    };
  }

  try {
    const formattedTo = formatPhoneNumber(to);
    const formattedFrom = whatsappFrom!.startsWith("whatsapp:") 
      ? whatsappFrom! 
      : `whatsapp:${whatsappFrom!}`;

    const result = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body: message,
    });

    console.log(`✅ WhatsApp message sent to ${formattedTo}: ${result.sid}`);
    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    console.error("❌ Error sending WhatsApp message:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

// Notification message templates
export const NotificationTemplates = {
  // Appointment notifications
  appointmentBooked: (patientName: string, appointmentDate: string, appointmentTime: string, type: string) => 
    `مرحباً ${patientName} 👋\n\n` +
    `✅ تم حجز موعد جديد:\n` +
    `📅 التاريخ: ${appointmentDate}\n` +
    `🕐 الوقت: ${appointmentTime}\n` +
    `🏥 النوع: ${type}\n\n` +
    `يرجى التأكد من حضورك في الوقت المحدد.\n\n` +
    `رفيق الأمل 💗`,

  appointmentReminder: (patientName: string, appointmentDate: string, appointmentTime: string, hoursUntil: number) => {
    const timeText = hoursUntil === 1 ? "ساعة واحدة" : hoursUntil === 24 ? "يوم واحد" : hoursUntil < 24 ? `${hoursUntil} ساعة` : `${Math.floor(hoursUntil / 24)} يوم`;
    const urgencyEmoji = hoursUntil <= 1 ? "🚨" : hoursUntil <= 24 ? "⏰" : "📅";
    const urgencyText = hoursUntil <= 1 ? "قريب جداً!" : hoursUntil <= 24 ? "قريب" : "قادم";
    
    return `مرحباً ${patientName} 👋\n\n` +
    `${urgencyEmoji} تذكير بالموعد:\n\n` +
    `📅 التاريخ: ${appointmentDate}\n` +
    `🕐 الوقت: ${appointmentTime}\n` +
    `⏱️ باقي على الموعد: ${timeText} (${urgencyText})\n\n` +
    `💡 نصائح مهمة:\n` +
    `• احضري قبل الموعد بـ 10-15 دقيقة\n` +
    `• احضري جميع التقارير والفحوصات السابقة\n` +
    `• اكتبي أي أسئلة تريدين طرحها على الطبيب\n\n` +
    `نتمنى لكِ موعداً مفيداً ومريحاً 🌸\n\n` +
    `رفيق الأمل 💗`;
  },

  appointmentBookedDoctor: (doctorName: string, patientName: string, appointmentDate: string, appointmentTime: string, type: string) => 
    `دكتور/ة ${doctorName} 👨‍⚕️\n\n` +
    `📋 موعد جديد:\n` +
    `👤 المريضة: ${patientName}\n` +
    `📅 التاريخ: ${appointmentDate}\n` +
    `🕐 الوقت: ${appointmentTime}\n` +
    `🏥 النوع: ${type}\n\n` +
    `رفيق الأمل 💗`,

  // Consultation notifications
  consultationBooked: (patientName: string, consultationDate: string, consultationTime: string) => 
    `مرحباً ${patientName} 👋\n\n` +
    `✅ تم حجز استشارة جديدة:\n` +
    `📅 التاريخ: ${consultationDate}\n` +
    `🕐 الوقت: ${consultationTime}\n\n` +
    `سيتم التواصل معك في الوقت المحدد.\n\n` +
    `رفيق الأمل 💗`,

  consultationBookedDoctor: (doctorName: string, patientName: string, consultationDate: string, consultationTime: string) => 
    `دكتور/ة ${doctorName} 👨‍⚕️\n\n` +
    `📋 استشارة جديدة:\n` +
    `👤 المريضة: ${patientName}\n` +
    `📅 التاريخ: ${consultationDate}\n` +
    `🕐 الوقت: ${consultationTime}\n\n` +
    `رفيق الأمل 💗`,

  // Medication notifications
  medicationAdded: (patientName: string, medicationName: string, dosage: string, times: string[], startDate: string) => {
    const timesText = times.length > 0 ? times.join("، ") : "حسب التعليمات";
    return `مرحباً ${patientName} 👋\n\n` +
    `💊 تم إضافة دواء جديد:\n` +
    `📝 الدواء: ${medicationName}\n` +
    `💉 الجرعة: ${dosage || "حسب التعليمات"}\n` +
    `🕐 الأوقات: ${timesText}\n` +
    `📅 تاريخ البدء: ${startDate}\n\n` +
    `يرجى تناول الدواء حسب الوصفة الطبية.\n` +
    `سيتم تذكيرك في الأوقات المحددة.\n\n` +
    `رفيق الأمل 💗`;
  },

  medicationReminder: (patientName: string, medicationName: string, time: string) => 
    `مرحباً ${patientName} 👋\n\n` +
    `💊 تذكير بتناول الدواء:\n` +
    `📝 الدواء: ${medicationName}\n` +
    `🕐 الوقت: ${time}\n\n` +
    `يرجى تناول الدواء حسب الوصفة الطبية.\n\n` +
    `رفيق الأمل 💗`,

  // Risk assessment notifications
  highRiskAlert: (patientName: string) => 
    `مرحباً ${patientName} 👋\n\n` +
    `⚠️ تنبيه مهم:\n\n` +
    `تم تسجيل تقييم مخاطر مرتفع في ملفك الصحي.\n` +
    `يرجى حجز موعد مع طبيبك في أقرب وقت ممكن للمتابعة.\n\n` +
    `رفيق الأمل 💗`,

  highRiskAlertDoctor: (doctorName: string, patientName: string) => 
    `دكتور/ة ${doctorName} 👨‍⚕️\n\n` +
    `⚠️ تنبيه مهم:\n\n` +
    `المريضة ${patientName} لديها تقييم مخاطر مرتفع.\n` +
    `يرجى مراجعة الملف وإجراء المتابعة اللازمة.\n\n` +
    `رفيق الأمل 💗`,

  // General notifications
  customMessage: (recipientName: string, message: string) => 
    `مرحباً ${recipientName} 👋\n\n` +
    `${message}\n\n` +
    `رفيق الأمل 💗`,
};

// Format date and time in Arabic
export function formatDateTime(date: Date): { date: string; time: string } {
  const arabicDate = new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);

  const time = new Intl.DateTimeFormat("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return {
    date: arabicDate,
    time: time,
  };
}

