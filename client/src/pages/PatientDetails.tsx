import { useParams, Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Calendar, Bell, Printer, Pencil, BellRing, MessageSquareText, Check, X, LineChart, User, Phone, Mail, MapPin, Stethoscope, AlertCircle, Sparkles, Clock, FileText, TrendingUp, Heart, Send, NotebookPen, Pill, Plus, FileImage, Image, Download, Eye, Trash2 } from "lucide-react";
import { medicationPresets, getPresetByValue } from "@/lib/medicationPresets";
import { collection, onSnapshot, query, where, firestoreDb, updateDoc, doc, addDoc, getDoc, deleteDoc } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/AuthProvider";
import { formatPhoneNumber } from "@/lib/formatUtils";

export function PatientDetails() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [patient, setPatient] = useState<any | null>(null);
  const [diary, setDiary] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", age: "", status: "", nextAppointment: "", phone: "", email: "", address: "", assignedDoctor: "", priority: "متوسط" });
  const [msgOpen, setMsgOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "appointment" | "medication"; id: string; name: string } | null>(null);
  const [messageText, setMessageText] = useState("");
  const [alertText, setAlertText] = useState("");
  const [apptForm, setApptForm] = useState({ at: "", note: "", type: "consultation", reminder: true });
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "once_daily", startDate: "", endDate: "", times: [] as string[], reminder: true });
  const { user } = useAuth();

  // Fetch patient directly by ID instead of fetching all patients
  const { data: patientData, isLoading: isLoadingPatient } = useQuery<any>({
    queryKey: ["patient:details", id, user?.uid],
    queryFn: async () => {
      if (!id || !user?.uid) return null;
      const fs = await import("@/lib/firebase");
      try {
        // Try to get patient directly by ID
        const patientDoc = await fs.getDoc(fs.doc(fs.firestoreDb, "patients", id));
        if (patientDoc.exists()) {
          const data = patientDoc.data();
          // Verify that this patient is assigned to the current doctor (or allow if admin)
          // Note: Firestore rules will handle the permission check
          return { id: patientDoc.id, ...(data as any) };
        }
        return null;
      } catch (error: any) {
        console.error("Error fetching patient:", error);
        if (error?.code === 'permission-denied') {
          console.error("Permission denied - doctor may not have access to this patient");
          return null;
        }
        throw error;
      }
    },
    enabled: !!id && !!user?.uid,
  });

  useEffect(() => {
    if (patientData) {
      setPatient(patientData);
    } else if (!isLoadingPatient && !patientData) {
      setPatient(null);
    }
  }, [patientData, isLoadingPatient]);

  useEffect(() => {
    if (!id) return;
    
    const unsubscribeFunctions: (() => void)[] = [];

    // Helper function to create listener without orderBy (sort client-side)
    const createListener = (
      collectionName: string,
      orderField: string,
      setter: (data: any[]) => void,
      orderDirection: "asc" | "desc" = "desc"
    ) => {
      const q = query(collection(firestoreDb, collectionName), where("patientId", "==", id));
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort client-side
        const sorted = docs.sort((a, b) => {
          const aVal = a[orderField] ? new Date(a[orderField]).getTime() : 0;
          const bVal = b[orderField] ? new Date(b[orderField]).getTime() : 0;
          return orderDirection === "desc" ? bVal - aVal : aVal - bVal;
        });
        setter(sorted);
      }, (error) => {
        console.error(`${collectionName} query error:`, error);
      });
      unsubscribeFunctions.push(unsub);
      return unsub;
    };

    // Set up all listeners (client-side sorting)
    createListener("diary", "date", setDiary, "desc");
    createListener("assessments", "createdAt", setAssessments, "desc");
    createListener("reassessmentRequests", "createdAt", setRequests, "desc");
    createListener("appointments", "at", setAppointments, "asc");
    createListener("medications", "createdAt", setMedications, "desc");

    // Alerts (no ordering needed)
    const unsubA = onSnapshot(query(collection(firestoreDb, "alerts"), where("patientId", "==", id)), (snap) => {
      setAlerts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    unsubscribeFunctions.push(unsubA);

    // Patient Files (no ordering needed, sort client-side)
    const unsubF = onSnapshot(query(collection(firestoreDb, "patientFiles"), where("patientId", "==", id)), (snap) => {
      const files = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      // Sort by createdAt descending
      files.sort((a: any, b: any) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate;
      });
      setPatientFiles(files);
    });
    unsubscribeFunctions.push(unsubF);

    return () => {
      unsubscribeFunctions.forEach(fn => fn());
    };
  }, [id]);

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name ?? "",
        age: String(patient.age ?? ""),
        status: patient.status ?? "",
        nextAppointment: patient.nextAppointment ?? "",
        phone: patient.phone ?? "",
        email: patient.email ?? "",
        address: patient.address ?? "",
        assignedDoctor: patient.assignedDoctor ?? "",
        priority: patient.priority ?? "متوسط",
      });
    }
  }, [patient]);

  const savePatient = async () => {
    if (!patient) return;
    await updateDoc(doc(firestoreDb, "patients", patient.id), {
      name: form.name,
      age: parseInt(form.age || "0", 10) || 0,
      status: form.status,
      nextAppointment: form.nextAppointment,
      phone: form.phone,
      email: form.email,
      address: form.address,
      assignedDoctor: form.assignedDoctor,
      priority: form.priority,
    });
    setEditOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingPatient) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
              <p className="text-muted-foreground">جارٍ تحميل بيانات المريضة...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient && !isLoadingPatient) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl">مريضة غير موجودة أو غير مسموح الوصول</CardTitle>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg text-muted-foreground mb-2">لم يتم العثور على المريضة المطلوبة</p>
            <p className="text-sm text-muted-foreground mb-4">
              قد تكون المريضة غير موجودة أو أنك غير مسموح لك بالوصول إلى ملفها. تأكد من أن المريضة معينة لك كطبيب متابع.
            </p>
            <Button asChild variant="outline">
              <Link href="/doctor">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة إلى لوحة التحكم
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priorityColors: Record<string, string> = {
    "منخفض": "bg-emerald-100 text-emerald-800 border-emerald-300",
    "متوسط": "bg-amber-100 text-amber-800 border-amber-300",
    "مرتفع": "bg-red-100 text-red-800 border-red-300",
  };

  const riskColors: Record<string, string> = {
    "منخفض": "bg-blue-100 text-blue-800 border-blue-300",
    "متوسط": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "مرتفع": "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-12" dir="rtl">
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
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" asChild className="gap-2">
                    <Link href="/doctor">
                      <ArrowRight className="h-4 w-4" />
                      رجوع
                    </Link>
                  </Button>
                </motion.div>
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 text-right">
                  <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    ملف المريضة
                  </CardTitle>
                  <CardDescription className="font-body text-lg mt-2 flex items-center gap-2 justify-end">
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                    {patient.name}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {patient.riskLevel && (
                  <Badge className={`${riskColors[patient.riskLevel] || ""} text-base px-4 py-2 border-2 font-semibold`}>
                    مستوى المخاطر: {patient.riskLevel}
                  </Badge>
                )}
                {patient.priority && (
                  <Badge className={`${priorityColors[patient.priority] || ""} text-base px-4 py-2 border-2 font-semibold`}>
                    الأولوية: {patient.priority}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Patient Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-bold">المعلومات الشخصية</CardTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="gap-2">
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">تعديل بيانات المريضة</DialogTitle>
                      <DialogDescription>قومي بتحديث معلومات المريضة</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div>
                        <Label htmlFor="edit-name">الاسم</Label>
                        <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-11" />
                      </div>
                      <div>
                        <Label htmlFor="edit-age">العمر</Label>
                        <Input id="edit-age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="mt-2 h-11" />
                      </div>
                      <div>
                        <Label htmlFor="edit-status">الحالة</Label>
                        <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                          <SelectTrigger id="edit-status" className="mt-2 h-11">
                            <SelectValue placeholder="اختر الحالة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="متابعة">متابعة</SelectItem>
                            <SelectItem value="علاج">علاج</SelectItem>
                            <SelectItem value="استشارة">استشارة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-appointment">الموعد القادم</Label>
                        <Input id="edit-appointment" type="date" value={form.nextAppointment} onChange={(e) => setForm({ ...form, nextAppointment: e.target.value })} className="mt-2 h-11" />
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">رقم الهاتف</Label>
                        <Input id="edit-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 h-11" />
                      </div>
                      <div>
                        <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                        <Input id="edit-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 h-11" />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="edit-address">العنوان</Label>
                        <Input id="edit-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-2 h-11" />
                      </div>
                      <div>
                        <Label htmlFor="edit-priority">الأولوية</Label>
                        <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                          <SelectTrigger id="edit-priority" className="mt-2 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="منخفض">منخفض</SelectItem>
                            <SelectItem value="متوسط">متوسط</SelectItem>
                            <SelectItem value="مرتفع">مرتفع</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                      <Button onClick={savePatient} className="bg-gradient-to-r from-primary to-primary/90">حفظ</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={handlePrint} variant="outline" className="no-print gap-2">
                    <Printer className="h-4 w-4" />
                    طباعة
                  </Button>
                </motion.div>
                <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="gap-2">
                        <MessageSquareText className="h-4 w-4" />
                        رسالة
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">إرسال رسالة للمريضة</DialogTitle>
                      <DialogDescription>أرسلي رسالة للمريضة {patient.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="message-text">نص الرسالة</Label>
                        <Textarea
                          id="message-text"
                          placeholder="اكتبي رسالتك هنا..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="mt-2 min-h-32"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setMsgOpen(false)}>إلغاء</Button>
                      <Button
                        onClick={async () => {
                          if (!patient || !messageText.trim()) return;
                          await addDoc(collection(firestoreDb, "messages"), {
                            patientId: patient.id,
                            text: messageText,
                            status: "unread",
                            createdAt: new Date().toISOString(),
                            from: "doctor",
                          });
                          setMsgOpen(false);
                          setMessageText("");
                        }}
                        className="bg-gradient-to-r from-primary to-primary/90 gap-2"
                      >
                        <Send className="h-4 w-4" />
                        إرسال
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="gap-2">
                        <BellRing className="h-4 w-4" />
                        تنبيه
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">إنشاء تنبيه للمريضة</DialogTitle>
                      <DialogDescription>أنشئي تنبيهاً للمريضة {patient.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="alert-text">نص التنبيه</Label>
                        <Textarea
                          id="alert-text"
                          placeholder="اكتبي نص التنبيه هنا..."
                          value={alertText}
                          onChange={(e) => setAlertText(e.target.value)}
                          className="mt-2 min-h-32"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAlertOpen(false)}>إلغاء</Button>
                      <Button
                        onClick={async () => {
                          if (!patient || !alertText.trim()) return;
                          await addDoc(collection(firestoreDb, "alerts"), {
                            patientId: patient.id,
                            type: "manual",
                            message: alertText,
                            status: "open",
                            createdAt: new Date().toISOString(),
                          });
                          setAlertOpen(false);
                          setAlertText("");
                        }}
                        className="bg-gradient-to-r from-amber-600 to-amber-500 text-white gap-2"
                      >
                        <BellRing className="h-4 w-4" />
                        إنشاء
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-2 border-blue-200/50 dark:border-blue-800/50 hover:shadow-md transition-all">
                <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-xl flex-shrink-0">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-right">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">العمر</div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{patient.age || "—"} {patient.age ? "سنة" : ""}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border-2 border-purple-200/50 dark:border-purple-800/50 hover:shadow-md transition-all">
                <div className="p-3 bg-purple-100 dark:bg-purple-950/30 rounded-xl flex-shrink-0">
                  <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 text-right">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">الحالة</div>
                  <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{patient.status || "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-2 border-green-200/50 dark:border-green-800/50 hover:shadow-md transition-all">
                <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-xl flex-shrink-0">
                  <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 text-right">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">الموعد القادم</div>
                  <div className="text-xl font-bold text-green-700 dark:text-green-300">{patient.nextAppointment || "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-pink-50/50 to-pink-100/30 dark:from-pink-950/20 dark:to-pink-900/10 border-2 border-pink-200/50 dark:border-pink-800/50 hover:shadow-md transition-all">
                <div className="p-3 bg-pink-100 dark:bg-pink-950/30 rounded-xl flex-shrink-0">
                  <Phone className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="flex-1 text-right">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">رقم الهاتف</div>
                  <div className="text-xl font-bold text-pink-700 dark:text-pink-300">{patient.phone ? formatPhoneNumber(patient.phone) : "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10 border-2 border-orange-200/50 dark:border-orange-800/50 hover:shadow-md transition-all">
                <div className="p-3 bg-orange-100 dark:bg-orange-950/30 rounded-xl flex-shrink-0">
                  <Mail className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 text-right">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">البريد الإلكتروني</div>
                  <div className="text-xl font-bold text-orange-700 dark:text-orange-300 break-words">{patient.email || "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-teal-50/50 to-teal-100/30 dark:from-teal-950/20 dark:to-teal-900/10 border-2 border-teal-200/50 dark:border-teal-800/50 hover:shadow-md transition-all">
                <div className="p-3 bg-teal-100 dark:bg-teal-950/30 rounded-xl flex-shrink-0">
                  <MapPin className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 text-right">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">العنوان</div>
                  <div className="text-xl font-bold text-teal-700 dark:text-teal-300 break-words">{patient.address || "—"}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Diary, Alerts, Requests, Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" ref={exportRef}>
        {/* Diary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-lg border-2 h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                  <NotebookPen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-right">اليوميات</CardTitle>
                  <CardDescription className="mt-1 text-right">
                    {diary.length} منشور
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {diary.length === 0 ? (
                  <div className="text-center py-12">
                    <NotebookPen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground text-lg">لا توجد اليوميات</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {diary.map((e, index) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: -4 }}
                      >
                        <Card className="shadow-sm border-2 hover:shadow-md transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(e.date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}</span>
                              </div>
                              <Badge variant="outline" className="gap-1">
                                <Heart className="h-3 w-3" />
                                {e.mood}
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed text-right">{e.content}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg border-2 h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/30 rounded-lg">
                  <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-right">التنبيهات</CardTitle>
                  <CardDescription className="mt-1 text-right">
                    {alerts.filter(a => a.patientId === id).length} تنبيه
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {alerts.filter(a => a.patientId === id).length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">لا توجد تنبيهات</p>
                  </div>
                ) : (
                  alerts.filter(a => a.patientId === id).map((a, index) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`shadow-sm border-2 ${
                        a.status === 'open'
                          ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20"
                          : "opacity-60"
                      }`}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2 mb-2">
                            {a.status === 'open' ? (
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            )}
                            <p className="text-sm font-semibold flex-1 text-right">{a.message}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Badge variant="outline" className="text-xs">{a.type}</Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                a.status === 'open'
                                  ? "border-amber-300 text-amber-700"
                                  : "border-green-300 text-green-700"
                              }`}
                            >
                              {a.status === 'open' ? 'مفتوح' : 'مغلق'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reassessment Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg border-2 h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/30 rounded-lg">
                  <BellRing className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-right">طلبات إعادة التقييم</CardTitle>
                  <CardDescription className="mt-1 text-right">
                    {requests.length} طلب
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <BellRing className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
                  </div>
                ) : (
                  requests.map((r, index) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`shadow-sm border-2 ${
                        r.status === 'pending'
                          ? "border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20"
                          : "opacity-60"
                      }`}>
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-right">{r.reason || 'طلب إعادة تقييم'}</p>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="text-xs text-muted-foreground text-right">
                                {new Date(r.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  r.status === 'pending'
                                    ? "border-purple-300 text-purple-700"
                                    : r.status === 'approved'
                                    ? "border-green-300 text-green-700"
                                    : "border-red-300 text-red-700"
                                }`}
                              >
                                {r.status === 'pending' ? 'قيد الانتظار' : r.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                              </Badge>
                            </div>
                            {r.status === 'pending' && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    await updateDoc(doc(firestoreDb, 'reassessmentRequests', r.id), { status: 'approved' });
                                  }}
                                  className="flex-1 gap-2 border-green-300 text-green-700 hover:bg-green-50"
                                >
                                  <Check className="h-4 w-4" />
                                  موافقة
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    await updateDoc(doc(firestoreDb, 'reassessmentRequests', r.id), { status: 'rejected' });
                                  }}
                                  className="flex-1 gap-2 border-red-300 text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                  رفض
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="lg:col-span-3"
        >
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-right">المواعيد</CardTitle>
                    <CardDescription className="mt-1 text-right">
                      {appointments.length} موعد
                    </CardDescription>
                  </div>
                </div>
                <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        إضافة موعد
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">إضافة موعد جديد</DialogTitle>
                      <DialogDescription>
                        سيتم إشعار المريضة بالموعد تلقائياً
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
                        <Select value={apptForm.type} onValueChange={(value) => setApptForm({ ...apptForm, type: value })}>
                          <SelectTrigger id="appt-type" className="mt-2 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultation">استشارة</SelectItem>
                            <SelectItem value="followup">متابعة</SelectItem>
                            <SelectItem value="medication_review">مراجعة دواء</SelectItem>
                            <SelectItem value="examination">فحص</SelectItem>
                            <SelectItem value="other">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="appt-note">ملاحظات (اختياري)</Label>
                        <Textarea
                          id="appt-note"
                          placeholder="أضف ملاحظات حول الموعد..."
                          value={apptForm.note}
                          onChange={(e) => setApptForm({ ...apptForm, note: e.target.value })}
                          className="mt-2 min-h-24"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setAppointmentDialogOpen(false);
                        setApptForm({ at: "", note: "", type: "consultation", reminder: true });
                      }}>
                        إلغاء
                      </Button>
                      <Button onClick={async () => {
                        if (!id || !apptForm.at) return;
                        try {
                          await addDoc(collection(firestoreDb, 'appointments'), {
                            patientId: id,
                            doctorUid: user?.uid || null,
                            at: new Date(apptForm.at).toISOString(),
                            note: apptForm.note,
                            type: apptForm.type,
                            reminder: apptForm.reminder,
                            status: "upcoming",
                            createdAt: new Date().toISOString(),
                            createdBy: "doctor"
                          });
                          await updateDoc(doc(firestoreDb, 'patients', id), { nextAppointment: apptForm.at.slice(0, 10) });
                          await addDoc(collection(firestoreDb, 'alerts'), {
                            patientId: id,
                            type: "appointment",
                            message: `تم حجز موعد جديد: ${new Date(apptForm.at).toLocaleDateString('en-US')} - ${apptForm.type === 'consultation' ? 'استشارة' : apptForm.type === 'followup' ? 'متابعة' : apptForm.type === 'medication_review' ? 'مراجعة دواء' : apptForm.type === 'examination' ? 'فحص' : 'أخرى'}`,
                            status: "open",
                            createdAt: new Date().toISOString(),
                          });
                          
                          // Send WhatsApp notification
                          try {
                            const { notifyAppointmentBooked } = await import("@/lib/notifications");
                            await notifyAppointmentBooked(
                              id,
                              user?.uid || null,
                              new Date(apptForm.at),
                              apptForm.type,
                              "doctor"
                            );
                          } catch (error) {
                            console.error("Error sending notification:", error);
                            // Don't show error to user - notification is optional
                          }
                          
                          setAppointmentDialogOpen(false);
                          setApptForm({ at: "", note: "", type: "consultation", reminder: true });
                        } catch (error) {
                          console.error("Error adding appointment:", error);
                          alert("حدث خطأ أثناء إضافة الموعد. يرجى المحاولة مرة أخرى.");
                        }
                      }} className="bg-gradient-to-r from-primary to-primary/90">
                        حفظ الموعد
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">لا توجد مواعيد</p>
                  </div>
                ) : (
                  appointments.map((appt, index) => (
                    <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`shadow-sm border-2 ${appt.status === 'upcoming' ? "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20" : "opacity-60"}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs flex-shrink-0 ${
                                  appt.status === 'upcoming'
                                    ? "border-blue-300 text-blue-700"
                                    : appt.status === 'completed'
                                    ? "border-green-300 text-green-700"
                                    : "border-red-300 text-red-700"
                                }`}
                              >
                                {appt.status === 'upcoming' ? 'قادم' : appt.status === 'completed' ? 'مكتمل' : 'ملغي'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setItemToDelete({
                                    type: "appointment",
                                    id: appt.id,
                                    name: new Date(appt.at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex-1 text-right">
                              <div className="flex items-center gap-2 flex-wrap mb-1 justify-end">
                                <p className="text-sm font-semibold">
                                  {new Date(appt.at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                {appt.createdBy === "doctor" && (
                                  <Badge variant="outline" className="gap-1 border-primary text-primary bg-primary/10">
                                    <Stethoscope className="h-3 w-3" />
                                    من الطبيب
                                  </Badge>
                                )}
                              </div>
                              {appt.type && (
                                <Badge variant="outline" className="text-xs mb-1">
                                  {appt.type === 'consultation' ? 'استشارة' : appt.type === 'followup' ? 'متابعة' : appt.type === 'medication_review' ? 'مراجعة دواء' : appt.type === 'examination' ? 'فحص' : 'أخرى'}
                                </Badge>
                              )}
                              {appt.note && (
                                <p className="text-xs text-muted-foreground mt-1 text-right">{appt.note}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Medications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58 }}
          className="lg:col-span-3"
        >
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-950/30 rounded-lg">
                    <Pill className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-right">الأدوية</CardTitle>
                    <CardDescription className="mt-1 text-right">
                      {medications.length} دواء
                    </CardDescription>
                  </div>
                </div>
                <Dialog open={medicationDialogOpen} onOpenChange={setMedicationDialogOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        إضافة دواء
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">إضافة دواء جديد</DialogTitle>
                      <DialogDescription>
                        سيتم إشعار المريضة بالدواء الجديد
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="med-name">اسم الدواء *</Label>
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
                        <Label htmlFor="med-dosage">الجرعة (اختياري)</Label>
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
                      <div>
                        <Label htmlFor="med-start-date">تاريخ البدء *</Label>
                        <Input
                          id="med-start-date"
                          type="date"
                          value={medForm.startDate}
                          onChange={(e) => setMedForm({ ...medForm, startDate: e.target.value })}
                          className="mt-2 h-11"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="med-end-date">تاريخ الانتهاء (اختياري)</Label>
                        <Input
                          id="med-end-date"
                          type="date"
                          value={medForm.endDate}
                          onChange={(e) => setMedForm({ ...medForm, endDate: e.target.value })}
                          className="mt-2 h-11"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setMedicationDialogOpen(false);
                        setMedForm({ name: "", dosage: "", frequency: "once_daily", startDate: "", endDate: "", times: [], reminder: true });
                      }}>
                        إلغاء
                      </Button>
                      <Button onClick={async () => {
                        if (!id || !medForm.name || !medForm.startDate) return;
                        if (medForm.frequency !== "as_needed" && (!medForm.times || medForm.times.length === 0)) {
                          alert("يرجى تحديد أوقات التناول للدواء.");
                          return;
                        }
                        try {
                          await addDoc(collection(firestoreDb, 'medications'), {
                            patientId: id,
                            name: medForm.name,
                            dosage: medForm.dosage,
                            frequency: medForm.frequency,
                            startDate: medForm.startDate,
                            endDate: medForm.endDate || null,
                            times: medForm.times || [],
                            reminder: medForm.reminder,
                            createdAt: new Date().toISOString(),
                            createdBy: "doctor"
                          });
                          
                          // إضافة تنبيه للمريض (في النظام)
                          await addDoc(collection(firestoreDb, 'alerts'), {
                            patientId: id,
                            type: "medication",
                            message: `تم إضافة دواء جديد: ${medForm.name}${medForm.dosage ? ` (${medForm.dosage})` : ''} - ابدأ من ${new Date(medForm.startDate).toLocaleDateString('ar-EG')}`,
                            status: "open",
                            createdAt: new Date().toISOString(),
                          });
                          
                          // إرسال تنبيه WhatsApp للمريضة
                          try {
                            const { notifyMedicationAdded } = await import("@/lib/notifications");
                            await notifyMedicationAdded(
                              id,
                              medForm.name,
                              medForm.dosage || "",
                              medForm.times,
                              medForm.startDate
                            );
                          } catch (error) {
                            console.error("Error sending medication notification:", error);
                            // Don't show error to user - notification is optional
                          }
                          setMedicationDialogOpen(false);
                          setMedForm({ name: "", dosage: "", frequency: "once_daily", startDate: "", endDate: "", times: [], reminder: true });
                        } catch (error) {
                          console.error("Error adding medication:", error);
                          alert("حدث خطأ أثناء إضافة الدواء. يرجى المحاولة مرة أخرى.");
                        }
                      }} className="bg-gradient-to-r from-primary to-primary/90">
                        حفظ الدواء
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {medications.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">لا توجد أدوية</p>
                  </div>
                ) : (
                  medications.map((med, index) => (
                    <motion.div
                      key={med.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="shadow-sm border-2 border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              onClick={() => {
                                setItemToDelete({
                                  type: "medication",
                                  id: med.id,
                                  name: med.name
                                });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="flex-1 text-right">
                              <div className="flex items-center gap-2 flex-wrap mb-1 justify-end">
                                <p className="text-sm font-semibold">{med.name}</p>
                                {med.createdBy === "doctor" && (
                                  <Badge variant="outline" className="gap-1 border-primary text-primary bg-primary/10">
                                    <Stethoscope className="h-3 w-3" />
                                    من الطبيب
                                  </Badge>
                                )}
                              </div>
                              {med.dosage && (
                                <p className="text-xs text-muted-foreground mb-1 text-right">الجرعة: {med.dosage}</p>
                              )}
                              <Badge variant="outline" className="text-xs mb-1">
                                {med.frequency === 'daily' ? 'يومياً' : med.frequency === 'twice_daily' ? 'مرتين يومياً' : med.frequency === 'three_times_daily' ? 'ثلاث مرات يومياً' : med.frequency === 'weekly' ? 'أسبوعياً' : 'حسب الحاجة'}
                              </Badge>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground justify-end">
                                <Clock className="h-3 w-3" />
                                <span>من {new Date(med.startDate).toLocaleDateString('en-US')}</span>
                                {med.endDate && (
                                  <span>إلى {new Date(med.endDate).toLocaleDateString('en-US')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assessments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-3"
        >
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-950/30 rounded-lg">
                  <LineChart className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-right">التقييمات</CardTitle>
                  <CardDescription className="mt-1 text-right">
                    {assessments.length} تقييم
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assessments.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <LineChart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground text-lg">لا توجد تقييمات بعد</p>
                  </div>
                ) : (
                  assessments.map((asmt, index) => (
                    <motion.div
                      key={asmt.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="shadow-sm border-2 hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3 gap-4">
                            <Badge variant="outline" className="gap-1 flex-shrink-0">
                              <TrendingUp className="h-3 w-3" />
                              {asmt.level}
                            </Badge>
                            <div className="text-xs text-muted-foreground text-right">
                              {new Date(asmt.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-lg font-bold text-primary flex-shrink-0">{asmt.score}</span>
                            <span className="text-sm text-muted-foreground text-right">النتيجة:</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 text-right">نتيجة تقييم مخاطر محفوظة في الملف</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Patient Files */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="lg:col-span-3"
        >
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                  <FileImage className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-right">الملفات الطبية</CardTitle>
                  <CardDescription className="mt-1 text-right">
                    {patientFiles.length} ملف مرفوع من المريضة
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {patientFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FileImage className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground text-lg">لا توجد ملفات مرفوعة</p>
                  <p className="text-sm text-muted-foreground mt-2">المريضة لم تقم برفع أي ملفات بعد</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patientFiles.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card className="shadow-sm border-2 hover:shadow-md transition-all h-full">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                              {file.mimeType?.startsWith('image/') ? (
                                <Image className="h-5 w-5 text-primary" />
                              ) : (
                                <FileText className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate mb-1">{file.fileName}</h4>
                              <Badge variant="outline" className="text-xs mb-2">
                                {file.fileType === 'medication' ? 'صورة دواء' :
                                 file.fileType === 'prescription' ? 'وصفة طبية' :
                                 file.fileType === 'xray' ? 'أشعة/تحليل' :
                                 file.fileType === 'report' ? 'تقرير طبي' : 'أخرى'}
                              </Badge>
                              {file.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{file.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(file.createdAt).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              {file.size && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-2"
                              onClick={() => window.open(file.downloadURL, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                              عرض
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-2"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = file.downloadURL;
                                link.download = file.fileName;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4" />
                              تحميل
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl">تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف {itemToDelete?.type === "appointment" ? "الموعد" : "الدواء"}؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground text-right">
              {itemToDelete?.type === "appointment" ? (
                <>سيتم حذف الموعد: <span className="font-semibold text-foreground">{itemToDelete.name}</span></>
              ) : (
                <>سيتم حذف الدواء: <span className="font-semibold text-foreground">{itemToDelete?.name}</span></>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              ⚠️ لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setItemToDelete(null);
            }}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!itemToDelete) return;
                try {
                  if (itemToDelete.type === "appointment") {
                    await deleteDoc(doc(firestoreDb, "appointments", itemToDelete.id));
                  } else if (itemToDelete.type === "medication") {
                    await deleteDoc(doc(firestoreDb, "medications", itemToDelete.id));
                  }
                  setDeleteDialogOpen(false);
                  setItemToDelete(null);
                } catch (error) {
                  console.error("Error deleting item:", error);
                  alert("حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.");
                }
              }}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
