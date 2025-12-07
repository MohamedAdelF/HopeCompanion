// Utility functions for formatting data

/**
 * Formats phone number to standard format (+966570811788)
 * Removes spaces and ensures proper format with + at the beginning
 */
export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "غير متوفر";
  
  // Remove all spaces first
  let cleaned = phone.toString().replace(/\s+/g, "").trim();
  
  // Find and move + to the beginning if it exists elsewhere
  if (cleaned.includes("+")) {
    // Remove + from anywhere it might be
    cleaned = cleaned.replace(/\+/g, "");
    // Add + at the beginning
    cleaned = "+" + cleaned;
  }
  
  // If it doesn't start with +, determine country code and add +
  if (!cleaned.startsWith("+")) {
    // If it starts with 20 (Egypt country code), add +
    if (cleaned.startsWith("20")) {
      cleaned = "+" + cleaned;
    } 
    // If it starts with 966 (Saudi Arabia country code), add +
    else if (cleaned.startsWith("966")) {
      cleaned = "+" + cleaned;
    }
    // Egyptian mobile numbers
    else if (cleaned.length === 11 && cleaned.startsWith("01")) {
      // Egyptian mobile number starting with 01, add +20
      cleaned = "+20" + cleaned.substring(1);
    } else if (cleaned.length === 10 && cleaned.startsWith("1")) {
      // Egyptian mobile number starting with 1, add +20
      cleaned = "+20" + cleaned;
    }
    // Saudi Arabia mobile numbers (start with 05)
    else if (cleaned.length === 9 && cleaned.startsWith("5")) {
      cleaned = "+966" + cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith("05")) {
      cleaned = "+966" + cleaned.substring(1);
    }
    // If number already has country code at end (e.g., 570811788966), move it to beginning
    else if (cleaned.endsWith("966") && cleaned.length > 3) {
      cleaned = "+966" + cleaned.slice(0, -3);
    } else if (cleaned.endsWith("20") && cleaned.length > 2) {
      cleaned = "+20" + cleaned.slice(0, -2);
    }
    // If no pattern matches but it's a valid length, add + at the beginning
    else if (cleaned.length >= 9 && cleaned.length <= 15 && /^\d+$/.test(cleaned)) {
      cleaned = "+" + cleaned;
    }
  }
  
  // Final check: ensure + is at the beginning and followed immediately by digits
  if (cleaned.includes("+") && !cleaned.startsWith("+")) {
    cleaned = cleaned.replace(/\+/g, "");
    cleaned = "+" + cleaned;
  }
  
  // Remove any spaces that might have been added
  cleaned = cleaned.replace(/\s+/g, "");
  
  return cleaned;
}

/**
 * Formats specialization to readable Arabic text
 */
export function formatSpecialization(specialization: string | undefined | null): string {
  if (!specialization) return "غير محدد";
  
  const specializationMap: { [key: string]: string } = {
    "general_medicine": "الطب العام",
    "breast_surgery": "جراحة الثدي",
    "oncology": "طب الأورام",
    "radiology": "الأشعة التشخيصية",
    "pathology": "علم الأمراض (الباثولوجيا)",
    "radiation_oncology": "العلاج الإشعاعي",
    "psycho_oncology": "الطب النفسي للأورام",
    "reconstructive_surgery": "جراحة التجميل والإعادة",
    "clinical_oncology": "الأورام السريرية",
  };
  
  return specializationMap[specialization] || specialization;
}
