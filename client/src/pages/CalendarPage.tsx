import { useEffect, useState, useMemo } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Pill, 
  Stethoscope, 
  Shield, 
  Bell, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Heart,
  BookOpen,
  Filter,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { firestoreDb, collection, onSnapshot, query, where, getDocs, doc, getDoc } from "@/lib/firebase";
// Helper function to format dates in Arabic
const formatDate = (date: Date, format: string = "dd MMMM yyyy") => {
  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const day = date.getDate();
  const month = arabicMonths[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatDateShort = (date: Date) => {
  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const day = date.getDate();
  const month = arabicMonths[date.getMonth()];
  return `${day} ${month}`;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface CalendarEvent {
  id: string;
  type: "appointment" | "medication" | "reassessment" | "assessment_due" | "risk_assessment";
  title: string;
  date: Date;
  time?: string;
  description?: string;
  color: string;
  icon: any;
  metadata?: any;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
      const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set(["appointment", "medication", "reassessment", "assessment_due", "risk_assessment"]));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get patientId
  useEffect(() => {
    if (!user?.uid) return;
    const loadPatient = async () => {
      const snap = await getDocs(query(collection(firestoreDb, "patients"), where("uid", "==", user.uid)));
      const first = snap.docs[0];
      if (first) setPatientId(first.id);
    };
    loadPatient();
  }, [user?.uid]);

  // Fetch appointments
  useEffect(() => {
    if (!patientId) return;
    const q = query(collection(firestoreDb, "appointments"), where("patientId", "==", patientId));
    const unsub = onSnapshot(q, (snap) => {
      const appointments = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      
      // Convert appointments to events
      const appointmentEvents: CalendarEvent[] = [];
      
      appointments.forEach((apt) => {
        if (!apt.at) return;
        
        // Check if this is a risk assessment appointment (auto-created)
        if (apt.type === "risk_assessment") {
          const aptDate = new Date(apt.at);
          console.log("🔍 Found risk_assessment appointment:", {
            id: apt.id,
            date: aptDate.toISOString(),
            note: apt.note,
            isAutoCreated: apt.isAutoCreated,
            isPast: aptDate < new Date(),
            isFuture: aptDate >= new Date()
          });
          
          appointmentEvents.push({
            id: `risk-assessment-${apt.id}`,
            type: "risk_assessment" as const,
            title: aptDate < new Date() ? "موعد تقييم المخاطر السابق" : "موعد إعادة تقييم المخاطر",
            date: aptDate,
            time: aptDate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
            description: apt.note || "موعد إعادة تقييم المخاطر الشهري - يجب إكمال التقييم في هذا التاريخ",
            color: aptDate < new Date() ? "bg-gray-500" : "bg-orange-500",
            icon: Shield,
            metadata: apt,
          });
        } else {
          // Regular appointment
          appointmentEvents.push({
            id: `appointment-${apt.id}`,
            type: "appointment" as const,
            title: `موعد ${getAppointmentTypeLabel(apt.type || "consultation")}`,
            date: new Date(apt.at),
            time: new Date(apt.at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
            description: apt.note || "",
            color: "bg-blue-500",
            icon: Stethoscope,
            metadata: apt,
          });
        }
      });
      
      console.log("📅 Total appointments fetched:", appointments.length);
      console.log("📅 Risk assessment appointments:", appointmentEvents.filter(e => e.type === "risk_assessment").length);

      setEvents((prev) => {
        const filtered = prev.filter((e) => e.type !== "appointment" && e.type !== "risk_assessment");
        return [...filtered, ...appointmentEvents];
      });
    });
    return () => unsub();
  }, [patientId]);

  // Fetch medications
  useEffect(() => {
    if (!patientId) return;
    const q = query(collection(firestoreDb, "medications"), where("patientId", "==", patientId));
    const unsub = onSnapshot(q, (snap) => {
      const medications = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      
      // Create events for medication reminders
      const medicationEvents: CalendarEvent[] = [];
      
      medications.forEach((med) => {
        if (!med.startDate) return;
        
        const startDate = new Date(med.startDate);
        const endDate = med.endDate ? new Date(med.endDate) : null;
        const today = new Date();
        
        // Generate events based on frequency
        if (!endDate || endDate >= today) {
          // Add start date event
          medicationEvents.push({
            id: `medication-start-${med.id}`,
            type: "medication" as const,
            title: `بدء دواء: ${med.name}`,
            date: startDate,
            description: `الجرعة: ${med.dosage || "غير محدد"}\nالتكرار: ${getFrequencyLabel(med.frequency)}`,
            color: "bg-purple-500",
            icon: Pill,
            metadata: med,
          });

          // Add daily reminders for active medications
          if (med.reminder && med.frequency === "daily" && (!endDate || endDate >= today)) {
            const reminderDate = new Date(today);
            reminderDate.setDate(reminderDate.getDate() + 1); // Tomorrow
            if (!endDate || reminderDate <= endDate) {
              medicationEvents.push({
                id: `medication-reminder-${med.id}-${reminderDate.getTime()}`,
                type: "medication" as const,
                title: `تذكير: ${med.name}`,
                date: reminderDate,
                time: "صباحاً",
                description: `تذكر تناول دواء ${med.name} (${med.dosage || "جرعة"})`,
                color: "bg-purple-400",
                icon: Bell,
                metadata: med,
              });
            }
          }
        }
      });

      setEvents((prev) => {
        const filtered = prev.filter((e) => e.type !== "medication");
        return [...filtered, ...medicationEvents];
      });
    });
    return () => unsub();
  }, [patientId]);

  // Fetch reassessment requests
  useEffect(() => {
    if (!patientId) return;
    const q = query(collection(firestoreDb, "reassessmentRequests"), where("patientId", "==", patientId));
    const unsub = onSnapshot(q, (snap) => {
      const requests = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      
      const reassessmentEvents: CalendarEvent[] = requests
        .filter((req) => req.status === "approved" && req.scheduledDate)
        .map((req) => ({
          id: `reassessment-${req.id}`,
          type: "reassessment" as const,
          title: "موعد تقييم المخاطر",
          date: new Date(req.scheduledDate),
          description: "موعد تقييم المخاطر القادم",
          color: "bg-orange-500",
          icon: Shield,
          metadata: req,
        }));

      setEvents((prev) => {
        const filtered = prev.filter((e) => e.type !== "reassessment");
        return [...filtered, ...reassessmentEvents];
      });
    });
    return () => unsub();
  }, [patientId]);

  // Fetch last assessment date to calculate next assessment due
  useEffect(() => {
    if (!patientId) return;
    const loadPatient = async () => {
      try {
        // Get last assessment from assessments collection
        const assessmentsQuery = query(
          collection(firestoreDb, "assessments"),
          where("patientId", "==", patientId)
        );
        const assessmentsSnap = await getDocs(assessmentsQuery);
        
        let lastAssessmentDate: Date | null = null;
        
        if (!assessmentsSnap.empty) {
          // Sort by createdAt descending and get the latest
          const sorted = assessmentsSnap.docs.sort((a, b) => {
            const aDate = new Date((a.data() as any).createdAt || 0).getTime();
            const bDate = new Date((b.data() as any).createdAt || 0).getTime();
            return bDate - aDate;
          });
          
          lastAssessmentDate = new Date((sorted[0].data() as any).createdAt);
          console.log("📊 Last assessment date from assessments collection:", lastAssessmentDate.toISOString());
        }
        
        // Also check patient document for lastAssessmentDate
        const patientDoc = await getDoc(doc(firestoreDb, "patients", patientId));
        const patientData = patientDoc.data();
        
        if (patientData?.lastAssessmentDate) {
          const patientLastAssessment = new Date(patientData.lastAssessmentDate);
          if (!lastAssessmentDate || patientLastAssessment > lastAssessmentDate) {
            lastAssessmentDate = patientLastAssessment;
            console.log("📊 Last assessment date from patient document:", lastAssessmentDate.toISOString());
          }
        }
        
        if (lastAssessmentDate) {
          // Calculate next assessment (30 days for auto-created appointment)
          const nextAssessment30Days = new Date(lastAssessmentDate);
          nextAssessment30Days.setDate(nextAssessment30Days.getDate() + 30);
          
          // Calculate next assessment (6 months for due date)
          const nextAssessment6Months = new Date(lastAssessmentDate);
          nextAssessment6Months.setMonth(nextAssessment6Months.getMonth() + 6);
          
          console.log("📅 Next assessment (30 days):", nextAssessment30Days.toISOString());
          console.log("📅 Next assessment (6 months):", nextAssessment6Months.toISOString());
          console.log("📅 Current date:", new Date().toISOString());
          
          // Add 30-day assessment event if it's in the future (only if no appointment exists)
          if (nextAssessment30Days >= new Date()) {
            const assessment30DaysEvent: CalendarEvent = {
              id: `assessment-30days-${patientId}`,
              type: "risk_assessment" as const,
              title: "موعد إعادة تقييم المخاطر (30 يوم)",
              date: nextAssessment30Days,
              time: nextAssessment30Days.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
              description: "موعد إعادة تقييم المخاطر الشهري - يجب إكمال التقييم في هذا التاريخ",
              color: "bg-orange-500",
              icon: Shield,
              metadata: { 
                patientId,
                calculated: true,
                fromLastAssessment: lastAssessmentDate.toISOString()
              },
            };

            setEvents((prev) => {
              const filtered = prev.filter((e) => e.id !== assessment30DaysEvent.id);
              return [...filtered, assessment30DaysEvent];
            });
          }
          
          // Add 6-month assessment due event if it's in the future
          if (nextAssessment6Months >= new Date()) {
            const assessmentDueEvent: CalendarEvent = {
              id: `assessment-due-${patientId}`,
              type: "assessment_due" as const,
              title: "موعد إعادة التقييم (6 أشهر)",
              date: nextAssessment6Months,
              description: "حان موعد إعادة تقييم المخاطر (كل 6 أشهر)",
              color: "bg-emerald-500",
              icon: TrendingUp,
              metadata: { 
                patientId,
                calculated: true,
                fromLastAssessment: lastAssessmentDate.toISOString()
              },
            };

            setEvents((prev) => {
              const filtered = prev.filter((e) => e.id !== assessmentDueEvent.id);
              return [...filtered, assessmentDueEvent];
            });
          }
        } else {
          console.log("⚠️ No last assessment date found");
        }
      } catch (error) {
        console.error("Error loading patient data:", error);
      }
    };
    loadPatient();
  }, [patientId]);

  const getAppointmentTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      consultation: "استشارة",
      "follow-up": "متابعة",
      "followup": "متابعة",
      "check-up": "فحص دوري",
      treatment: "علاج",
      medication_review: "مراجعة دواء",
      examination: "فحص",
      risk_assessment: "تقييم المخاطر",
      other: "أخرى",
    };
    return typeMap[type] || type;
  };

  const getFrequencyLabel = (frequency: string) => {
    const freqMap: Record<string, string> = {
      daily: "يومياً",
      "twice-daily": "مرتين يومياً",
      "three-times": "ثلاث مرات يومياً",
      weekly: "أسبوعياً",
      "as-needed": "حسب الحاجة",
    };
    return freqMap[frequency] || frequency;
  };

  // Filter events based on selected types
  const filteredEvents = useMemo(() => {
    return events.filter((event) => filterTypes.has(event.type));
  }, [events, filterTypes]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Get upcoming events
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredEvents
      .filter((event) => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  }, [filteredEvents]);

  // Custom day renderer with event indicators
  const modifiers = useMemo(() => {
    const modifiers: Record<string, Date[]> = {};
    filteredEvents.forEach((event) => {
      const date = new Date(event.date);
      const dateKey = formatDateKey(date);
      if (!modifiers[dateKey]) {
        modifiers[dateKey] = [];
      }
      modifiers[dateKey].push(date);
    });
    return modifiers;
  }, [filteredEvents]);

  const toggleFilter = (type: string) => {
    setFilterTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = filteredEvents.filter((e) => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });
    
    const thisWeek = filteredEvents.filter((e) => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return eventDate >= today && eventDate <= weekFromNow;
    });

    return {
      total: filteredEvents.length,
      upcoming: upcoming.length,
      thisWeek: thisWeek.length,
      byType: {
        appointment: filteredEvents.filter((e) => e.type === "appointment").length,
        medication: filteredEvents.filter((e) => e.type === "medication").length,
        reassessment: filteredEvents.filter((e) => e.type === "reassessment").length,
        assessment_due: filteredEvents.filter((e) => e.type === "assessment_due").length,
        risk_assessment: filteredEvents.filter((e) => e.type === "risk_assessment").length,
      },
    };
  }, [filteredEvents]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="shadow-lg">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">تسجيل الدخول مطلوب</h2>
            <p className="text-muted-foreground">يرجى تسجيل الدخول للوصول إلى التقويم</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-lg border-2 bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <CalendarIcon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    التقويم الطبي
                  </CardTitle>
                  <CardDescription className="font-body text-lg mt-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    نظرة شاملة على جميع مواعيدك وأحداثك الطبية
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="shadow-md border-2 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">إجمالي الأحداث</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="shadow-md border-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">الأحداث القادمة</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.upcoming}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="shadow-md border-2 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">هذا الأسبوع</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.thisWeek}</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="shadow-md border-2 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">المواعيد</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.byType.appointment}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="shadow-md border-2 bg-gradient-to-r from-background via-background to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Filter className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">تصفية حسب النوع:</span>
                {[
                  { type: "appointment", label: "المواعيد", icon: Stethoscope, color: "bg-blue-500", count: stats.byType.appointment },
                  { type: "risk_assessment", label: "موعد التقييم", icon: Shield, color: "bg-orange-500", count: stats.byType.risk_assessment },
                  { type: "medication", label: "الأدوية", icon: Pill, color: "bg-purple-500", count: stats.byType.medication },
                  { type: "reassessment", label: "تقييم المخاطر", icon: Shield, color: "bg-orange-400", count: stats.byType.reassessment },
                  { type: "assessment_due", label: "موعد إعادة التقييم", icon: TrendingUp, color: "bg-emerald-500", count: stats.byType.assessment_due },
                ].map((filter) => (
                  <motion.div
                    key={filter.type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={filterTypes.has(filter.type) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFilter(filter.type)}
                      className={`gap-2 h-10 px-4 ${
                        filterTypes.has(filter.type)
                          ? `bg-gradient-to-r from-primary to-primary/90 shadow-md`
                          : "hover:bg-primary/5 border-primary/30"
                      }`}
                    >
                      <filter.icon className="h-4 w-4" />
                      <span>{filter.label}</span>
                      {filter.count > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                          {filter.count}
                        </Badge>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">دليل الألوان:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-muted-foreground">مواعيد</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-muted-foreground">أدوية</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-muted-foreground">موعد التقييم</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <span className="text-xs text-muted-foreground">تقييم</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-muted-foreground">إعادة تقييم</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-4 bg-gradient-to-r from-background/95 to-background/50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">التقويم الشهري</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newMonth = new Date(currentMonth);
                        newMonth.setMonth(newMonth.getMonth() - 1);
                        setCurrentMonth(newMonth);
                      }}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentMonth(new Date());
                        setSelectedDate(new Date());
                      }}
                      className="h-9 px-4"
                    >
                      اليوم
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newMonth = new Date(currentMonth);
                        newMonth.setMonth(newMonth.getMonth() + 1);
                        setCurrentMonth(newMonth);
                      }}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  أيام بها أحداث
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  اليوم
                </span>
              </div>
            </CardHeader>
            <CardContent dir="rtl">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                modifiers={{
                  hasEvents: Object.values(modifiers).flat(),
                }}
                modifiersClassNames={{
                  hasEvents: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
                }}
                className="rounded-lg"
                dir="rtl"
              />
              
              {/* Selected Date Events */}
              {selectedDate && (
                <div className="mt-6 space-y-3 pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      أحداث {formatDate(selectedDate)}
                    </h3>
                    {selectedDateEvents.length > 0 && (
                      <Badge variant="secondary" className="gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {selectedDateEvents.length} حدث
                      </Badge>
                    )}
                  </div>
                  {selectedDateEvents.length > 0 ? (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {selectedDateEvents.map((event, index) => {
                          const Icon = event.icon;
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -10, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: 10, scale: 0.95 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ x: 4, scale: 1.02 }}
                              className="flex items-center gap-3 p-4 rounded-xl border-2 hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/20 cursor-pointer transition-all shadow-sm hover:shadow-md"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div className={`p-3 rounded-xl ${event.color} bg-opacity-20 flex-shrink-0`}>
                                <Icon className={`h-6 w-6 ${event.color.replace("bg-", "text-")}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base mb-1">{event.title}</p>
                                {event.time && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {event.time}
                                  </p>
                                )}
                                {event.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                                )}
                              </div>
                              <Badge className={`${event.color} text-white font-medium px-3 py-1 flex-shrink-0`}>
                                {event.type === "appointment" ? "موعد" :
                                 event.type === "risk_assessment" ? "موعد تقييم" :
                                 event.type === "medication" ? "دواء" :
                                 event.type === "reassessment" ? "تقييم" :
                                 "إعادة تقييم"}
                              </Badge>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-muted/30 rounded-xl border-2 border-dashed">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">لا توجد أحداث في هذا اليوم</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-lg border-2 sticky top-6 bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader className="pb-4 bg-gradient-to-r from-background/95 to-background/50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <span>الأحداث القادمة</span>
                </CardTitle>
                {upcomingEvents.length > 0 && (
                  <Badge variant="secondary" className="gap-1.5">
                    {upcomingEvents.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">لا توجد أحداث قادمة</p>
                </div>
              ) : (
                <AnimatePresence>
                  {upcomingEvents.map((event, index) => {
                    const Icon = event.icon;
                    const eventDate = new Date(event.date);
                    const isToday = formatDateKey(eventDate) === formatDateKey(new Date());
                    const isTomorrow = formatDateKey(eventDate) === formatDateKey(new Date(Date.now() + 86400000));
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, x: -4 }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${
                          isToday
                            ? "border-primary/60 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-md ring-2 ring-primary/20"
                            : "border-border/60 hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/20"
                        }`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-lg ${event.color} bg-opacity-20 flex-shrink-0`}>
                            <Icon className={`h-5 w-5 ${event.color.replace("bg-", "text-")}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm truncate">{event.title}</p>
                              {(isToday || isTomorrow) && (
                                <Badge className={`${isToday ? "bg-primary text-white" : "bg-amber-500 text-white"} text-xs px-2 py-0.5`}>
                                  {isToday ? "اليوم" : "غداً"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                              <CalendarIcon className="h-3 w-3" />
                              {formatDateShort(eventDate)}
                              {event.time && (
                                <>
                                  <span className="mx-1">•</span>
                                  <Clock className="h-3 w-3" />
                                  {event.time}
                                </>
                              )}
                            </p>
                            {event.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-xl ${selectedEvent.color} bg-opacity-20 flex-shrink-0`}>
                    <selectedEvent.icon className={`h-8 w-8 ${selectedEvent.color.replace("bg-", "text-")}`} />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-bold mb-2">{selectedEvent.title}</DialogTitle>
                    <DialogDescription className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{formatDate(new Date(selectedEvent.date))}</span>
                      </div>
                      {selectedEvent.time && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{selectedEvent.time}</span>
                        </div>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              {selectedEvent.description && (
                <div className="py-4 px-1">
                  <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{selectedEvent.description}</p>
                  </div>
                </div>
              )}
              {selectedEvent.metadata && (
                <div className="py-2 px-1 space-y-2">
                              {(selectedEvent.type === "appointment" || selectedEvent.type === "risk_assessment") && selectedEvent.metadata.type && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className="gap-1.5">
                                    {selectedEvent.type === "risk_assessment" ? (
                                      <>
                                        <Shield className="h-3.5 w-3.5" />
                                        موعد تقييم مخاطر تلقائي
                                      </>
                                    ) : (
                                      <>
                                        <Stethoscope className="h-3.5 w-3.5" />
                                        {getAppointmentTypeLabel(selectedEvent.metadata.type)}
                                      </>
                                    )}
                                  </Badge>
                                  {selectedEvent.metadata.reminder && (
                                    <Badge variant="outline" className="gap-1.5">
                                      <Bell className="h-3.5 w-3.5" />
                                      تذكير مفعّل
                                    </Badge>
                                  )}
                                  {selectedEvent.metadata.isAutoCreated && (
                                    <Badge variant="outline" className="gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5" />
                                      موعد تلقائي
                                    </Badge>
                                  )}
                                </div>
                              )}
                  {selectedEvent.type === "medication" && (
                    <div className="flex flex-wrap gap-2 text-sm">
                      {selectedEvent.metadata.dosage && (
                        <Badge variant="outline" className="gap-1.5">
                          <Pill className="h-3.5 w-3.5" />
                          {selectedEvent.metadata.dosage}
                        </Badge>
                      )}
                      {selectedEvent.metadata.frequency && (
                        <Badge variant="outline" className="gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {getFrequencyLabel(selectedEvent.metadata.frequency)}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedEvent(null)} className="w-full">
                  إغلاق
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

