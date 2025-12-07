// Medication frequency presets with suggested times
export interface MedicationPreset {
  value: string;
  label: string;
  description: string;
  defaultTimes: string[];
  timesLabel: string;
}

export const medicationPresets: MedicationPreset[] = [
  {
    value: "once_daily",
    label: "مرة واحدة يومياً",
    description: "دواء يؤخذ مرة واحدة في اليوم",
    defaultTimes: ["09:00"],
    timesLabel: "وقت التناول",
  },
  {
    value: "twice_daily_meals",
    label: "مرتين يومياً (مع الوجبات)",
    description: "مرة بعد الفطور، مرة بعد الغداء",
    defaultTimes: ["08:00", "14:00"],
    timesLabel: "بعد الفطور | بعد الغداء",
  },
  {
    value: "twice_daily_morning_evening",
    label: "مرتين يومياً (صباح ومساء)",
    description: "مرة في الصباح، مرة في المساء",
    defaultTimes: ["09:00", "21:00"],
    timesLabel: "صباحاً | مساءً",
  },
  {
    value: "three_times_daily",
    label: "ثلاث مرات يومياً",
    description: "بعد كل وجبة (فطور، غداء، عشاء)",
    defaultTimes: ["08:00", "14:00", "20:00"],
    timesLabel: "بعد الفطور | بعد الغداء | بعد العشاء",
  },
  {
    value: "every_12_hours",
    label: "كل 12 ساعة",
    description: "دواء يؤخذ كل 12 ساعة",
    defaultTimes: ["08:00", "20:00"],
    timesLabel: "الجرعة الأولى | الجرعة الثانية",
  },
  {
    value: "every_8_hours",
    label: "كل 8 ساعات",
    description: "دواء يؤخذ كل 8 ساعات",
    defaultTimes: ["08:00", "16:00", "00:00"],
    timesLabel: "الجرعة الأولى | الثانية | الثالثة",
  },
  {
    value: "every_6_hours",
    label: "كل 6 ساعات",
    description: "دواء يؤخذ كل 6 ساعات",
    defaultTimes: ["06:00", "12:00", "18:00", "00:00"],
    timesLabel: "الجرعة الأولى | الثانية | الثالثة | الرابعة",
  },
  {
    value: "before_meals",
    label: "قبل الوجبات",
    description: "قبل الفطور، الغداء، والعشاء",
    defaultTimes: ["07:30", "13:30", "19:30"],
    timesLabel: "قبل الفطور | قبل الغداء | قبل العشاء",
  },
  {
    value: "after_meals",
    label: "بعد الوجبات",
    description: "بعد الفطور، الغداء، والعشاء",
    defaultTimes: ["09:00", "15:00", "21:00"],
    timesLabel: "بعد الفطور | بعد الغداء | بعد العشاء",
  },
  {
    value: "with_breakfast",
    label: "مع الفطور فقط",
    description: "دواء يؤخذ مرة واحدة مع الفطور",
    defaultTimes: ["08:00"],
    timesLabel: "مع الفطور",
  },
  {
    value: "with_dinner",
    label: "مع العشاء فقط",
    description: "دواء يؤخذ مرة واحدة مع العشاء",
    defaultTimes: ["20:00"],
    timesLabel: "مع العشاء",
  },
  {
    value: "bedtime",
    label: "قبل النوم",
    description: "دواء يؤخذ قبل النوم",
    defaultTimes: ["22:00"],
    timesLabel: "قبل النوم",
  },
  {
    value: "custom",
    label: "مخصص",
    description: "حددي الأوقات بنفسك",
    defaultTimes: [],
    timesLabel: "أوقات مخصصة",
  },
  {
    value: "as_needed",
    label: "حسب الحاجة",
    description: "دواء يؤخذ عند الحاجة فقط",
    defaultTimes: [],
    timesLabel: "عند الحاجة",
  },
];

export function getPresetByValue(value: string): MedicationPreset | undefined {
  return medicationPresets.find(p => p.value === value);
}

