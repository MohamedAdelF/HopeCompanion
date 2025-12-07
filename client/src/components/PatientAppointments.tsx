import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus, Bell, Pill, Trash2, Edit, CheckCircle2, AlertCircle, X, CalendarCheck, Sparkles, Shield, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { firestoreDb, collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc, getDocs } from "@/lib/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { medicationPresets, getPresetByValue } from "@/lib/medicationPresets";

interface Appointment {
  id: string;
  patientId: string;
  at: string;
  note?: string;
  type?: string;
  reminder?: boolean;
  status?: "upcoming" | "completed" | "cancelled";
  doctorUid?: string;
  createdAt?: string;
  isAutoCreated?: boolean; // موعد تلقائي (مثل موعد إعادة التقييم)
  createdBy?: "doctor" | "patient"; // علامة لمنشئ الموعد
}

interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  times: string[];
  reminder: boolean;
  createdAt: string;
  createdBy?: "doctor" | "patient"; // علامة لمنشئ الدواء
}

export function PatientAppointments() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "appointment" | "medication"; id: string } | null>(null);

  // Form states for appointments
  const [apptForm, setApptForm] = useState({
    at: "",
    note: "",
    type: "consultation",
    reminder: true,
  });

  // Form states for medications
  const [medForm, setMedForm] = useState({
    name: "",
    dosage: "",
    frequency: "once_daily",
    startDate: "",
    endDate: "",
    times: [] as string[],
    reminder: true,
  });

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
    const q = query(
      collection(firestoreDb, "appointments"),
      where("patientId", "==", patientId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const apps: Appointment[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      // Sort by 'at' field ascending (earliest first)
      apps.sort((a, b) => {
        const dateA = new Date(a.at || 0).getTime();
        const dateB = new Date(b.at || 0).getTime();
        return dateA - dateB;
      });
      setAppointments(apps);
    });
    return () => unsub();
  }, [patientId]);

  // Fetch medications
  useEffect(() => {
    if (!patientId) return;
    const q = query(
      collection(firestoreDb, "medications"),
      where("patientId", "==", patientId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const meds: Medication[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      // Sort by 'createdAt' field descending (newest first)
      meds.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setMedications(meds);
    });
    return () => unsub();
  }, [patientId]);

  const handleSaveAppointment = async () => {
    if (!patientId || !apptForm.at) {
      alert("يرجى التأكد من إدخال جميع البيانات المطلوبة.");
      return;
    }
    try {
      const appointmentData: any = {
        patientId,
        at: new Date(apptForm.at).toISOString(),
        note: apptForm.note,
        type: apptForm.type,
        reminder: apptForm.reminder,
        status: "upcoming",
        createdAt: new Date().toISOString(),
        createdBy: "patient", // المريض أنشأ هذا الموعد
      };
      if (user?.uid) appointmentData.doctorUid = user.uid;

      if (editingAppointment) {
        // عند التعديل، نحتفظ بقيمة createdBy الأصلية
        const { createdBy, ...updateData } = appointmentData;
        await updateDoc(doc(firestoreDb, "appointments", editingAppointment.id), updateData);
      } else {
        await addDoc(collection(firestoreDb, "appointments"), appointmentData);
        
        // Send WhatsApp notification
        try {
          const { notifyAppointmentBooked } = await import("@/lib/notifications");
          await notifyAppointmentBooked(
            patientId,
            user?.uid || null,
            new Date(apptForm.at),
            apptForm.type,
            "patient"
          );
        } catch (error) {
          console.error("Error sending notification:", error);
          // Don't show error to user - notification is optional
        }
      }
      setAppointmentDialogOpen(false);
      setEditingAppointment(null);
      setApptForm({ at: "", note: "", type: "consultation", reminder: true });
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      alert(`حدث خطأ أثناء حفظ الموعد: ${error?.message || "خطأ غير معروف"}. يرجى المحاولة مرة أخرى.`);
    }
  };

  const handleSaveMedication = async () => {
    if (!patientId || !medForm.name || !medForm.startDate) {
      alert("يرجى التأكد من إدخال جميع البيانات المطلوبة.");
      return;
    }
    if (medForm.frequency !== "as_needed" && (!medForm.times || medForm.times.length === 0)) {
      alert("يرجى تحديد أوقات التناول للدواء.");
      return;
    }
    try {
      const medicationData: any = {
        patientId,
        name: medForm.name,
        dosage: medForm.dosage,
        frequency: medForm.frequency,
        startDate: medForm.startDate,
        endDate: medForm.endDate || null,
        times: medForm.times || [],
        reminder: medForm.reminder,
        createdAt: new Date().toISOString(),
        createdBy: "patient", // المريض أنشأ هذا الدواء
      };

      if (editingMedication) {
        // عند التعديل، نحتفظ بقيمة createdBy الأصلية
        const { createdBy, ...updateData } = medicationData;
        await updateDoc(doc(firestoreDb, "medications", editingMedication.id), updateData);
      } else {
        await addDoc(collection(firestoreDb, "medications"), medicationData);
      }
      setMedicationDialogOpen(false);
      setEditingMedication(null);
      setMedForm({ name: "", dosage: "", frequency: "daily", startDate: "", endDate: "", times: [], reminder: true });
    } catch (error: any) {
      console.error("Error saving medication:", error);
      alert(`حدث خطأ أثناء حفظ الدواء: ${error?.message || "خطأ غير معروف"}. يرجى المحاولة مرة أخرى.`);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "appointment") {
      await deleteDoc(doc(firestoreDb, "appointments", itemToDelete.id));
    } else {
      await deleteDoc(doc(firestoreDb, "medications", itemToDelete.id));
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isPast: date < new Date(),
      isToday: date.toDateString() === new Date().toDateString(),
    };
  };

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

  const upcomingAppointments = appointments.filter((a) => {
    const date = new Date(a.at);
    return date >= new Date() && (a.status === "upcoming" || !a.status);
  });
  const pastAppointments = appointments.filter((a) => {
    const date = new Date(a.at);
    return date < new Date() || a.status === "completed";
  });

  const activeMedications = medications.filter((m) => {
    if (!m.endDate) return true;
    return new Date(m.endDate) >= new Date();
  });

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardContent className="py-12 text-center">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>تسجيل الدخول مطلوب</AlertTitle>
              <AlertDescription>
                يرجى تسجيل الدخول للوصول إلى صفحة المواعيد.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 pb-6 sm:pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-lg border-2 bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <CalendarCheck className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    تنظيم المواعيد
                  </CardTitle>
                  <CardDescription className="font-body text-lg mt-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    إدارة مواعيدك الطبية وتذكيرات الأدوية في مكان واحد
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-md border-2 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">المواعيد القادمة</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{upcomingAppointments.length}</p>
                </div>
                <Calendar className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-md border-2 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الأدوية النشطة</p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">{activeMedications.length}</p>
                </div>
                <Pill className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-md border-2 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">المواعيد المنتهية</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">{pastAppointments.length}</p>
                </div>
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Appointments Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-bold">المواعيد الطبية</CardTitle>
              </div>
              <Dialog
                open={appointmentDialogOpen}
                onOpenChange={(open) => {
                  setAppointmentDialogOpen(open);
                  if (!open) {
                    setEditingAppointment(null);
                    setApptForm({ at: "", note: "", type: "consultation", reminder: true });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="h-11 bg-gradient-to-r from-primary to-primary/90 shadow-lg">
                      <Plus className="ml-2 h-5 w-5" />
                      إضافة موعد
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      {editingAppointment ? "تعديل الموعد" : "إضافة موعد جديد"}
                    </DialogTitle>
                    <DialogDescription>
                      أضيفي تفاصيل الموعد الطبي القادم
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="appt-date">التاريخ والوقت</Label>
                      <Input
                        id="appt-date"
                        type="datetime-local"
                        value={apptForm.at}
                        onChange={(e) => setApptForm({ ...apptForm, at: e.target.value })}
                        className="mt-2 h-11"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="appt-type">نوع الموعد</Label>
                      <Select
                        value={apptForm.type}
                        onValueChange={(value) => setApptForm({ ...apptForm, type: value })}
                      >
                        <SelectTrigger id="appt-type" className="mt-2 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consultation">استشارة</SelectItem>
                          <SelectItem value="follow-up">متابعة</SelectItem>
                          <SelectItem value="check-up">فحص دوري</SelectItem>
                          <SelectItem value="treatment">علاج</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="appt-note">ملاحظات (اختياري)</Label>
                      <Textarea
                        id="appt-note"
                        value={apptForm.note}
                        onChange={(e) => setApptForm({ ...apptForm, note: e.target.value })}
                        className="mt-2 min-h-24"
                        placeholder="أضيفي أي ملاحظات أو أسئلة تريدين تذكرها..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="appt-reminder"
                        checked={apptForm.reminder}
                        onChange={(e) => setApptForm({ ...apptForm, reminder: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <Label htmlFor="appt-reminder" className="flex items-center gap-2 cursor-pointer">
                        <Bell className="h-4 w-4 text-primary" />
                        تفعيل تذكير بالموعد
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAppointmentDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleSaveAppointment} className="bg-gradient-to-r from-primary to-primary/90">
                      {editingAppointment ? "حفظ التعديلات" : "إضافة الموعد"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  المواعيد القادمة
                </h3>
                <div className="space-y-3">
                  <AnimatePresence>
                    {upcomingAppointments.map((appt, index) => {
                      const { date, time, isToday } = formatDateTime(appt.at);
                      return (
                        <motion.div
                          key={appt.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ y: -2 }}
                        >
                          <Card className={`shadow-md hover:shadow-xl transition-all border-2 ${
                            isToday ? "border-primary/50 bg-primary/5" : 
                            appt.isAutoCreated ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10" :
                            "border-border hover:border-primary/30"
                          }`}>
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                {/* إخفاء أزرار التعديل/الحذف إذا كان الموعد من الطبيب */}
                                {appt.createdBy !== "doctor" && (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingAppointment(appt);
                                        const dateTime = new Date(appt.at).toISOString().slice(0, 16);
                                        setApptForm({
                                          at: dateTime,
                                          note: appt.note || "",
                                          type: appt.type || "consultation",
                                          reminder: appt.reminder !== false,
                                        });
                                        setAppointmentDialogOpen(true);
                                      }}
                                      className="h-9 w-9 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setItemToDelete({ type: "appointment", id: appt.id });
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                                <div className="flex-1 space-y-2 text-right">
                                  <div className="flex items-center gap-2 flex-wrap justify-center">
                                    {/* تاريخ ووقت */}
                                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-blue-50/50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span className="font-medium">{date}</span>
                                    </Badge>
                                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-300">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="font-medium">{time}</span>
                                    </Badge>
                                    {/* اليوم */}
                                    {isToday && (
                                      <Badge className="gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-primary/90 text-white border-0 shadow-sm font-semibold">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        اليوم
                                      </Badge>
                                    )}
                                    {/* نوع الموعد */}
                                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-emerald-50/50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 font-medium">
                                      <CalendarCheck className="h-3.5 w-3.5" />
                                      {getAppointmentTypeLabel(appt.type || "other")}
                                    </Badge>
                                    {/* من الطبيب */}
                                    {appt.createdBy === "doctor" && (
                                      <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-primary/50 text-primary bg-primary/10 dark:bg-primary/20 font-medium">
                                        <Stethoscope className="h-3.5 w-3.5" />
                                        من الطبيب
                                      </Badge>
                                    )}
                                    {/* موعد تلقائي */}
                                    {appt.isAutoCreated && (
                                      <Badge className="gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-sm font-medium">
                                        <Shield className="h-3.5 w-3.5" />
                                        تلقائي
                                      </Badge>
                                    )}
                                    {/* تذكير */}
                                    {appt.reminder && (
                                      <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-purple-200 text-purple-700 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-300 font-medium">
                                        <Bell className="h-3.5 w-3.5" />
                                        تذكير
                                      </Badge>
                                    )}
                                  </div>
                                  {appt.note && (
                                    <p className="text-sm text-muted-foreground mt-3 text-right">{appt.note}</p>
                                  )}
                                  {appt.isAutoCreated && appt.type === "risk_assessment" && (
                                    <Link href="/risk-assessment">
                                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mt-3 gap-2 border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary"
                                        >
                                          <Shield className="h-4 w-4 text-primary" />
                                          إكمال التقييم الآن
                                        </Button>
                                      </motion.div>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                  المواعيد المنتهية
                </h3>
                <div className="space-y-3">
                  {pastAppointments.slice(0, 5).map((appt, index) => {
                    const { date, time } = formatDateTime(appt.at);
                    return (
                      <motion.div
                        key={appt.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="shadow-sm border opacity-75">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              {/* إخفاء زر الحذف إذا كان الموعد من الطبيب */}
                              {appt.createdBy !== "doctor" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setItemToDelete({ type: "appointment", id: appt.id });
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                              <div className="flex items-center gap-2 flex-wrap justify-center text-right">
                                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-blue-50/50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300 opacity-75">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span className="font-medium">{date}</span>
                                </Badge>
                                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-300 opacity-75">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="font-medium">{time}</span>
                                </Badge>
                                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-emerald-50/50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 opacity-75 font-medium">
                                  <CalendarCheck className="h-3.5 w-3.5" />
                                  {getAppointmentTypeLabel(appt.type || "other")}
                                </Badge>
                                {appt.createdBy === "doctor" && (
                                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-primary/50 text-primary bg-primary/10 dark:bg-primary/20 opacity-75 font-medium">
                                    <Stethoscope className="h-3.5 w-3.5" />
                                    من الطبيب
                                  </Badge>
                                )}
                                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-green-700 border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300 font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  منتهي
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {appointments.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">لا توجد مواعيد بعد</p>
                <p className="text-sm text-muted-foreground mt-2">أضيفي أول موعد للبدء</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Medications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Pill className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-bold">الأدوية والتذكيرات</CardTitle>
              </div>
              <Dialog
                open={medicationDialogOpen}
                onOpenChange={(open) => {
                  setMedicationDialogOpen(open);
                  if (!open) {
                    setEditingMedication(null);
                    setMedForm({ name: "", dosage: "", frequency: "daily", startDate: "", endDate: "", times: [], reminder: true });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="h-11 bg-gradient-to-r from-purple-600 to-purple-500 shadow-lg text-white">
                      <Plus className="ml-2 h-5 w-5" />
                      إضافة دواء
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      {editingMedication ? "تعديل الدواء" : "إضافة دواء جديد"}
                    </DialogTitle>
                    <DialogDescription>
                      أضيفي معلومات الدواء لتفعيل التذكيرات التلقائية
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="med-name">اسم الدواء</Label>
                      <Input
                        id="med-name"
                        value={medForm.name}
                        onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                        className="mt-2 h-11"
                        placeholder="مثال: باراسيتامول"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="med-dosage">الجرعة</Label>
                      <Input
                        id="med-dosage"
                        value={medForm.dosage}
                        onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                        className="mt-2 h-11"
                        placeholder="مثال: 500 مجم"
                      />
                    </div>
                    <div>
                      <Label htmlFor="med-frequency">التكرار</Label>
                      <Select
                        value={medForm.frequency}
                        onValueChange={(value) => {
                          const preset = getPresetByValue(value);
                          setMedForm({ 
                            ...medForm, 
                            frequency: value, 
                            times: preset ? [...preset.defaultTimes] : []
                          });
                        }}
                      >
                        <SelectTrigger id="med-frequency" className="mt-2 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {medicationPresets.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              <div>
                                <div className="font-medium">{preset.label}</div>
                                <div className="text-xs text-muted-foreground">{preset.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {medForm.frequency && medForm.frequency !== "as_needed" && medForm.times.length > 0 && (
                      <div>
                        <Label>أوقات التناول *</Label>
                        <div className="mt-2 space-y-2">
                          {medForm.times.map((time, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={time}
                                onChange={(e) => {
                                  const newTimes = [...medForm.times];
                                  newTimes[index] = e.target.value;
                                  setMedForm({ ...medForm, times: newTimes });
                                }}
                                className="h-11 flex-1"
                                required
                              />
                              {medForm.times.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newTimes = medForm.times.filter((_, i) => i !== index);
                                    setMedForm({ ...medForm, times: newTimes });
                                  }}
                                  className="h-11 w-11 text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMedForm({ ...medForm, times: [...medForm.times, "09:00"] });
                            }}
                            className="w-full gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            إضافة وقت آخر
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="med-start">تاريخ البدء</Label>
                        <Input
                          id="med-start"
                          type="date"
                          value={medForm.startDate}
                          onChange={(e) => setMedForm({ ...medForm, startDate: e.target.value })}
                          className="mt-2 h-11"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="med-end">تاريخ الانتهاء (اختياري)</Label>
                        <Input
                          id="med-end"
                          type="date"
                          value={medForm.endDate}
                          onChange={(e) => setMedForm({ ...medForm, endDate: e.target.value })}
                          className="mt-2 h-11"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="med-reminder"
                        checked={medForm.reminder}
                        onChange={(e) => setMedForm({ ...medForm, reminder: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <Label htmlFor="med-reminder" className="flex items-center gap-2 cursor-pointer">
                        <Bell className="h-4 w-4 text-primary" />
                        تفعيل التذكيرات التلقائية
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setMedicationDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleSaveMedication} className="bg-gradient-to-r from-purple-600 to-purple-500 text-white">
                      {editingMedication ? "حفظ التعديلات" : "إضافة الدواء"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeMedications.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {activeMedications.map((med, index) => (
                    <motion.div
                      key={med.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -2 }}
                    >
                      <Card className="shadow-md hover:shadow-lg transition-all border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20 dark:to-background">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            {/* إخفاء أزرار التعديل/الحذف إذا كان الدواء من الطبيب */}
                            {med.createdBy !== "doctor" && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingMedication(med);
                                    setMedForm({
                                      name: med.name,
                                      dosage: med.dosage,
                                      frequency: med.frequency,
                                      startDate: med.startDate,
                                      endDate: med.endDate || "",
                                      times: med.times || [],
                                      reminder: med.reminder !== false,
                                    });
                                    setMedicationDialogOpen(true);
                                  }}
                                  className="h-9 w-9 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setItemToDelete({ type: "medication", id: med.id });
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <div className="flex-1 space-y-2 text-right">
                              <div className="flex items-center gap-3 flex-wrap justify-end">
                                <h4 className="font-bold text-lg">{med.name}</h4>
                                {med.dosage && (
                                  <Badge variant="outline">{med.dosage}</Badge>
                                )}
                                <Badge variant="outline" className="gap-1">
                                  <Pill className="h-3 w-3" />
                                  {(() => {
                                    const preset = getPresetByValue(med.frequency);
                                    return preset ? preset.label : med.frequency;
                                  })()}
                                </Badge>
                                {med.createdBy === "doctor" && (
                                  <Badge variant="outline" className="gap-1 border-primary text-primary bg-primary/10">
                                    <Stethoscope className="h-3 w-3" />
                                    من الطبيب
                                  </Badge>
                                )}
                                {med.reminder && (
                                  <Badge variant="outline" className="gap-1 border-purple-300 text-purple-700 dark:text-purple-400">
                                    <Bell className="h-3 w-3" />
                                    تذكير
                                  </Badge>
                                )}
                              </div>
                              {med.times && med.times.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap justify-end mt-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium text-muted-foreground">أوقات التناول:</span>
                                  {med.times.map((time, idx) => (
                                    <Badge key={idx} variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                      <Clock className="h-3 w-3" />
                                      {new Date(`2000-01-01T${time}`).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>من {new Date(med.startDate).toLocaleDateString("en-US")}</p>
                                {med.endDate && (
                                  <p>إلى {new Date(med.endDate).toLocaleDateString("en-US")}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12">
                <Pill className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">لا توجد أدوية مسجلة</p>
                <p className="text-sm text-muted-foreground mt-2">أضيفي دواء لتفعيل التذكيرات التلقائية</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنتِ متأكدة من حذف {itemToDelete?.type === "appointment" ? "هذا الموعد" : "هذا الدواء"}؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

