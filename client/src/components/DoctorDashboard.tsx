import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientCard } from "./PatientCard";
import { MedicalImageAnalysis } from "./MedicalImageAnalysis";
import { Input } from "@/components/ui/input";
import { Search, Users, Calendar, AlertCircle, Check, MessageSquareText, Send, Plus, Stethoscope, Sparkles, Filter, ToggleLeft, ToggleRight, Clock, TrendingUp, Bell, Mail, User, ChevronRight, X, ImageIcon, Sparkles as SparklesIcon } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card as UICard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { collection, onSnapshot, addDoc, firestoreDb, deleteDoc, getDocs, doc, query, where, writeBatch, updateDoc, getDoc, orderBy, setDoc } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { auth, signOut } from "@/lib/firebase";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DoctorDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", age: "", status: "متابعة", nextAppointment: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"priority" | "next" | "name">("priority");
  const [showOnlyUnanswered, setShowOnlyUnanswered] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyFor, setReplyFor] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const { user } = useAuth();
  const [accepting, setAccepting] = useState<boolean | null>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [popupOpen, setPopupOpen] = useState<"alerts" | "messages" | "appointments" | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<"approved" | "pending" | "needsInfo" | "rejected" | "checking" | null>(null);
  const [registrationRequest, setRegistrationRequest] = useState<any>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const queryClient = useQueryClient();
  const medicalImageAnalysisRef = useRef<HTMLDivElement>(null);
  const resolveAlert = useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(firestoreDb, "alerts", id), { status: "resolved" });
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  // First fetch patients, then filter other data based on patient IDs
  // Only fetch if doctor is approved
  useEffect(() => {
    if (!user?.uid) return;
    
    // Don't fetch patients if doctor is not approved
    if (registrationStatus !== "approved") {
      setPatients([]);
      return;
    }
    
    // Fetch patients assigned to this doctor
    // Try query first, if it fails (e.g., missing index), fallback to getting all and filtering
    const unsubP = onSnapshot(
      query(collection(firestoreDb, "patients"), where("assignedDoctor", "==", user.uid)),
      (snap) => {
        const fetchedPatients = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setPatients(fetchedPatients);
      },
      async (error: any) => {
        console.error("Error fetching patients with query:", error);
        // If error is about missing index, try to fetch all and filter client-side
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          console.log("Missing index detected, falling back to client-side filtering");
        }
        try {
          // Fallback: fetch all patients and filter client-side
          const snap = await getDocs(collection(firestoreDb, "patients"));
          const allPatients = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          const filtered = allPatients.filter((p: any) => p.assignedDoctor === user.uid);
          setPatients(filtered);
        } catch (err: any) {
          console.error("Error with fallback fetch:", err);
          // If still fails, check if it's a permissions error
          if (err?.code === 'permission-denied') {
            console.error("Permission denied - check Firestore rules");
            // Don't show alert if doctor is not approved - this is expected
            if (registrationStatus === "approved") {
            alert("خطأ في الصلاحيات. يرجى التأكد من أن الطبيب موافق عليه.");
            }
          }
        }
      }
    );
    
    return () => { unsubP(); };
  }, [user?.uid, registrationStatus]);

  // Fetch alerts, messages, and appointments after patients are loaded
  useEffect(() => {
    if (!user?.uid || patients.length === 0) {
      setAlerts([]);
      setMessages([]);
      setAppointments([]);
      return;
    }
    
    const patientIds = patients.map(p => p.id);
    const unsubs: (() => void)[] = [];
    
    // Fetch data for each patient individually using where clauses
    // This respects Firestore rules which check each document
    patientIds.forEach((patientId) => {
      // Fetch alerts for this specific patient
      try {
        const unsubA = onSnapshot(
          query(collection(firestoreDb, "alerts"), where("patientId", "==", patientId)),
          (snap) => {
            const patientAlerts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            // Update alerts: remove old alerts for this patient, add new ones
            setAlerts(prev => {
              const filtered = prev.filter((a: any) => a.patientId !== patientId);
              return [...filtered, ...patientAlerts];
            });
          },
          (error) => {
            console.error(`Error fetching alerts for patient ${patientId}:`, error);
          }
        );
        unsubs.push(unsubA);
      } catch (err) {
        console.error(`Error setting up alerts listener for patient ${patientId}:`, err);
      }

      // Fetch messages for this specific patient
      try {
        const unsubM = onSnapshot(
          query(
            collection(firestoreDb, "messages"),
            where("patientId", "==", patientId),
            where("from", "==", "patient")
          ),
          (snap) => {
            const patientMessages = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            setMessages(prev => {
              const filtered = prev.filter((m: any) => m.patientId !== patientId);
              return [...filtered, ...patientMessages];
            });
          },
          (error) => {
            console.error(`Error fetching messages for patient ${patientId}:`, error);
          }
        );
        unsubs.push(unsubM);
      } catch (err) {
        console.error(`Error setting up messages listener for patient ${patientId}:`, err);
      }

      // Fetch appointments for this specific patient
      // Try with orderBy first, fallback to without orderBy if index is missing
      try {
        // First try without orderBy to avoid index requirement
        const unsubAppt = onSnapshot(
          query(collection(firestoreDb, "appointments"), where("patientId", "==", patientId)),
          (snap) => {
            const patientAppts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            // Sort by date client-side
            patientAppts.sort((a: any, b: any) => {
              const dateA = new Date(a.at || 0).getTime();
              const dateB = new Date(b.at || 0).getTime();
              return dateA - dateB;
            });
            setAppointments(prev => {
              const filtered = prev.filter((a: any) => a.patientId !== patientId);
              return [...filtered, ...patientAppts];
            });
          },
          (error: any) => {
            console.error(`Error fetching appointments for patient ${patientId}:`, error);
            // If it's a permission error, show helpful message
            if (error?.code === 'permission-denied') {
              console.error("Permission denied - check Firestore rules");
            }
          }
        );
        unsubs.push(unsubAppt);
      } catch (err) {
        console.error(`Error setting up appointments listener for patient ${patientId}:`, err);
      }
    });
    
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user?.uid, patients]);

  // Check doctor approval status and listen for changes
  useEffect(() => {
    if (!user) {
      setRegistrationStatus(null);
      return;
    }

    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const fs = await import("@/lib/firebase");
        // Check if doctor exists in doctors collection FIRST
        const doctorDoc = await fs.getDoc(fs.doc(fs.firestoreDb, "doctors", user.uid));
        
        if (doctorDoc.exists()) {
          // Doctor is approved - ONLY way to be approved
          const data = doctorDoc.data() as any;
          setDoctorData(data);
          setAccepting(data?.acceptingPatients ?? true);
          setRegistrationStatus("approved");
          setShowStatusDialog(false);
          
          // Update last login
          await fs.updateDoc(fs.doc(fs.firestoreDb, "doctors", user.uid), {
            lastLogin: new Date().toISOString()
          });
          return; // Exit early - doctor is approved
        }
        
        // Doctor NOT approved - listen to registration request changes in real-time
        setRegistrationStatus("checking");
        const requestsQuery = fs.query(
            fs.collection(fs.firestoreDb, "doctorRegistrationRequests"),
            fs.where("uid", "==", user.uid)
        );
        
        unsub = fs.onSnapshot(requestsQuery, (snap) => {
          if (!snap.empty) {
            const request = snap.docs[0].data() as any;
            const requestId = snap.docs[0].id;
          setRegistrationRequest({ ...request, id: requestId });
          
          // Set status based on request status
          if (request.status === "pending") {
            setRegistrationStatus("pending");
            setShowStatusDialog(true);
          } else if (request.status === "needsInfo") {
            setRegistrationStatus("needsInfo");
            setShowStatusDialog(true);
          } else if (request.status === "rejected") {
            setRegistrationStatus("rejected");
            setShowStatusDialog(true);
          } else {
              // Unknown status
            setRegistrationStatus("pending");
            setShowStatusDialog(true);
          }
        } else {
          // No registration request found - treat as pending
          setRegistrationStatus("pending");
          setShowStatusDialog(true);
        }
        }, (error) => {
          console.error("Error listening to registration request:", error);
          setRegistrationStatus("pending");
          setShowStatusDialog(true);
        });
      } catch (error) {
        console.error("Error checking doctor status:", error);
        // On error, set to pending to show dialog
        setRegistrationStatus("pending");
        setShowStatusDialog(true);
      }
    })();

    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [user]);

  // Removed seeding; rely purely on Firestore data

  const addPatient = async () => {
    if (!newPatient.name || !newPatient.age) return;
    await addDoc(collection(firestoreDb, "patients"), {
      name: newPatient.name,
      age: parseInt(newPatient.age, 10),
      status: newPatient.status,
      nextAppointment: newPatient.nextAppointment,
      riskLevel: "منخفض",
    });
    setShowAdd(false);
    setNewPatient({ name: "", age: "", status: "متابعة", nextAppointment: "" });
  };

  // Calculate upcoming appointments from appointments collection
  const upcomingIn7Days = appointments.filter(appt => {
    if (!appt.at) return false;
    const d = new Date(appt.at);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= 7 && appt.status !== 'completed' && appt.status !== 'cancelled';
  }).length;

  // Helper to get patient name from ID
  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || "مريضة غير معروفة";
  };

  const filteredPatients = (patients ?? []).filter((patient) =>
    patient.name.includes(searchQuery)
  ).sort((a, b) => {
    if (sortKey === "name") return a.name.localeCompare(b.name);
    if (sortKey === "next") return new Date(a.nextAppointment || 0).getTime() - new Date(b.nextAppointment || 0).getTime();
    // priority: مرتفع > متوسط > منخفض, plus open alerts first
    const rank = (p: any) => {
      const riskMap: any = { "مرتفع": 3, "متوسط": 2, "منخفض": 1 };
      const risk = riskMap[p.riskLevel] || 0;
      const openAlerts = alerts.filter((al) => al.patientId === p.id && al.status === 'open').length;
      return -(risk * 10 + openAlerts);
    };
    return rank(a) - rank(b);
  });

  // Show loading state while checking
  if (registrationStatus === "checking" || registrationStatus === null) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-12 w-12 text-primary animate-spin" />
            <p className="text-lg font-semibold">جارٍ التحقق من حالة التسجيل...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Show status dialog if not approved
  const StatusDialog = () => {
    if (!showStatusDialog) return null;

    let title = "";
    let description = "";
    let IconComponent = Clock;
    let iconColor = "text-yellow-600";
    let bgColor = "bg-yellow-100";

    if (registrationStatus === "pending") {
      title = "طلب التسجيل قيد المراجعة";
      description = "شكراً لك على اهتمامك بالانضمام إلى منصة رفيق الأمل كطبيب. تم إرسال طلب تسجيلك إلى إدارة المنصة، وسيتم مراجعة بياناتك والتأكد من هويتك الطبية. سيتم إشعارك عبر البريد الإلكتروني عند الموافقة على طلبك.";
      IconComponent = Clock;
      iconColor = "text-yellow-600";
      bgColor = "bg-yellow-100 dark:bg-yellow-950/30";
    } else if (registrationStatus === "needsInfo") {
      title = "مطلوب معلومات إضافية";
      description = registrationRequest?.additionalInfoRequest || "يرجى توفير المعلومات المطلوبة لإتمام عملية مراجعة طلب التسجيل.";
      IconComponent = AlertCircle;
      iconColor = "text-blue-600";
      bgColor = "bg-blue-100 dark:bg-blue-950/30";
    } else if (registrationStatus === "rejected") {
      title = "تم رفض طلب التسجيل";
      description = registrationRequest?.rejectionReason || "للأسف، تم رفض طلب تسجيلك. يرجى التواصل مع الإدارة لمزيد من المعلومات.";
      IconComponent = X;
      iconColor = "text-red-600";
      bgColor = "bg-red-100 dark:bg-red-950/30";
    }

    return (
      <Dialog open={showStatusDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className={`p-3 ${bgColor} rounded-full`}>
                <IconComponent className={`h-8 w-8 ${iconColor}`} />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl font-bold">
              {title}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
          <div className="text-center text-base mt-4 space-y-3">
            <p className="text-foreground leading-relaxed">
              {description}
            </p>
            {registrationStatus === "needsInfo" && (
              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={() => {
                    // Navigate to update info page
                    window.location.href = `/doctor/update-info`;
                  }}
                  className="w-full bg-gradient-to-r from-primary to-primary/90"
                >
                  تحديث المعلومات
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                await signOut(auth);
                window.location.href = "/login";
              }}
              variant="outline"
              className="w-full"
            >
              العودة إلى تسجيل الدخول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Don't show main content if not approved
  if (registrationStatus !== "approved") {
    return (
      <>
        <StatusDialog />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 text-center max-w-md">
            <div className="flex flex-col items-center gap-4">
              <Clock className="h-12 w-12 text-primary" />
              <p className="text-lg font-semibold">يجب الموافقة على طلبك قبل الوصول إلى لوحة التحكم</p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <StatusDialog />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-8 sm:pb-12">
        {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-xl border-2 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl -ml-24 -mb-24" />
          
          <CardHeader className="pb-6 relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg border border-primary/20"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Stethoscope className="h-8 w-8 text-primary" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-2">
                    مرحباً بك د. {doctorData?.name || user?.email?.split("@")[0] || "طبيب"}
                  </CardTitle>
                  <CardDescription className="font-body text-base sm:text-lg mt-2 flex items-center gap-2 flex-wrap">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span>إدارة المريضات ومتابعة الحالات الطبية</span>
                    {doctorData?.lastLogin && (
                      <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">
                        • آخر تسجيل دخول: {new Date(doctorData.lastLogin).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <Link href="/doctor/profile">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="gap-2 shadow-md hover:shadow-lg transition-shadow border-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">الملف الشخصي</span>
                    <span className="sm:hidden">الملف</span>
                  </Button>
                </motion.div>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4 }}
          >
            <Card className="shadow-lg border-2 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-emerald-900/20 h-full hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">استقبال حالات جديدة</CardTitle>
                  <motion.div 
                    className="p-2.5 bg-emerald-200/60 dark:bg-emerald-950/50 rounded-xl shadow-sm"
                    animate={{ scale: accepting ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {accepting ? (
                      <ToggleRight className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-500" />
                    )}
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Switch
                    checked={!!accepting}
                    onCheckedChange={async (checked) => {
                      setAccepting(checked);
                      if (user) await updateDoc(doc(firestoreDb, 'doctors', user.uid), { acceptingPatients: checked });
                    }}
                  />
                  <Badge 
                    variant={accepting ? "default" : "outline"} 
                    className={`text-sm px-3 py-1 font-semibold transition-colors ${
                      accepting 
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md" 
                        : "border-2"
                    }`}
                  >
                    {accepting ? 'مفعل' : 'متوقف'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -4 }}
        >
          <Card className="shadow-lg border-2 bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-100/50 dark:from-blue-950/40 dark:via-blue-950/30 dark:to-blue-900/20 h-full hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">إجمالي المرضى</CardTitle>
                <div className="p-2.5 bg-blue-200/60 dark:bg-blue-950/50 rounded-xl shadow-sm">
                  <Users className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent mb-1">
                {patients.length}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-medium">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>نشط الآن</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -4 }}
        >
          <Card 
            className="shadow-lg border-2 bg-gradient-to-br from-purple-50 via-purple-50/80 to-purple-100/50 dark:from-purple-950/40 dark:via-purple-950/30 dark:to-purple-900/20 h-full hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => setPopupOpen("appointments")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">المواعيد القادمة</CardTitle>
                <div className="p-2.5 bg-purple-200/60 dark:bg-purple-950/50 rounded-xl shadow-sm">
                  <Calendar className="h-5 w-5 text-purple-700 dark:text-purple-300" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-700 to-purple-600 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent mb-1">
                {upcomingIn7Days}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-medium">
                <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>خلال 7 أيام</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -4 }}
        >
          <Card 
            className="shadow-lg border-2 bg-gradient-to-br from-amber-50 via-amber-50/80 to-amber-100/50 dark:from-amber-950/40 dark:via-amber-950/30 dark:to-amber-900/20 h-full hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => setPopupOpen("alerts")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">حالات تحتاج متابعة</CardTitle>
                <div className="p-2.5 bg-amber-200/60 dark:bg-amber-950/50 rounded-xl shadow-sm">
                  <Bell className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent mb-1">
                {alerts.filter(a => a.status === 'open').length}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>يُنصح بالمتابعة اليوم</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -4 }}
        >
          <Card 
            className="shadow-lg border-2 bg-gradient-to-br from-pink-50 via-pink-50/80 to-pink-100/50 dark:from-pink-950/40 dark:via-pink-950/30 dark:to-pink-900/20 h-full hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => setPopupOpen("messages")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">رسائل غير مجابة</CardTitle>
                <div className="p-2.5 bg-pink-200/60 dark:bg-pink-950/50 rounded-xl shadow-sm">
                  <Mail className="h-5 w-5 text-pink-700 dark:text-pink-300" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-pink-700 to-pink-600 dark:from-pink-400 dark:to-pink-300 bg-clip-text text-transparent mb-1">
                {messages.filter(m => m.status !== 'answered').length}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-medium">
                <MessageSquareText className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
                <span>بانتظار الرد</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Medical Image Analysis Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ y: -4, scale: 1.02 }}
        >
          <Card 
            className="shadow-lg border-2 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-teal-100/50 dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-teal-900/20 h-full hover:shadow-xl transition-all duration-300 cursor-pointer border-emerald-200/50 dark:border-emerald-800/50"
            onClick={() => {
              medicalImageAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-right">تحليل الصور الطبية</CardTitle>
                <div className="p-2.5 bg-emerald-200/60 dark:bg-emerald-950/50 rounded-xl shadow-sm">
                  <ImageIcon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-right">
              <div className="flex items-center gap-2 mb-2 justify-end">
                <SparklesIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">ذكاء اصطناعي</span>
              </div>
              <div className="text-xs text-muted-foreground font-medium mt-3">
                <span>تحليل ماموجرام وأشعة X-Ray</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Patients List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-2xl font-bold">قائمة المريضات</CardTitle>
                  <CardDescription className="mt-1">
                    {filteredPatients.filter(p => !showOnlyUnanswered || alerts.some(a => a.patientId === p.id && a.status === 'open')).length} مريضة
                  </CardDescription>
                </div>
              </div>
              <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogTrigger asChild>
                  <motion.div 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90 shadow-lg hover:shadow-xl gap-2 transition-all w-full sm:w-auto">
                      <Plus className="h-5 w-5" />
                      <span className="hidden sm:inline">إضافة مريضة</span>
                      <span className="sm:hidden">إضافة</span>
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl">إضافة مريضة جديدة</DialogTitle>
                    <DialogDescription>
                      أضيفي معلومات المريضة الجديدة
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="patient-name">الاسم</Label>
                      <Input
                        id="patient-name"
                        placeholder="اسم المريضة"
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                        className="mt-2 h-11"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="patient-age">العمر</Label>
                      <Input
                        id="patient-age"
                        type="number"
                        placeholder="العمر"
                        value={newPatient.age}
                        onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                        className="mt-2 h-11"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="patient-status">الحالة</Label>
                      <Select
                        value={newPatient.status}
                        onValueChange={(value) => setNewPatient({ ...newPatient, status: value })}
                      >
                        <SelectTrigger id="patient-status" className="mt-2 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="متابعة">متابعة</SelectItem>
                          <SelectItem value="علاج">علاج</SelectItem>
                          <SelectItem value="استشارة">استشارة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="patient-appointment">الموعد القادم</Label>
                      <Input
                        id="patient-appointment"
                        type="date"
                        value={newPatient.nextAppointment}
                        onChange={(e) => setNewPatient({ ...newPatient, nextAppointment: e.target.value })}
                        className="mt-2 h-11"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAdd(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={addPatient} className="bg-gradient-to-r from-primary to-primary/90">
                      حفظ
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="mt-6 p-5 bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20 rounded-2xl border-2 border-border/60 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    placeholder="البحث عن مريضة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-11 h-12 border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 bg-background/80 backdrop-blur-sm shadow-sm transition-all"
                    data-testid="input-search-patients"
                  />
                </div>
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border-2 border-border/60 shadow-sm hover:shadow-md transition-shadow">
                  <Filter className="h-4 w-4 text-primary flex-shrink-0" />
                  <Select value={sortKey} onValueChange={(value) => setSortKey(value as any)}>
                    <SelectTrigger className="w-[160px] sm:w-[180px] h-9 border-0 bg-transparent focus:ring-0 text-sm">
                      <SelectValue placeholder="الفرز حسب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">الأولوية</SelectItem>
                      <SelectItem value="next">أقرب موعد</SelectItem>
                      <SelectItem value="name">الاسم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border-2 border-border/60 shadow-sm hover:shadow-md transition-shadow">
                  <Switch
                    checked={showOnlyUnanswered}
                    onCheckedChange={setShowOnlyUnanswered}
                  />
                  <Label className="text-sm cursor-pointer font-medium whitespace-nowrap">تنبيهات غير مغلقة فقط</Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filteredPatients.filter(p => !showOnlyUnanswered || alerts.some(a => a.patientId === p.id && a.status === 'open')).map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                    whileHover={{ y: -4 }}
                  >
                    <PatientCard {...patient} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {filteredPatients.filter(p => !showOnlyUnanswered || alerts.some(a => a.patientId === p.id && a.status === 'open')).length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Users className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                </motion.div>
                <p className="text-muted-foreground text-xl font-semibold mb-2">لا توجد مريضات</p>
                <p className="text-sm text-muted-foreground">أضيفي مريضة جديدة للبدء في المتابعة</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts and Messages - Side by Side */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        dir="rtl"
        lang="ar"
      >
        {/* Alerts */}
        <Card className="shadow-lg border-2 border-amber-200/50 dark:border-amber-800/50" dir="rtl" lang="ar">
          <CardHeader className="pb-4 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20 border-b">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-200/50 dark:from-amber-950/40 dark:to-amber-900/30 rounded-xl shadow-md border border-amber-200/50 dark:border-amber-800/50">
                  <Bell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 text-right">
                  <CardTitle className="text-2xl font-bold text-foreground">تنبيهات المتابعة</CardTitle>
                  <CardDescription className="mt-1.5 text-base">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {alerts.filter(a => a.status === 'open').length}
                    </span>{" "}
                    تنبيه نشط
                  </CardDescription>
                </div>
              </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ScrollArea className="h-[500px] pl-4">
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                    dir="rtl"
                    lang="ar"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Bell className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                  </motion.div>
                  <p className="text-muted-foreground text-xl font-semibold">لا توجد تنبيهات</p>
                  <p className="text-sm text-muted-foreground mt-2">كل شيء على ما يرام! ✨</p>
                </motion.div>
              ) : (
                <AnimatePresence>
                    {alerts.sort((a, b) => {
                      // Sort: open alerts first, then by creation date
                      if (a.status === 'open' && b.status !== 'open') return -1;
                      if (a.status !== 'open' && b.status === 'open') return 1;
                      const aDate = new Date(a.createdAt || 0).getTime();
                      const bDate = new Date(b.createdAt || 0).getTime();
                      return bDate - aDate;
                    }).map((a, index) => (
                    <motion.div
                      key={a.id}
                        initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                        whileHover={{ x: 6, scale: 1.02 }}
                    >
                      <Card className={`shadow-md border-2 transition-all ${
                        a.status === 'open'
                            ? "border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50/70 via-amber-50/50 to-amber-100/30 dark:from-amber-950/40 dark:via-amber-950/30 dark:to-amber-900/20 hover:shadow-lg hover:border-amber-400"
                            : "opacity-60 border-muted"
                        }`} dir="rtl" lang="ar">
                        <CardContent className="p-5">
                            <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 text-right space-y-2">
                                  <p className="text-sm font-medium leading-relaxed text-foreground">{a.message}</p>
                                  {a.createdAt && (
                                    <p className="text-xs text-muted-foreground text-right">
                                      {new Date(a.createdAt).toLocaleDateString('ar-EG', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  )}
                              </div>
                                {a.status === 'open' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resolveAlert.mutate(a.id)}
                                    className="gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 flex-shrink-0"
                                  >
                                    <Check className="h-4 w-4" />
                                    تم
                                  </Button>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap justify-end pt-2 border-t border-border/50">
                                {a.patientId && (
                                  <Badge variant="outline" className="text-xs border-primary text-primary bg-primary/10">
                                    <User className="h-3 w-3 mr-1" />
                                    {getPatientName(a.patientId)}
                                  </Badge>
                                )}
                                {a.patientId && (
                                  <Link href={`/doctor/patient/${a.patientId}`} className="text-xs underline hover:text-primary transition-colors text-muted-foreground hover:text-foreground">
                                    عرض المريضة
                                  </Link>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {a.type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    a.status === 'open'
                                      ? "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
                                      : "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/30"
                                  }`}
                                >
                                  {a.status === 'open' ? 'مفتوح' : 'مغلق'}
                                </Badge>
                              </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
            </ScrollArea>
          </CardContent>
        </Card>

      {/* Messages */}
        <Card className="shadow-lg border-2 border-purple-200/50 dark:border-purple-800/50" dir="rtl" lang="ar">
          <CardHeader className="pb-4 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20 border-b">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200/50 dark:from-purple-950/40 dark:to-purple-900/30 rounded-xl shadow-md border border-purple-200/50 dark:border-purple-800/50">
                  <MessageSquareText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 text-right">
                  <CardTitle className="text-2xl font-bold text-foreground">رسائل المريضات</CardTitle>
                  <CardDescription className="mt-1.5 text-base">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {messages.filter(m => m.status !== 'answered').length}
                    </span>{" "}
                    رسالة غير مجابة
                  </CardDescription>
                </div>
              </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ScrollArea className="h-[500px] pl-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                    dir="rtl"
                    lang="ar"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <MessageSquareText className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                  </motion.div>
                  <p className="text-muted-foreground text-xl font-semibold">لا توجد رسائل</p>
                  <p className="text-sm text-muted-foreground mt-2">لا توجد رسائل جديدة من المريضات</p>
                </motion.div>
              ) : (
                <AnimatePresence>
                    {messages.sort((a,b) => {
                      // Sort: unanswered messages first, then by creation date
                      if (a.status !== 'answered' && b.status === 'answered') return -1;
                      if (a.status === 'answered' && b.status !== 'answered') return 1;
                      const aDate = new Date(a.createdAt || 0).getTime();
                      const bDate = new Date(b.createdAt || 0).getTime();
                      return bDate - aDate;
                    }).map((m, index) => (
                    <motion.div
                      key={m.id}
                        initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                        whileHover={{ x: 6, scale: 1.02 }}
                    >
                      <Card className={`shadow-md border-2 transition-all ${
                        m.status !== 'answered'
                            ? "border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50/70 via-purple-50/50 to-purple-100/30 dark:from-purple-950/40 dark:via-purple-950/30 dark:to-purple-900/20 hover:shadow-lg hover:border-purple-400"
                            : "opacity-60 border-muted"
                        }`} dir="rtl" lang="ar">
                        <CardContent className="p-5">
                            <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 text-right space-y-2">
                                  <p className="text-sm font-medium leading-relaxed text-foreground">{m.text}</p>
                                  {m.createdAt && (
                                    <p className="text-xs text-muted-foreground text-right">
                                      {new Date(m.createdAt).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                      })}
                                    </p>
                                )}
                            </div>
                            {m.status !== 'answered' && (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setReplyFor(m); setReplyOpen(true); }}
                                      className="gap-2 border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                                >
                                  <Send className="h-4 w-4" />
                                  رد
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => { await updateDoc(doc(firestoreDb, 'messages', m.id), { status: 'answered' }); }}
                                      className="gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                >
                                  <Check className="h-4 w-4" />
                                  تم
                                </Button>
                              </div>
                            )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap justify-end pt-2 border-t border-border/50">
                                {m.patientId && (
                                  <Badge variant="outline" className="text-xs border-primary text-primary bg-primary/10">
                                    <User className="h-3 w-3 mr-1" />
                                    {getPatientName(m.patientId)}
                                  </Badge>
                                )}
                                {m.patientId && (
                                  <Link href={`/doctor/patient/${m.patientId}`} className="text-xs underline hover:text-primary transition-colors text-muted-foreground hover:text-foreground">
                                    عرض المريضة
                                  </Link>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    m.status === 'answered'
                                      ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/30"
                                      : "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/30"
                                  }`}
                                >
                                  {m.status === 'answered' ? 'مجاب' : 'بانتظار الرد'}
                                </Badge>
                              </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-md" dir="rtl" lang="ar">
          <DialogHeader>
            <DialogTitle className="text-xl text-right">الرد على الرسالة</DialogTitle>
            <DialogDescription className="text-right">
              أرسلي ردك على رسالة المريضة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reply-text" className="text-right">نص الرد</Label>
              <Textarea
                id="reply-text"
                placeholder="اكتبي ردك هنا..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="mt-2 min-h-32 text-right"
                dir="rtl"
                lang="ar"
                required
            />
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReplyOpen(false);
              setReplyFor(null);
              setReplyText('');
            }}>
              إلغاء
            </Button>
            <Button
              onClick={async () => {
                if (!replyFor || !replyText.trim()) return;
                await addDoc(collection(firestoreDb, 'messages'), { patientId: replyFor.patientId, text: replyText, status: 'answered', createdAt: new Date().toISOString(), from: 'doctor' });
                await updateDoc(doc(firestoreDb, 'messages', replyFor.id), { status: 'answered' });
                setReplyOpen(false);
                setReplyFor(null);
                setReplyText('');
              }}
              className="bg-gradient-to-r from-primary to-primary/90 gap-2"
            >
              <Send className="h-4 w-4" />
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pop-ups for Stats Cards */}
      <AnimatePresence>
        {popupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPopupOpen(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-2xl shadow-2xl border-2 max-w-2xl w-full max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  {popupOpen === "alerts" && <Bell className="h-6 w-6 text-amber-600" />}
                  {popupOpen === "messages" && <Mail className="h-6 w-6 text-pink-600" />}
                  {popupOpen === "appointments" && <Calendar className="h-6 w-6 text-purple-600" />}
                  <h2 className="text-2xl font-bold">
                    {popupOpen === "alerts" && "تنبيهات المتابعة"}
                    {popupOpen === "messages" && "رسائل المريضات"}
                    {popupOpen === "appointments" && "المواعيد القادمة"}
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPopupOpen(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-6">
                {popupOpen === "alerts" && (
                  <div className="space-y-3">
                    {alerts.filter(a => a.status === 'open').length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">لا توجد تنبيهات نشطة</p>
                      </div>
                    ) : (
                      alerts.filter(a => a.status === 'open').slice(0, 10).map((a) => (
                        <Card key={a.id} className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                  <p className="text-sm font-semibold">{a.message}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {a.patientId && (
                                    <Badge variant="outline" className="text-xs border-primary text-primary bg-primary/10">
                                      <User className="h-3 w-3 ml-1" />
                                      {getPatientName(a.patientId)}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">{a.type}</Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveAlert.mutate(a.id)}
                                className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                                تم
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
                {popupOpen === "messages" && (
                  <div className="space-y-3">
                    {messages.filter(m => m.status !== 'answered').length === 0 ? (
                      <div className="text-center py-8">
                        <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">لا توجد رسائل غير مجابة</p>
                      </div>
                    ) : (
                      messages.filter(m => m.status !== 'answered').slice(0, 10).map((m) => (
                        <Card key={m.id} className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                                  {m.patientId && (
                                    <Badge variant="outline" className="text-xs border-primary text-primary bg-primary/10">
                                      <User className="h-3 w-3 ml-1" />
                                      {getPatientName(m.patientId)}
                                    </Badge>
                                  )}
                                  <span>{new Date(m.createdAt).toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setReplyFor(m); setReplyOpen(true); setPopupOpen(null); }}
                                  className="gap-2 border-primary text-primary hover:bg-primary/10"
                                >
                                  <Send className="h-4 w-4" />
                                  رد
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
                {popupOpen === "appointments" && (
                  <div className="space-y-3">
                    {appointments.filter(appt => {
                      if (!appt.at) return false;
                      const d = new Date(appt.at);
                      const now = new Date();
                      const diff = (d.getTime() - now.getTime()) / 86400000;
                      return diff >= 0 && diff <= 7 && appt.status !== 'completed' && appt.status !== 'cancelled';
                    }).length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">لا توجد مواعيد قادمة خلال 7 أيام</p>
                      </div>
                    ) : (
                      appointments.filter(appt => {
                        if (!appt.at) return false;
                        const d = new Date(appt.at);
                        const now = new Date();
                        const diff = (d.getTime() - now.getTime()) / 86400000;
                        return diff >= 0 && diff <= 7 && appt.status !== 'completed' && appt.status !== 'cancelled';
                      }).slice(0, 10).map((appt) => (
                        <Card key={appt.id} className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2 text-right">
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  <Calendar className="h-4 w-4 text-purple-600" />
                                  <p className="text-sm font-semibold">
                                    {new Date(appt.at).toLocaleDateString('ar-EG', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap justify-end">
                                  {appt.patientId && (
                                    <Badge variant="outline" className="text-xs border-primary text-primary bg-primary/10">
                                      <User className="h-3 w-3 mr-1" />
                                      {getPatientName(appt.patientId)}
                                    </Badge>
                                  )}
                                  {appt.type && (
                                    <Badge variant="outline" className="text-xs">
                                      {appt.type === 'consultation' ? 'استشارة' : appt.type === 'followup' ? 'متابعة' : appt.type === 'medication_review' ? 'مراجعة دواء' : appt.type === 'examination' ? 'فحص' : 'أخرى'}
                                    </Badge>
                                  )}
                                </div>
                                {appt.note && (
                                  <p className="text-xs text-muted-foreground mt-1 text-right">{appt.note}</p>
                                )}
                              </div>
          </div>
        </CardContent>
      </Card>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="p-6 border-t flex items-center justify-end">
                <Button onClick={() => setPopupOpen(null)} className="gap-2">
                  <ChevronRight className="h-4 w-4" />
                  إغلاق
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medical Image Analysis - At the end */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8"
        ref={medicalImageAnalysisRef}
      >
        <MedicalImageAnalysis />
      </motion.div>
      </div>
    </>
  );
}
