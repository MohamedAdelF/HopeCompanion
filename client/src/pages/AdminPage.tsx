import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck, 
  Stethoscope, 
  BookOpen, 
  MessageSquare, 
  Calendar, 
  Shield, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Search,
  Filter,
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  Clock,
  Mail,
  Heart,
  Sparkles,
  BarChart3,
  FileText,
  Settings,
  Home,
  LogOut,
  X,
  Image,
  Download,
  Upload,
  Award,
  Folder,
  ChevronDown,
  ChevronUp,
  UserPlus,
  XCircle,
  Briefcase,
  User as UserIcon,
  Smile,
  Frown,
  Meh
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { collection, onSnapshot, getDocs, deleteDoc, doc, firestoreDb, updateDoc, query, where, orderBy, getDoc, setDoc, storage, ref, deleteObject } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminCharts } from "@/components/AdminCharts";
import { AdminAI } from "@/components/AdminAI";
import { AdminExportImport } from "@/components/AdminExportImport";
import { formatPhoneNumber, formatSpecialization } from "@/lib/formatUtils";

// Helper function to format dates
function formatDate(dateString: string | undefined): string {
  if (!dateString) return "غير محدد";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "غير محدد";
  }
}

interface Stats {
  totalPatients: number;
  totalDoctors: number;
  totalDiaryEntries: number;
  totalAssessments: number;
  totalMessages: number;
  totalAppointments: number;
  totalAlerts: number;
  activeAlerts: number;
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    totalDoctors: 0,
    totalDiaryEntries: 0,
    totalAssessments: 0,
    totalMessages: 0,
    totalAppointments: 0,
    totalAlerts: 0,
    activeAlerts: 0,
  });
  
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [doctorRequests, setDoctorRequests] = useState<any[]>([]);
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const [doctorCertificates, setDoctorCertificates] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "pending" | "needsInfo" | "approved" | "rejected">("all");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [requestActionDialog, setRequestActionDialog] = useState<{open: boolean, request: any | null, action: "approve" | "reject" | "needsInfo" | null}>({open: false, request: null, action: null});
  const [rejectionReason, setRejectionReason] = useState("");
  const [additionalInfoRequest, setAdditionalInfoRequest] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("overview");
  const [viewingDetails, setViewingDetails] = useState<any | null>(null);
  const [detailsType, setDetailsType] = useState<"patient" | "doctor" | "diary" | "assessment" | "message" | "appointment" | "alert" | "admin" | "file" | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, collectionName: string, id: string, storagePath?: string, title?: string}>({open: false, collectionName: "", id: ""});

  // Fetch all data
  useEffect(() => {
    const unsubPatients = onSnapshot(collection(firestoreDb, "patients"), (snap) => {
      setPatients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    const unsubDoctors = onSnapshot(collection(firestoreDb, "doctors"), (snap) => {
      setDoctors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    const unsubDiary = onSnapshot(collection(firestoreDb, "diary"), (snap) => {
      setDiaryEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    const unsubAssessments = onSnapshot(collection(firestoreDb, "assessments"), (snap) => {
      setAssessments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    const unsubMessages = onSnapshot(collection(firestoreDb, "messages"), (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    const unsubAppointments = onSnapshot(collection(firestoreDb, "appointments"), (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    const unsubAlerts = onSnapshot(collection(firestoreDb, "alerts"), (snap) => {
      setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    const unsubAdmins = onSnapshot(collection(firestoreDb, "userProfiles"), (snap) => {
      setAdmins(snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((profile: any) => profile.role === "admin"));
    });
    
    const unsubDoctorRequests = onSnapshot(
      query(collection(firestoreDb, "doctorRegistrationRequests"), orderBy("createdAt", "desc")),
      (snap) => {
        setDoctorRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        // Fallback: fetch without orderBy
        getDocs(collection(firestoreDb, "doctorRegistrationRequests")).then((snap) => {
          const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          requests.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setDoctorRequests(requests);
        });
      }
    );

    // Fetch all patient files
    const unsubPatientFiles = onSnapshot(collection(firestoreDb, "patientFiles"), (snap) => {
      const files = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort by createdAt descending
      files.sort((a: any, b: any) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate;
      });
      setPatientFiles(files);
    });

    // Fetch all doctor certificates
    const unsubDoctorCertificates = onSnapshot(collection(firestoreDb, "doctorCertificates"), (snap) => {
      const certs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort by createdAt descending
      certs.sort((a: any, b: any) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate;
      });
      setDoctorCertificates(certs);
    });

    return () => {
      unsubPatients();
      unsubDoctors();
      unsubDiary();
      unsubAssessments();
      unsubMessages();
      unsubAppointments();
      unsubAlerts();
      unsubAdmins();
      unsubDoctorRequests();
      unsubPatientFiles();
      unsubDoctorCertificates();
    };
  }, []);

  // Calculate stats
  useEffect(() => {
    setStats({
      totalPatients: patients.length,
      totalDoctors: doctors.length,
      totalDiaryEntries: diaryEntries.length,
      totalAssessments: assessments.length,
      totalMessages: messages.length,
      totalAppointments: appointments.length,
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.status === "open").length,
    });
  }, [patients, doctors, diaryEntries, assessments, messages, appointments, alerts]);

  const handleViewDetails = (item: any, type: typeof detailsType) => {
    setViewingDetails(item);
    setDetailsType(type);
  };

  const openDeleteConfirm = (collectionName: string, id: string, storagePath?: string, title?: string) => {
    setDeleteConfirm({ open: true, collectionName, id, storagePath, title });
  };

  const handleDelete = async () => {
    const { collectionName, id, storagePath } = deleteConfirm;
    try {
      // Delete from Storage if it's a file collection and storagePath is provided
      if ((collectionName === "patientFiles" || collectionName === "doctorCertificates") && storagePath) {
        try {
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
        } catch (storageError: any) {
          // If file doesn't exist in storage, continue with Firestore deletion
          console.warn("Error deleting from storage (might not exist):", storageError);
        }
      }
      
      // Delete from Firestore
      await deleteDoc(doc(firestoreDb, collectionName, id));
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف العنصر بنجاح",
        variant: "default",
      });
      setDeleteConfirm({ open: false, collectionName: "", id: "" });
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "فشل الحذف",
        description: "حدث خطأ أثناء محاولة الحذف. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى إدخال البريد الإلكتروني وكلمة المرور",
        variant: "destructive",
      });
      return;
    }
    
    if (newAdminPassword.length < 6) {
      toast({
        title: "كلمة مرور ضعيفة",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    try {
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      const cred = await createUserWithEmailAndPassword(auth, newAdminEmail, newAdminPassword);
      
      await setDoc(doc(firestoreDb, "userProfiles", cred.user.uid), {
        uid: cred.user.uid,
        role: "admin",
        email: newAdminEmail,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "تم إنشاء حساب Admin بنجاح!",
        variant: "default",
      });
      setShowAddAdmin(false);
      setNewAdminEmail("");
      setNewAdminPassword("");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        toast({
          title: "البريد الإلكتروني مستخدم",
          description: "هذا البريد الإلكتروني مستخدم بالفعل",
          variant: "destructive",
        });
      } else {
        toast({
          title: "حدث خطأ",
          description: error.message || "حدث خطأ أثناء إنشاء الحساب",
          variant: "destructive",
        });
      }
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await updateDoc(doc(firestoreDb, "alerts", id), { status: "resolved" });
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredDoctors = doctors.filter(d =>
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredDoctorRequests = doctorRequests.filter(r => {
    const matchesSearch = 
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.education?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = requestStatusFilter === "all" || r.status === requestStatusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const pendingRequests = doctorRequests.filter(r => r.status === "pending");
  const needsInfoRequests = doctorRequests.filter(r => r.status === "needsInfo");
  const approvedRequests = doctorRequests.filter(r => r.status === "approved");
  const rejectedRequests = doctorRequests.filter(r => r.status === "rejected");
  
  const toggleRequestExpand = (requestId: string) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  // Handle doctor registration request actions
  const handleRequestAction = async (requestId: string, action: "approve" | "reject" | "needsInfo", reason?: string) => {
    try {
      const requestDoc = await getDoc(doc(firestoreDb, "doctorRegistrationRequests", requestId));
      const requestData = requestDoc.data();
      if (!requestData) return;

      if (action === "approve") {
        // إنشاء حساب الطبيب من البيانات
        await setDoc(doc(firestoreDb, "doctors", requestData.uid), {
          uid: requestData.uid,
          email: requestData.email,
          name: requestData.name,
          acceptingPatients: true,
          age: requestData.age || null,
          birthDate: requestData.birthDate || null,
          education: requestData.education || "",
          specialization: requestData.specialization || null,
          experienceYears: requestData.experienceYears || null,
          phone: requestData.phone || requestData.phoneNumber || null,
          governorate: requestData.governorate || null,
          bio: requestData.bio || null,
          lastLogin: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          approvedBy: user?.uid || null,
        });

        // تحديث حالة الطلب
        await updateDoc(doc(firestoreDb, "doctorRegistrationRequests", requestId), {
          status: "approved",
          reviewedBy: user?.uid || null,
          reviewedAt: new Date().toISOString(),
        });

        // إرسال تنبيه للمريض (يمكن إضافة إشعار بريدي لاحقاً)
        toast({
          title: "تم الموافقة على الطلب",
          description: "تم الموافقة على طلب التسجيل وإنشاء حساب الطبيب",
          variant: "default",
        });
      } else if (action === "reject") {
        await updateDoc(doc(firestoreDb, "doctorRegistrationRequests", requestId), {
          status: "rejected",
          reviewedBy: user?.uid || null,
          reviewedAt: new Date().toISOString(),
          rejectionReason: reason || "لم يتم توفير سبب",
        });
        toast({
          title: "تم رفض الطلب",
          description: "تم رفض طلب التسجيل",
          variant: "destructive",
        });
      } else if (action === "needsInfo") {
        await updateDoc(doc(firestoreDb, "doctorRegistrationRequests", requestId), {
          status: "needsInfo",
          reviewedBy: user?.uid || null,
          reviewedAt: new Date().toISOString(),
          additionalInfoRequest: reason || "مطلوب معلومات إضافية",
        });
        toast({
          title: "تم طلب معلومات إضافية",
          description: "تم طلب معلومات إضافية من الطبيب",
          variant: "default",
        });
      }

      setRequestActionDialog({ open: false, request: null, action: null });
      setRejectionReason("");
      setAdditionalInfoRequest("");
    } catch (error) {
      console.error("Error handling request action:", error);
      toast({
        title: "حدث خطأ",
        description: "حدث خطأ أثناء معالجة الطلب",
        variant: "destructive",
      });
    }
  };

  const statCards = [
    {
      title: "إجمالي المرضى",
      value: stats.totalPatients,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      change: "+12%"
    },
    {
      title: "إجمالي الأطباء",
      value: stats.totalDoctors,
      icon: Stethoscope,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      change: "+5%"
    },
    {
      title: "يوميات",
      value: stats.totalDiaryEntries,
      icon: BookOpen,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      change: "+23%"
    },
    {
      title: "تقييمات المخاطر",
      value: stats.totalAssessments,
      icon: Shield,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      change: "+8%"
    },
    {
      title: "الرسائل",
      value: stats.totalMessages,
      icon: MessageSquare,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      change: "+15%"
    },
    {
      title: "المواعيد",
      value: stats.totalAppointments,
      icon: Calendar,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      change: "+20%"
    },
    {
      title: "التنبيهات النشطة",
      value: stats.activeAlerts,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      change: "-5%"
    },
    {
      title: "إجمالي التنبيهات",
      value: stats.totalAlerts,
      icon: Activity,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      change: "+10%"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Heart className="h-8 w-8 text-primary fill-primary" />
                    <div>
                      <span className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        رفيق الأمل
                      </span>
                      <span className="text-sm text-muted-foreground mr-2">- لوحة الإدارة</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-2 border-primary/30 text-primary px-3 py-1.5">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>مدير النظام</span>
              </Badge>
              <ThemeToggle />
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Home className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">الرئيسية</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Section - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <Card className="shadow-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
            <CardHeader className="relative z-10 pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3 text-right">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-primary flex-shrink-0 drop-shadow-lg" />
                    </motion.div>
                    <span className="bg-gradient-to-r from-primary via-primary/90 to-foreground bg-clip-text text-transparent">
                      لوحة تحكم الإدارة
                    </span>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-2 text-right text-muted-foreground">
                    إدارة شاملة لجميع بيانات النظام والمستخدمين
                  </CardDescription>
                </div>
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-base px-4 py-2 flex items-center gap-2 border-primary/30 bg-primary/5">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Activity className="h-4 w-4 flex-shrink-0 text-primary" />
                    </motion.div>
                    <span className="font-semibold">النظام نشط</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Stats Grid - Enhanced */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <AnimatePresence>
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden group cursor-pointer bg-gradient-to-br from-background via-background to-primary/5 hover:from-primary/5 hover:via-primary/10 hover:to-primary/15 backdrop-blur-sm hover:scale-[1.02] hover:-translate-y-1">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="text-right flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 truncate">
                            {stat.title}
                          </p>
                          <p className="text-3xl sm:text-4xl font-extrabold leading-tight bg-gradient-to-r from-primary via-primary/80 to-foreground bg-clip-text text-transparent mb-1">{stat.value}</p>
                          <div className="flex items-center gap-1 justify-end">
                            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-bold">{stat.change}</span>
                          </div>
                        </div>
                        <div className={`p-3 sm:p-4 rounded-xl ${stat.bgColor} mr-2 sm:mr-4 flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-2xl`}>
                          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Main Content Tabs - Redesigned */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          {/* Navigation Bar - Horizontal Scroll */}
          <Card className="shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/10 backdrop-blur-sm">
            <CardContent className="p-0">
              <div 
                className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide" 
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  scrollBehavior: 'smooth',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
                }} 
                dir="ltr"
              >
                <div className="flex items-center gap-1 p-3 min-w-max scroll-smooth" dir="rtl" style={{ direction: 'rtl', scrollSnapType: 'x mandatory' }}>
                  <TabsList className="inline-flex h-auto bg-transparent p-0 gap-2 flex-nowrap">
                    <TabsTrigger 
                      value="overview" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-primary/40 hover:bg-primary/10 hover:scale-105 border-2 border-transparent data-[state=active]:border-primary/50 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-primary/10 group-data-[state=active]:bg-white/20 transition-all">
                        <Activity className="h-5 w-5 text-primary group-data-[state=active]:text-white group-data-[state=active]:animate-pulse" />
                      </div>
                      <span className="font-bold text-xs text-center">نظرة عامة</span>
                      {selectedTab === "overview" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="alerts" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-red-500/40 hover:bg-red-50 dark:hover:bg-red-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-red-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="relative p-2 rounded-xl bg-red-100 dark:bg-red-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 group-data-[state=active]:text-white" />
                        {alerts.filter(a => a.status === "open").length > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] bg-red-500 text-white border-2 border-background animate-pulse shadow-lg">
                            {alerts.filter(a => a.status === "open").length}
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold text-xs">التنبيهات</span>
                      {selectedTab === "alerts" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="doctorRequests" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-blue-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="relative p-2 rounded-xl bg-blue-100 dark:bg-blue-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 group-data-[state=active]:text-white" />
                        {pendingRequests.length > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] bg-blue-500 text-white border-2 border-background animate-pulse shadow-lg">
                            {pendingRequests.length}
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold text-xs text-center leading-tight">طلبات<br/>التسجيل</span>
                      {selectedTab === "doctorRequests" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="messages" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-pink-500/40 hover:bg-pink-50 dark:hover:bg-pink-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-pink-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <MessageSquare className="h-5 w-5 text-pink-600 dark:text-pink-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">الرسائل</span>
                      {selectedTab === "messages" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="assessments" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-orange-500/40 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-orange-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">التقييمات</span>
                      {selectedTab === "assessments" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="diary" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-purple-500/40 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-purple-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">اليوميات</span>
                      {selectedTab === "diary" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="doctors" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-emerald-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <Stethoscope className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">الأطباء</span>
                      {selectedTab === "doctors" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="patients" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-cyan-500/40 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-cyan-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">المرضى</span>
                      {selectedTab === "patients" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="admins" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-indigo-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <Settings className="h-5 w-5 text-indigo-600 dark:text-indigo-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">المدراء</span>
                      {selectedTab === "admins" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="files" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-amber-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <Folder className="h-5 w-5 text-amber-600 dark:text-amber-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">الملفات</span>
                      {selectedTab === "files" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="analytics" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-violet-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">التحليلات</span>
                      {selectedTab === "analytics" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="ai" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-rose-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <Sparkles className="h-5 w-5 text-rose-600 dark:text-rose-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs">الذكاء<br/>الاصطناعي</span>
                      {selectedTab === "ai" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="export" 
                      className="group relative flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-teal-500/40 hover:bg-teal-50 dark:hover:bg-teal-950/20 hover:scale-105 border-2 border-transparent data-[state=active]:border-teal-300 min-w-[100px] scroll-snap-align-start flex-shrink-0"
                    >
                      <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/30 group-data-[state=active]:bg-white/20 transition-all">
                        <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400 group-data-[state=active]:text-white" />
                      </div>
                      <span className="font-bold text-xs text-center leading-tight">تصدير/<br/>استيراد</span>
                      {selectedTab === "export" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 mx-auto w-10 h-1 bg-white rounded-full"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 bg-gradient-to-br from-primary/5 via-background to-primary/10 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Activity className="h-5 w-5 text-primary flex-shrink-0" />
                    </div>
                    <span>إجراءات سريعة</span>
                  </CardTitle>
                  <CardDescription className="text-right">الوصول السريع إلى الأقسام الرئيسية</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[
                      { icon: Users, label: "المرضى", tab: "patients", color: "text-blue-500" },
                      { icon: Stethoscope, label: "الأطباء", tab: "doctors", color: "text-green-500" },
                      { icon: AlertTriangle, label: "التنبيهات", tab: "alerts", color: "text-red-500" },
                      { icon: BarChart3, label: "التحليلات", tab: "analytics", color: "text-purple-500" },
                      { icon: FileText, label: "تصدير", tab: "export", color: "text-orange-500" },
                    ].map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <motion.div
                          key={action.tab}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                        >
                          <Button
                            variant="outline"
                            className="flex flex-col items-center gap-2 h-24 w-full hover:bg-gradient-to-br hover:from-primary/10 hover:to-primary/20 hover:border-primary/50 hover:shadow-md transition-all group"
                            onClick={() => setSelectedTab(action.tab)}
                          >
                            <div className={`p-2 rounded-lg bg-background group-hover:bg-primary/10 transition-all ${action.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium">{action.label}</span>
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-2 shadow-lg hover:shadow-xl transition-all">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Users className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    </div>
                    <span>آخر المرضى المسجلين</span>
                    <Badge variant="outline">{Math.min(patients.length, 5)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-72">
                    <div className="p-4 space-y-3">
                      {patients.slice(0, 5).map((patient, idx) => (
                        <motion.div
                          key={patient.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1, duration: 0.2 }}
                          whileHover={{ scale: 1.01, x: -4 }}
                          className="flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-background to-muted/30 hover:from-blue-50/50 hover:to-primary/10 hover:border-primary/50 transition-all cursor-pointer group"
                        >
                          <Badge variant={patient.riskLevel === "مرتفع" ? "destructive" : "default"} className="flex-shrink-0">
                            {patient.riskLevel || "غير محدد"}
                          </Badge>
                          <div className="text-right flex-1">
                            <p className="font-semibold text-base">{patient.name || "بدون اسم"}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {patient.email || "بدون بريد"}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      {patients.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          لا يوجد مرضى مسجلين
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200 dark:border-red-900 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-red-50/30 to-red-100/10 dark:from-red-950/20 dark:to-red-900/10">
                <CardHeader className="bg-gradient-to-r from-red-500/10 to-red-500/5 border-b border-red-200 dark:border-red-900">
                  <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    </div>
                    <span>التنبيهات النشطة</span>
                    <Badge variant="destructive">{Math.min(alerts.filter(a => a.status === "open").length, 5)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-72">
                    <div className="p-4 space-y-3">
                      {alerts.filter(a => a.status === "open").slice(0, 5).map((alert, idx) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1, duration: 0.2 }}
                          whileHover={{ scale: 1.01, x: -4 }}
                          className="flex items-center gap-4 p-4 rounded-xl border-2 border-red-200 dark:border-red-900 bg-gradient-to-r from-red-50/50 to-red-100/30 dark:from-red-950/30 dark:to-red-900/20 hover:from-red-100 hover:to-red-200/50 hover:border-red-300 dark:hover:border-red-700 transition-all cursor-pointer group"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveAlert(alert.id)}
                            className="flex-shrink-0 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </Button>
                          <div className="text-right flex-1">
                            <p className="font-semibold text-base">{alert.type || "تنبيه"}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {alert.patientId ? getPatientName(alert.patientId) : "غير محدد"}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      {alerts.filter(a => a.status === "open").length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          لا توجد تنبيهات نشطة
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <BarChart3 className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  </div>
                  <span>التحليلات والرسوم البيانية</span>
                </CardTitle>
                <CardDescription className="text-right">
                  تحليل شامل لجميع بيانات النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminCharts
                  data={{
                    patients,
                    doctors,
                    assessments,
                    diaryEntries,
                    appointments,
                    alerts,
                    messages,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-4">
            <AdminAI
              stats={stats}
              patients={patients}
              assessments={assessments}
              alerts={alerts}
            />
          </TabsContent>

          {/* Export/Import Tab */}
          <TabsContent value="export" className="space-y-4">
            <AdminExportImport
              patients={patients}
              doctors={doctors}
              diaryEntries={diaryEntries}
              assessments={assessments}
              messages={messages}
              appointments={appointments}
              alerts={alerts}
              admins={admins}
            />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Patient Files */}
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    </div>
                    <span>ملفات المريضات ({patientFiles.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3 pr-2">
                      {patientFiles.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground">لا توجد ملفات مرفوعة</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {patientFiles.map((file) => (
                            <motion.div
                              key={file.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="border-2 rounded-xl p-4 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/30 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0 text-right">
                                  <div className="flex items-center gap-2 mb-2 justify-end">
                                    <h4 className="font-semibold text-sm truncate">{file.fileName}</h4>
                                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                      {file.mimeType?.startsWith('image/') ? (
                                        <Image className="h-4 w-4 text-primary" />
                                      ) : (
                                        <FileText className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {file.fileType === 'medication' ? 'صورة دواء' :
                                       file.fileType === 'prescription' ? 'وصفة طبية' :
                                       file.fileType === 'xray' ? 'أشعة/تحليل' :
                                       file.fileType === 'report' ? 'تقرير طبي' : 'أخرى'}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {getPatientName(file.patientId)}
                                    </Badge>
                                  </div>
                                  {file.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{file.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>
                                      {new Date(file.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {file.size && (
                                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setViewingFile(file.downloadURL)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = file.downloadURL;
                                      link.download = file.fileName;
                                      link.click();
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete("patientFiles", file.id, file.storagePath)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Doctor Certificates */}
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Award className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    </div>
                    <span>شهادات الأطباء ({doctorCertificates.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3 pr-2">
                      {doctorCertificates.length === 0 ? (
                        <div className="text-center py-12">
                          <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground">لا توجد شهادات مرفوعة</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {doctorCertificates.map((cert) => (
                            <motion.div
                              key={cert.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="border-2 rounded-xl p-4 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/30 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0 text-right">
                                  <div className="flex items-center gap-2 mb-2 flex-row-reverse" dir="rtl">
                                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                      {cert.mimeType?.startsWith('image/') ? (
                                        <Image className="h-4 w-4 text-primary" />
                                      ) : (
                                        <FileText className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                    <h4 className="font-semibold text-sm truncate text-right">
                                      {cert.title || (cert.certType === "academic" ? "شهادة أكاديمية" : cert.certType === "course" ? "شهادة كورس" : "شهادة أخرى")}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {cert.certType === 'academic' ? 'أكاديمية' :
                                       cert.certType === 'course' ? 'كورس/تدريب' : 'أخرى'}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {getDoctorName(cert.doctorId)}
                                    </Badge>
                                  </div>
                                  {cert.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{cert.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>
                                      {new Date(cert.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {cert.size && (
                                      <span>{(cert.size / 1024 / 1024).toFixed(2)} MB</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setViewingFile(cert.downloadURL)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = cert.downloadURL;
                                      link.download = cert.fileName;
                                      link.click();
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete("doctorCertificates", cert.id, cert.storagePath)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 flex-row-reverse flex-1 text-right">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Settings className="h-5 w-5 text-primary flex-shrink-0" />
                    </div>
                    <span>قائمة المدراء ({admins.length})</span>
                  </CardTitle>
                  <div className="flex-shrink-0">
                    <Button onClick={() => setShowAddAdmin(true)} className="flex items-center gap-2 shadow-md hover:shadow-lg">
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      <span>إضافة مدير جديد</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showAddAdmin && (
                  <Card className="mb-4 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg text-right">إضافة مدير جديد</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-right">
                        <label className="text-sm font-medium mb-2 block">البريد الإلكتروني</label>
                        <Input
                          type="email"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="admin@example.com"
                          className="text-right"
                          dir="ltr"
                        />
                      </div>
                      <div className="text-right">
                        <label className="text-sm font-medium mb-2 block">كلمة المرور (6 أحرف على الأقل)</label>
                        <Input
                          type="password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="كلمة المرور"
                          className="text-right"
                        />
                      </div>
                      <div className="flex gap-2 justify-start">
                        <Button onClick={handleAddAdmin} className="flex items-center gap-2">
                          <Settings className="h-4 w-4 flex-shrink-0" />
                          <span>إنشاء حساب</span>
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setShowAddAdmin(false);
                          setNewAdminEmail("");
                          setNewAdminPassword("");
                        }}>
                          إلغاء
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {admins.map((admin) => (
                      <motion.div
                        key={admin.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          whileHover={{ scale: 1.01, x: -4 }}
                        className="border-2 rounded-xl p-5 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/30 hover:from-primary/5 hover:via-primary/10 hover:to-primary/15 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(admin, "admin")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {admin.uid !== user?.uid && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDeleteConfirm("userProfiles", admin.id, undefined, "حذف المدير")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-3 mb-2 justify-end">
                              <h3 className="font-semibold text-lg">{admin.email || "بدون بريد"}</h3>
                              <Badge variant="default" className="bg-primary flex items-center gap-1.5">
                                <Settings className="h-3 w-3 flex-shrink-0" />
                                <span>مدير</span>
                              </Badge>
                              {admin.uid === user?.uid && (
                                <Badge variant="outline" className="text-xs">
                                  حسابك الحالي
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1 text-right">
                              <div>
                                <span className="font-medium">UID:</span> {admin.uid || "غير متوفر"}
                              </div>
                              <div>
                                <span className="font-medium">تاريخ الإنشاء:</span> {formatDate(admin.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {admins.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        لا يوجد مدراء مسجلين
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-primary/5 border-b">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 flex-row-reverse flex-1 text-right">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Users className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    </div>
                    <span>قائمة المرضى ({filteredPatients.length})</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث عن مريض..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 pl-10 border-2 focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-2">
                    {filteredPatients.map((patient) => (
                      <motion.div
                        key={patient.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          whileHover={{ scale: 1.01, x: -4 }}
                        className="border-2 rounded-xl p-5 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/30 hover:from-primary/5 hover:via-primary/10 hover:to-primary/15 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(patient, "patient")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete("patients", patient.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-3 mb-2 justify-end">
                              <h3 className="font-semibold text-lg">{patient.name || "بدون اسم"}</h3>
                              <Badge variant={patient.riskLevel === "مرتفع" ? "destructive" : "default"}>
                                {patient.riskLevel || "غير محدد"}
                              </Badge>
                              <Badge variant="outline">{patient.status || "متابعة"}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground text-right">
                              <div>
                                <span className="font-medium">البريد الإلكتروني:</span> <span className="text-foreground">{patient.email || "غير متوفر"}</span>
                              </div>
                              <div>
                                <span className="font-medium">العمر:</span> <span className="text-foreground">{patient.age || "غير محدد"}</span>
                              </div>
                              <div>
                                <span className="font-medium">الهاتف:</span> <span className="text-foreground">{formatPhoneNumber(patient.phone)}</span>
                              </div>
                              <div>
                                <span className="font-medium">الطبيب المعين:</span> <span className="text-foreground">{patient.assignedDoctor ? getDoctorName(patient.assignedDoctor) : "غير معين"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Doctors Tab */}
          <TabsContent value="doctors" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-primary/5 border-b">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 flex-row-reverse flex-1 text-right">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Stethoscope className="h-5 w-5 text-green-500 flex-shrink-0" />
                    </div>
                    <span>قائمة الأطباء ({filteredDoctors.length})</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث عن طبيب..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 pl-10 border-2 focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-2">
                    {filteredDoctors.map((doctor) => (
                      <motion.div
                        key={doctor.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          whileHover={{ scale: 1.01, x: -4 }}
                        className="border-2 rounded-xl p-5 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/30 hover:from-primary/5 hover:via-primary/10 hover:to-primary/15 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(doctor, "doctor")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete("doctors", doctor.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-3 mb-2 justify-end">
                              <h3 className="font-semibold text-lg">{doctor.name || "بدون اسم"}</h3>
                              <Badge variant={doctor.acceptingPatients ? "default" : "secondary"}>
                                {doctor.acceptingPatients ? "يقبل مرضى جدد" : "ممتلئ"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground text-right">
                              <div>
                                <span className="font-medium">البريد الإلكتروني:</span> <span className="text-foreground">{doctor.email || "غير متوفر"}</span>
                              </div>
                              <div>
                                <span className="font-medium">التخصص:</span> <span className="text-foreground">{formatSpecialization(doctor.specialization)}</span>
                              </div>
                              <div>
                                <span className="font-medium">سنوات الخبرة:</span> <span className="text-foreground">{doctor.experienceYears || "غير محدد"}</span>
                              </div>
                              <div>
                                <span className="font-medium">التعليم:</span> <span className="text-foreground">{doctor.education || "غير متوفر"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diary Tab */}
          <TabsContent value="diary" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <BookOpen className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  </div>
                  <span>جميع اليوميات ({diaryEntries.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-2">
                    {diaryEntries.map((entry) => {
                      const patient = entry.patientId ? patients.find(p => p.id === entry.patientId) : null;
                      const patientName = patient?.name || entry.authorName || "غير معروف";
                      const getMoodIcon = (mood: string) => {
                        if (mood?.includes("سعيد") || mood?.includes("سعيدة") || mood?.includes("فرح")) return Smile;
                        if (mood?.includes("حزين") || mood?.includes("حزينة") || mood?.includes("حزن")) return Frown;
                        return Meh;
                      };
                      const getMoodColor = (mood: string) => {
                        if (mood?.includes("سعيد") || mood?.includes("سعيدة") || mood?.includes("فرح")) return "from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-900/30 border-green-300 text-green-800 dark:text-green-300";
                        if (mood?.includes("حزين") || mood?.includes("حزينة") || mood?.includes("حزن")) return "from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 border-blue-300 text-blue-800 dark:text-blue-300";
                        return "from-yellow-50 to-yellow-100/50 dark:from-yellow-950/40 dark:to-yellow-900/30 border-yellow-300 text-yellow-800 dark:text-yellow-300";
                      };
                      const MoodIcon = entry.mood ? getMoodIcon(entry.mood) : Meh;
                      
                      return (
                      <motion.div
                        key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        className="border-2 rounded-xl p-5 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/30 hover:from-primary/5 hover:via-primary/10 hover:to-primary/15 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 flex-wrap flex-row-reverse">
                          {/* 4. زر الحذف (آخراً - على اليسار) */}
                          <motion.div
                            className="flex-shrink-0"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50/80 dark:hover:bg-red-950/30 rounded-full transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete("diary", entry.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                          {/* 3. الحالة/المزاج (ثالثاً) */}
                          {entry.mood && (
                            <Badge className={`bg-gradient-to-r ${getMoodColor(entry.mood)} text-xs gap-1.5 px-4 py-2 font-semibold shadow-sm transition-all duration-200`}>
                              <MoodIcon className="h-4 w-4" />
                              <span className="font-medium">{entry.mood}</span>
                            </Badge>
                          )}
                          {/* 2. التاريخ (ثانياً) */}
                          <div className="flex items-center gap-2 bg-gradient-to-r from-muted/60 to-muted/40 px-4 py-2 rounded-full border border-border/50 shadow-sm">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                              {new Date(entry.createdAt || entry.date || new Date()).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground mx-1">•</span>
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.createdAt || entry.date || new Date()).toLocaleTimeString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                          {/* 1. الاسم (أولاً - على اليمين) */}
                          <div className="flex items-center gap-2.5 text-sm px-4 py-2 rounded-full transition-all duration-200 bg-muted/40 hover:bg-muted/60 border border-border/50">
                            <span className="relative flex shrink-0 overflow-hidden rounded-full h-8 w-8 border-2 border-primary/30 shadow-sm after:content-[''] after:block after:absolute after:inset-0 after:rounded-full after:pointer-events-none after:border after:border-black/10 dark:after:border-white/10">
                              <span className="flex h-full w-full items-center justify-center rounded-full bg-muted bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-xs">
                                {patientName.charAt(0) || "؟"}
                              </span>
                            </span>
                            <span className="font-semibold text-foreground">{patientName}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-sm leading-relaxed text-right line-clamp-3">{entry.content}</p>
                        </div>
                      </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500/10 to-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Shield className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  </div>
                  <span>جميع التقييمات ({assessments.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-2">
                    {assessments.map((assessment) => (
                      <motion.div
                        key={assessment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        className="border-2 rounded-xl p-5 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/30 hover:from-primary/5 hover:via-primary/10 hover:to-primary/15 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(assessment, "assessment")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete("assessments", assessment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-2 mb-2 justify-end">
                              <Badge variant={
                                assessment.level === "مرتفع" ? "destructive" :
                                assessment.level === "متوسط" ? "default" : "secondary"
                              }>
                                {assessment.level || "غير محدد"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                النقاط: {assessment.score || 0}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(assessment.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground text-right">
                              المريض: {assessment.patientId ? getPatientName(assessment.patientId) : "غير معروف"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Doctor Registration Requests Tab */}
          <TabsContent value="doctorRequests" className="space-y-4">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 hover:shadow-xl transition-all duration-300 cursor-pointer group" dir="rtl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                        <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">إجمالي الطلبات</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{doctorRequests.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <Card className="border-2 border-yellow-200 dark:border-yellow-900 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 hover:shadow-xl transition-all duration-300 cursor-pointer group" dir="rtl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="p-3 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                        <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">قيد المراجعة</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingRequests.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <Card className="border-2 border-blue-300 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 hover:shadow-xl transition-all duration-300 cursor-pointer group" dir="rtl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                        <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">مطلوب معلومات</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{needsInfoRequests.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <Card className="border-2 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 hover:shadow-xl transition-all duration-300 cursor-pointer group" dir="rtl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="p-3 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">موافق عليها</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedRequests.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <Card className="border-2 border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 hover:shadow-xl transition-all duration-300 cursor-pointer group" dir="rtl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="p-3 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                        <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">مرفوضة</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedRequests.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Main Card */}
            <Card className="border-2 border-blue-200 dark:border-blue-900 shadow-xl bg-gradient-to-br from-blue-50/30 to-blue-100/20 dark:from-blue-950/20 dark:to-blue-900/10 hover:shadow-2xl transition-shadow" dir="rtl">
              <CardHeader className="bg-gradient-to-r from-blue-500/15 to-blue-500/8 border-b border-blue-200 dark:border-blue-900 pb-4">
                <CardTitle className="flex items-center gap-3 text-right flex-wrap">
                  <motion.div 
                    className="p-2.5 rounded-xl bg-blue-500/15 shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xl sm:text-2xl font-bold">طلبات تسجيل الأطباء</span>
                    <Badge variant="outline" className="ml-2 text-sm px-2 py-1">
                      {filteredDoctorRequests.length} من {doctorRequests.length} طلب
                    </Badge>
                  </div>
                  {pendingRequests.length > 0 && (
                    <Badge className="bg-red-500 text-white text-sm px-3 py-1.5 animate-pulse shadow-lg">
                      {pendingRequests.length} قيد المراجعة
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-right text-sm sm:text-base mt-2">
                  مراجعة والموافقة على طلبات تسجيل الأطباء الجدد
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="ابحث بالاسم، البريد الإلكتروني، التخصص، أو التعليم..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 text-right"
                      dir="rtl"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b justify-end" dir="rtl">
                  <motion.button
                    onClick={() => setRequestStatusFilter("all")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm ${
                      requestStatusFilter === "all"
                        ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md scale-105"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Filter className={`h-4 w-4 ${requestStatusFilter === "all" ? "" : "text-gray-500"}`} />
                    <span>الكل</span>
                    <Badge 
                      variant={requestStatusFilter === "all" ? "secondary" : "outline"}
                      className={`${requestStatusFilter === "all" ? "bg-blue-400/30 text-white" : ""} text-xs font-bold px-2 py-0.5`}
                    >
                      {doctorRequests.length}
                    </Badge>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setRequestStatusFilter("pending")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm ${
                      requestStatusFilter === "pending"
                        ? "bg-yellow-500 text-white hover:bg-yellow-600 shadow-md scale-105"
                        : "bg-white dark:bg-gray-800 text-yellow-700 dark:text-yellow-400 border-2 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Clock className={`h-4 w-4 ${requestStatusFilter === "pending" ? "" : "text-yellow-600"}`} />
                    <span>قيد المراجعة</span>
                    <Badge 
                      variant={requestStatusFilter === "pending" ? "secondary" : "outline"}
                      className={`${requestStatusFilter === "pending" ? "bg-yellow-400/30 text-white" : "border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400"} text-xs font-bold px-2 py-0.5`}
                    >
                      {pendingRequests.length}
                    </Badge>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setRequestStatusFilter("needsInfo")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm ${
                      requestStatusFilter === "needsInfo"
                        ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md scale-105"
                        : "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Mail className={`h-4 w-4 ${requestStatusFilter === "needsInfo" ? "" : "text-blue-600"}`} />
                    <span>مطلوب معلومات</span>
                    <Badge 
                      variant={requestStatusFilter === "needsInfo" ? "secondary" : "outline"}
                      className={`${requestStatusFilter === "needsInfo" ? "bg-blue-400/30 text-white" : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400"} text-xs font-bold px-2 py-0.5`}
                    >
                      {needsInfoRequests.length}
                    </Badge>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setRequestStatusFilter("approved")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm ${
                      requestStatusFilter === "approved"
                        ? "bg-green-500 text-white hover:bg-green-600 shadow-md scale-105"
                        : "bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CheckCircle className={`h-4 w-4 ${requestStatusFilter === "approved" ? "" : "text-green-600"}`} />
                    <span>موافق عليها</span>
                    <Badge 
                      variant={requestStatusFilter === "approved" ? "secondary" : "outline"}
                      className={`${requestStatusFilter === "approved" ? "bg-green-400/30 text-white" : "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"} text-xs font-bold px-2 py-0.5`}
                    >
                      {approvedRequests.length}
                    </Badge>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setRequestStatusFilter("rejected")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm ${
                      requestStatusFilter === "rejected"
                        ? "bg-red-500 text-white hover:bg-red-600 shadow-md scale-105"
                        : "bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 border-2 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Ban className={`h-4 w-4 ${requestStatusFilter === "rejected" ? "" : "text-red-600"}`} />
                    <span>مرفوضة</span>
                    <Badge 
                      variant={requestStatusFilter === "rejected" ? "secondary" : "outline"}
                      className={`${requestStatusFilter === "rejected" ? "bg-red-400/30 text-white" : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"} text-xs font-bold px-2 py-0.5`}
                    >
                      {rejectedRequests.length}
                    </Badge>
                  </motion.button>
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-2">
                    {filteredDoctorRequests.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <UserCheck className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium mb-2">
                          {searchQuery || requestStatusFilter !== "all" 
                            ? "لا توجد طلبات مطابقة للمعايير" 
                            : "لا توجد طلبات تسجيل"}
                        </p>
                        {(searchQuery || requestStatusFilter !== "all") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              setRequestStatusFilter("all");
                            }}
                            className="mt-2"
                          >
                            إعادة تعيين الفلاتر
                          </Button>
                        )}
                      </motion.div>
                    ) : (
                      filteredDoctorRequests.map((request) => {
                        const isExpanded = expandedRequests.has(request.id);
                        const statusColor = 
                          request.status === "pending" ? "bg-yellow-500" :
                          request.status === "approved" ? "bg-green-500" :
                          request.status === "rejected" ? "bg-red-500" :
                          "bg-blue-500";
                        const statusText = 
                          request.status === "pending" ? "قيد المراجعة" :
                          request.status === "approved" ? "موافق عليه" :
                          request.status === "rejected" ? "مرفوض" :
                          "مطلوب معلومات";
                        const doctorCerts = doctorCertificates.filter((cert: any) => cert.doctorId === request.uid);
                        const hasCerts = doctorCerts.length > 0;

                        return (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            whileHover={{ scale: 1.005, y: -2 }}
                            className={`border-2 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 ${
                              request.status === "pending" ? "border-yellow-300 bg-gradient-to-br from-yellow-50/90 to-yellow-100/50 dark:from-yellow-950/40 dark:to-yellow-900/30 hover:border-yellow-400 shadow-yellow-200/50 dark:shadow-yellow-900/20" :
                              request.status === "approved" ? "border-green-300 bg-gradient-to-br from-green-50/90 to-green-100/50 dark:from-green-950/40 dark:to-green-900/30 hover:border-green-400 shadow-green-200/50 dark:shadow-green-900/20" :
                              request.status === "rejected" ? "border-red-300 bg-gradient-to-br from-red-50/90 to-red-100/50 dark:from-red-950/40 dark:to-red-900/30 hover:border-red-400 shadow-red-200/50 dark:shadow-red-900/20" :
                              "border-blue-300 bg-gradient-to-br from-blue-50/90 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 hover:border-blue-400 shadow-blue-200/50 dark:shadow-blue-900/20"
                            }`}
                          >
                            {/* Header - Always Visible */}
                            <div className="p-4 sm:p-5 border-b border-current/20 bg-gradient-to-r from-background/50 to-transparent">
                              <div className="flex items-start gap-4 flex-row-reverse">
                                {/* Action Buttons - Right Side (بجانب زر الحذف) */}
                                {(request.status === "pending" || request.status === "needsInfo") && (
                                  <div className="flex flex-col gap-2 flex-shrink-0">
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button
                                        size="sm"
                                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all font-semibold"
                                        onClick={() => setRequestActionDialog({ open: true, request, action: "approve" })}
                                        title="الموافقة على الطلب"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1.5" />
                                        <span className="hidden sm:inline">موافقة</span>
                                      </Button>
                                    </motion.div>
                                    {request.status === "pending" && (
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/20 hover:border-blue-600 transition-all font-semibold"
                                          onClick={() => setRequestActionDialog({ open: true, request, action: "needsInfo" })}
                                          title="طلب معلومات إضافية"
                                        >
                                          <Mail className="h-4 w-4 mr-1.5" />
                                          <span className="hidden sm:inline">طلب معلومات</span>
                                        </Button>
                                      </motion.div>
                                    )}
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all font-semibold"
                                        onClick={() => setRequestActionDialog({ open: true, request, action: "reject" })}
                                        title="رفض الطلب"
                                      >
                                        <Ban className="h-4 w-4 mr-1.5" />
                                        <span className="hidden sm:inline">رفض</span>
                                      </Button>
                                    </motion.div>
                                  </div>
                                )}

                                {/* Delete Button - Right Side */}
                                <motion.div 
                                  className="flex-shrink-0"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/20 hover:border-red-400 transition-all"
                                    onClick={() => openDeleteConfirm("doctorRegistrationRequests", request.id, undefined, `حذف طلب ${request.name || request.email}`)}
                                    title="حذف الطلب"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">حذف</span>
                                  </Button>
                                </motion.div>

                                {/* Content - Center with RTL */}
                                <div className="flex-1 space-y-2.5 min-w-0" dir="rtl">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-bold text-lg sm:text-xl truncate text-foreground">{request.name || "—"}</span>
                                    <Badge className={`${statusColor} text-white text-xs sm:text-sm px-2.5 py-1.5 flex-shrink-0 shadow-sm font-semibold`}>
                                      {statusText}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 flex-wrap text-sm">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="whitespace-nowrap">{formatDate(request.createdAt)}</span>
                                    </div>
                                    <span className="text-muted-foreground">•</span>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Mail className="h-3.5 w-3.5" />
                                      <span className="break-all">{request.email}</span>
                                    </div>
                                  </div>
                                  {request.specialization && (
                                    <div>
                                      <Badge variant="outline" className="text-xs border-primary/20 bg-primary/5">
                                        <span className="font-medium">{formatSpecialization(request.specialization)}</span>
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expandable Content */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 sm:p-5 space-y-4 border-t border-current/10 bg-gradient-to-br from-background/80 to-muted/10" dir="rtl">
                                    {/* Detailed Information Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {request.education && (
                                        <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-muted/50 hover:border-primary/30 transition-colors">
                                          <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-primary/10 rounded">
                                              <BookOpen className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">التعليم</span>
                                          </div>
                                          <p className="font-medium text-sm break-words text-right pr-2">{request.education}</p>
                                        </div>
                                      )}
                                      {request.experienceYears && (
                                        <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-muted/50 hover:border-primary/30 transition-colors">
                                          <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-primary/10 rounded">
                                              <Briefcase className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">سنوات الخبرة</span>
                                          </div>
                                          <p className="font-medium text-sm text-right pr-2">{request.experienceYears} سنة</p>
                                        </div>
                                      )}
                                      {request.age && (
                                        <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-muted/50 hover:border-primary/30 transition-colors">
                                          <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-primary/10 rounded">
                                              <UserIcon className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">العمر</span>
                                          </div>
                                          <p className="font-medium text-sm text-right pr-2">{request.age} سنة</p>
                                        </div>
                                      )}
                                      {request.birthDate && (
                                        <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-muted/50 hover:border-primary/30 transition-colors">
                                          <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-primary/10 rounded">
                                              <Calendar className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تاريخ الميلاد</span>
                                          </div>
                                          <p className="font-medium text-sm text-right pr-2">{new Date(request.birthDate).toLocaleDateString('ar-SA')}</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Alerts for rejection/info requests */}
                                    {request.rejectionReason && (
                                      <Alert variant="destructive" dir="rtl" className="text-right">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>سبب الرفض</AlertTitle>
                                        <AlertDescription className="text-right break-words">{request.rejectionReason}</AlertDescription>
                                      </Alert>
                                    )}
                                    {request.additionalInfoRequest && (
                                      <Alert dir="rtl" className="text-right border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
                                        <Mail className="h-4 w-4" />
                                        <AlertTitle>معلومات مطلوبة</AlertTitle>
                                        <AlertDescription className="text-right break-words">{request.additionalInfoRequest}</AlertDescription>
                                      </Alert>
                                    )}

                                    {/* Certificates Section */}
                                    {hasCerts && (
                                      <div className="pt-4 border-t space-y-3">
                                        <div className="flex items-center gap-2 flex-row-reverse text-right" dir="rtl">
                                          <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
                                            <Award className="h-4 w-4 text-primary" />
                                          </div>
                                          <div className="flex items-center gap-2 flex-row-reverse">
                                            <span className="font-semibold text-sm">الشهادات المرفوعة</span>
                                            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 flex-shrink-0">{doctorCerts.length}</Badge>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          {doctorCerts.map((cert: any) => (
                                            <motion.div
                                              key={cert.id}
                                              whileHover={{ scale: 1.02, y: -2 }}
                                              transition={{ duration: 0.2 }}
                                            >
                                              <Card className="p-4 border-2 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-background to-muted/20 group cursor-pointer" dir="rtl">
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0 space-y-2.5 text-right">
                                                    <div className="flex items-center gap-2 flex-row-reverse">
                                                      <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                                        {cert.mimeType?.startsWith('image/') ? (
                                                          <Image className="h-3.5 w-3.5 text-primary" />
                                                        ) : (
                                                          <FileText className="h-3.5 w-3.5 text-primary" />
                                                        )}
                                                      </div>
                                                      <h4 className="font-semibold text-sm truncate">
                                                        {cert.title || (cert.certType === "academic" ? "شهادة أكاديمية" : cert.certType === "course" ? "شهادة كورس" : "شهادة أخرى")}
                                                      </h4>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <Badge variant="outline" className="text-xs border-primary/20 bg-primary/5">
                                                        {cert.certType === 'academic' ? 'أكاديمية' :
                                                         cert.certType === 'course' ? 'كورس/تدريب' : 'أخرى'}
                                                      </Badge>
                                                      {cert.createdAt && (
                                                        <span className="text-xs text-muted-foreground">
                                                          {new Date(cert.createdAt).toLocaleDateString('ar-SA', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                          })}
                                                        </span>
                                                      )}
                                                    </div>
                                                    {cert.description && (
                                                      <p className="text-xs text-muted-foreground line-clamp-2 break-words">{cert.description}</p>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary/30"
                                                        onClick={() => setViewingFile(cert.downloadURL)}
                                                        title="عرض"
                                                      >
                                                        <Eye className="h-3.5 w-3.5" />
                                                      </Button>
                                                    </motion.div>
                                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary/30"
                                                        onClick={() => {
                                                          const link = document.createElement('a');
                                                          link.href = cert.downloadURL;
                                                          link.download = cert.fileName;
                                                          link.click();
                                                        }}
                                                        title="تحميل"
                                                      >
                                                        <Download className="h-3.5 w-3.5" />
                                                      </Button>
                                                    </motion.div>
                                                  </div>
                                                </div>
                                              </Card>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Review Info */}
                                    {request.reviewedAt && (
                                      <div className="pt-3 border-t text-xs text-muted-foreground text-right">
                                        <span>تم المراجعة في: {formatDate(request.reviewedAt)}</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Expand/Collapse Button */}
                            <div className="p-3 border-t border-current/10 bg-current/5" dir="rtl">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground hover:text-foreground"
                                onClick={() => toggleRequestExpand(request.id)}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                    إخفاء التفاصيل
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    عرض التفاصيل
                                    {(hasCerts || request.education || request.experienceYears) && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {(hasCerts ? 1 : 0) + (request.education ? 1 : 0) + (request.experienceYears ? 1 : 0)} عناصر
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pink-500/10 to-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <MessageSquare className="h-5 w-5 text-pink-500 flex-shrink-0" />
                  </div>
                  <span>جميع الرسائل ({messages.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-2">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        className="border-2 rounded-xl p-5 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-background via-background to-muted/30 hover:from-primary/5 hover:via-primary/10 hover:to-primary/15 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(message, "message")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete("messages", message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-2 mb-2 justify-end">
                              <Badge variant={message.from === "patient" ? "default" : "secondary"}>
                                {message.from === "patient" ? "من مريض" : "من طبيب"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(message.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-right">{message.text?.substring(0, 150)}...</p>
                            <p className="text-xs text-muted-foreground mt-2 text-right">
                              المريض: {message.patientId ? getPatientName(message.patientId) : "غير معروف"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card className="border-2 border-red-200 dark:border-red-900 shadow-lg bg-gradient-to-br from-red-50/20 to-red-100/10 dark:from-red-950/10 dark:to-red-900/5">
              <CardHeader className="bg-gradient-to-r from-red-500/10 to-red-500/5 border-b border-red-200 dark:border-red-900">
                <CardTitle className="flex items-center gap-2 flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  </div>
                  <span>جميع التنبيهات ({alerts.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-2">
                    {alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                          alert.status === "open" ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {alert.status === "open" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolveAlert(alert.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete("alerts", alert.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-2 mb-2 justify-end">
                              <Badge variant={alert.status === "open" ? "destructive" : "default"}>
                                {alert.status === "open" ? "نشط" : "مُحلّ"}
                              </Badge>
                              <Badge variant="outline">{alert.type || "تنبيه"}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(alert.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-right">{alert.message || "لا يوجد وصف"}</p>
                            <p className="text-xs text-muted-foreground mt-2 text-right">
                              المريض: {alert.patientId ? getPatientName(alert.patientId) : "غير معروف"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Details Dialog */}
        <Dialog open={!!viewingDetails} onOpenChange={() => setViewingDetails(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-right">
                {detailsType === "patient" && <Users className="h-5 w-5" />}
                {detailsType === "doctor" && <Stethoscope className="h-5 w-5" />}
                {detailsType === "diary" && <BookOpen className="h-5 w-5" />}
                {detailsType === "assessment" && <Shield className="h-5 w-5" />}
                {detailsType === "message" && <MessageSquare className="h-5 w-5" />}
                تفاصيل
              </DialogTitle>
              <DialogDescription className="text-right">
                معلومات مفصلة عن العنصر المحدد
              </DialogDescription>
            </DialogHeader>
            {viewingDetails && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-4" dir="rtl">
                  {detailsType === "patient" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-right">
                      <div className="md:col-span-2 text-right">
                        <span className="font-medium text-muted-foreground">الاسم:</span>
                        <p className="mt-1 font-semibold text-lg">{viewingDetails.name || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">البريد الإلكتروني:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.email || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">الهاتف:</span>
                        <p className="mt-1 text-foreground">{formatPhoneNumber(viewingDetails.phone)}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">العمر:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.age || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">الحالة:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.status || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">مستوى الخطر:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.riskLevel || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">الأولوية:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.priority || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">الطبيب المعين:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.assignedDoctor ? getDoctorName(viewingDetails.assignedDoctor) : "غير معين"}</p>
                      </div>
                      {viewingDetails.address && (
                        <div className="md:col-span-2 text-right">
                          <span className="font-medium text-muted-foreground">العنوان:</span>
                          <p className="mt-1 text-foreground">{viewingDetails.address}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {detailsType === "doctor" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-right">
                      <div className="md:col-span-2 text-right">
                        <span className="font-medium text-muted-foreground">الاسم:</span>
                        <p className="mt-1 font-semibold text-lg">{viewingDetails.name || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">البريد الإلكتروني:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.email || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">التخصص:</span>
                        <p className="mt-1 text-foreground">{formatSpecialization(viewingDetails.specialization)}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">التعليم:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.education || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">سنوات الخبرة:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.experienceYears || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-muted-foreground">يقبل مرضى جدد:</span>
                        <p className="mt-1 text-foreground">{viewingDetails.acceptingPatients ? "نعم" : "لا"}</p>
                      </div>
                    </div>
                  )}
                  {detailsType !== "patient" && detailsType !== "doctor" && (
                    <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(viewingDetails, null, 2)}
                    </pre>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* Request Action Dialog */}
        <Dialog open={requestActionDialog.open} onOpenChange={(open) => !open && setRequestActionDialog({ open: false, request: null, action: null })}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">
                {requestActionDialog.action === "approve" && "موافقة على طلب التسجيل"}
                {requestActionDialog.action === "reject" && "رفض طلب التسجيل"}
                {requestActionDialog.action === "needsInfo" && "طلب معلومات إضافية"}
              </DialogTitle>
              <DialogDescription className="text-right">
                {requestActionDialog.action === "approve" && "هل أنت متأكد من الموافقة على طلب التسجيل وإنشاء حساب الطبيب؟"}
                {requestActionDialog.action === "reject" && "يرجى إدخال سبب الرفض (اختياري):"}
                {requestActionDialog.action === "needsInfo" && "يرجى إدخال المعلومات المطلوبة من الطبيب:"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {requestActionDialog.request && (
                <div className="p-3 bg-muted rounded-lg text-right">
                  <p className="font-semibold">{requestActionDialog.request.name}</p>
                  <p className="text-sm text-muted-foreground">{requestActionDialog.request.email}</p>
                </div>
              )}
              {requestActionDialog.action === "reject" && (
                <div className="text-right">
                  <label className="text-sm font-medium mb-2 block">سبب الرفض</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 border rounded-lg text-right"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="مثال: المعلومات المقدمة غير كافية أو غير صحيحة..."
                    dir="rtl"
                  />
                </div>
              )}
              {requestActionDialog.action === "needsInfo" && (
                <div className="text-right">
                  <label className="text-sm font-medium mb-2 block">المعلومات المطلوبة</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 border rounded-lg text-right"
                    value={additionalInfoRequest}
                    onChange={(e) => setAdditionalInfoRequest(e.target.value)}
                    placeholder="مثال: يرجى إرسال صورة من شهادة التخصص أو رقم الرخصة الطبية..."
                    dir="rtl"
                  />
                </div>
              )}
              <div className="flex gap-2 justify-start">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRequestActionDialog({ open: false, request: null, action: null });
                    setRejectionReason("");
                    setAdditionalInfoRequest("");
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  className={
                    requestActionDialog.action === "approve" ? "bg-green-500 hover:bg-green-600" :
                    requestActionDialog.action === "reject" ? "bg-red-500 hover:bg-red-600" :
                    "bg-blue-500 hover:bg-blue-600"
                  }
                  onClick={() => {
                    if (requestActionDialog.request && requestActionDialog.action) {
                      const reason = requestActionDialog.action === "reject" ? rejectionReason : 
                                   requestActionDialog.action === "needsInfo" ? additionalInfoRequest : undefined;
                      handleRequestAction(requestActionDialog.request.id, requestActionDialog.action, reason);
                    }
                  }}
                >
                  {requestActionDialog.action === "approve" && "✓ موافقة"}
                  {requestActionDialog.action === "reject" && "✗ رفض"}
                  {requestActionDialog.action === "needsInfo" && "📧 إرسال"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View File Dialog */}
        <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl text-right">عرض الملف</DialogTitle>
              <DialogDescription className="text-right">
                معاينة محتوى الملف
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {viewingFile?.startsWith('data:image') || viewingFile?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img
                  src={viewingFile}
                  alt="الملف"
                  className="max-w-full h-auto rounded-lg border shadow-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                  <a
                    href={viewingFile || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    <FileText className="h-6 w-6" />
                    <span>فتح الملف في نافذة جديدة</span>
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, collectionName: "", id: "" })}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteConfirm.title ? (
                  <span>هل أنت متأكد من {deleteConfirm.title}؟</span>
                ) : (
                  <span>هل أنت متأكد من حذف هذا العنصر؟</span>
                )}
                <br />
                <span className="text-red-600 font-semibold mt-2 block">هذا الإجراء لا يمكن التراجع عنه.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );

  // Helper functions
  function getPatientName(patientId: string): string {
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || "مريض غير معروف";
  }

  function getDoctorName(doctorUid: string): string {
    const doctor = doctors.find(d => d.uid === doctorUid || d.id === doctorUid);
    return doctor?.name || "طبيب غير معروف";
  }
}

