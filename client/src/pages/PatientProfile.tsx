import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { firestoreDb, collection, query, where, getDocs, doc, updateDoc, onSnapshot, orderBy, limit, addDoc, writeBatch, deleteDoc, auth, storage, ref, uploadBytes, getDownloadURL, deleteObject } from "@/lib/firebase";
import { deleteUser } from "@/lib/firebase";
import { Calendar, Bell, MessageSquareText, Stethoscope, User, NotebookPen, Shield, Edit, Save, CheckCircle2, AlertCircle, Mail, Phone, MapPin, Sparkles, ArrowLeft, Clock, Send, Plus, Trash2, AlertTriangle, Upload, FileText, Image, X, Download, FileImage, FileType } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { formatPhoneNumber } from "@/lib/formatUtils";

export default function PatientProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", assignedDoctor: "", priority: "متوسط", birthDate: "" });
  const [patientAge, setPatientAge] = useState<number | null>(null);

  // حساب العمر من تاريخ الميلاد
  const calculateAge = (birthDateString: string): number | null => {
    if (!birthDateString) return null;
    const birth = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };
  const [alerts, setAlerts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctorName, setDoctorName] = useState<string>("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [lastAssessment, setLastAssessment] = useState<{ date: Date; level: string; score: number } | null>(null);
  const [, navigate] = useLocation();
  
  // Patient Files State
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");
  const [fileType, setFileType] = useState<"medication" | "prescription" | "xray" | "report" | "other">("other");

  const loadPatientData = async () => {
    if (!user) return;
    const snap = await getDocs(query(collection(firestoreDb, "patients"), where("uid", "==", user.uid)));
    const d = snap.docs[0];
    if (d) {
      const data = d.data() as any;
      const currentPatientId = d.id;
      setPatientId(currentPatientId);
      const birthDate = data.birthDate || "";
      setForm({
        name: data.name ?? "",
        phone: formatPhoneNumber(data.phone),
        email: data.email ?? user.email ?? "",
        address: data.address ?? "",
        assignedDoctor: data.assignedDoctor ?? "",
        priority: data.priority ?? "متوسط",
        birthDate: birthDate,
      });
      // حساب العمر
      if (birthDate) {
        setPatientAge(calculateAge(birthDate));
      } else if (data.age) {
        setPatientAge(data.age);
      } else {
        setPatientAge(null);
      }
      if (data.assignedDoctor) {
        try {
          const dr = await getDocs(query(collection(firestoreDb, "doctors"), where("uid", "==", data.assignedDoctor)));
          const docDr = dr.docs[0]?.data() as any;
          setDoctorName(docDr?.name || data.assignedDoctor);
        } catch {}
      } else {
        setDoctorName("");
      }
      
      // جلب آخر تقييم عند تحميل البيانات الأولية
      try {
        const assessSnap = await getDocs(query(collection(firestoreDb, "assessments"), where("patientId", "==", currentPatientId)));
        if (!assessSnap.empty) {
          // Sort client-side by createdAt descending
          const sorted = assessSnap.docs.sort((a: any, b: any) => {
            const aDate = new Date((a.data() as any).createdAt || 0).getTime();
            const bDate = new Date((b.data() as any).createdAt || 0).getTime();
            return bDate - aDate;
          });
          const assessData = sorted[0].data() as any;
          setLastAssessment({
            date: new Date(assessData.createdAt),
            level: assessData.level || "غير محدد",
            score: assessData.score || 0
          });
        } else {
          setLastAssessment(null);
        }
      } catch (error) {
        console.error("Error fetching last assessment:", error);
        setLastAssessment(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPatientData();
  }, [user]);

  // جلب آخر تقييم بشكل تلقائي باستخدام onSnapshot للتحديث الفوري
  useEffect(() => {
    if (!patientId) return;
    
    // دالة مساعدة لجلب آخر تقييم بدون orderBy (fallback)
    const fetchLastAssessment = async () => {
      try {
        let allSnap;
        try {
          allSnap = await getDocs(query(collection(firestoreDb, "assessments"), where("patientId", "==", patientId)));
        } catch (error: any) {
          const allAssessments = await getDocs(collection(firestoreDb, "assessments"));
          const filtered = allAssessments.docs.filter(d => (d.data() as any).patientId === patientId);
          allSnap = { docs: filtered } as any;
        }
        
        if (allSnap.docs.length > 0) {
          const sorted = allSnap.docs.sort((a: any, b: any) => {
            const aDate = new Date((a.data() as any).createdAt || 0).getTime();
            const bDate = new Date((b.data() as any).createdAt || 0).getTime();
            return bDate - aDate;
          });
          const assessData = sorted[0].data() as any;
          setLastAssessment({
            date: new Date(assessData.createdAt),
            level: assessData.level || "غير محدد",
            score: assessData.score || 0
          });
        } else {
          setLastAssessment(null);
        }
      } catch (error: any) {
        console.error("Error fetching assessments:", error);
        try {
          const allAssessments = await getDocs(collection(firestoreDb, "assessments"));
          const patientAssessments = allAssessments.docs
            .map(d => ({ id: d.id, ...(d.data() as any) }))
            .filter((a: any) => a.patientId === patientId)
            .sort((a: any, b: any) => {
              const aDate = new Date(a.createdAt || 0).getTime();
              const bDate = new Date(b.createdAt || 0).getTime();
              return bDate - aDate;
            });
          
          if (patientAssessments.length > 0) {
            const latest = patientAssessments[0];
            setLastAssessment({
              date: new Date(latest.createdAt),
              level: latest.level || "غير محدد",
              score: latest.score || 0
            });
          } else {
            setLastAssessment(null);
          }
        } catch (finalError) {
          console.error("Error with final assessment fetch:", finalError);
          setLastAssessment(null);
        }
      }
    };
    
    let unsub: (() => void) | null = null;
    
    try {
      unsub = onSnapshot(
        query(collection(firestoreDb, "assessments"), where("patientId", "==", patientId)),
        (snap) => {
          if (!snap.empty) {
            const sorted = snap.docs.sort((a: any, b: any) => {
              const aDate = new Date((a.data() as any).createdAt || 0).getTime();
              const bDate = new Date((b.data() as any).createdAt || 0).getTime();
              return bDate - aDate;
            });
            const assessData = sorted[0].data() as any;
            setLastAssessment({
              date: new Date(assessData.createdAt),
              level: assessData.level || "غير محدد",
              score: assessData.score || 0
            });
          } else {
            setLastAssessment(null);
          }
        },
        (error) => {
          console.error("Error in assessment snapshot:", error);
          fetchLastAssessment();
        }
      );
    } catch (error) {
      console.error("Error setting up assessment snapshot:", error);
      fetchLastAssessment();
    }
    
    fetchLastAssessment();
    
    return () => {
      if (unsub) unsub();
    };
  }, [patientId]);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(firestoreDb, "doctors"));
      setDoctors(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    })();
  }, []);

  const save = async () => {
    if (!patientId) return;
    setSaveLoading(true);
    try {
      // لا نحفظ assignedDoctor و priority - فقط الطبيب يمكنه تعديلها
      const { assignedDoctor, priority, birthDate, phone, ...editableFields } = form;
      const calculatedAge = birthDate ? calculateAge(birthDate) : null;
      // تنسيق رقم الهاتف قبل الحفظ
      const formattedPhone = formatPhoneNumber(phone);
      const updateData: any = {
        ...editableFields,
        phone: formattedPhone,
        birthDate: birthDate || null,
        age: calculatedAge || null,
      };
      await updateDoc(doc(firestoreDb, "patients", patientId), updateData);
      if (birthDate) {
        setPatientAge(calculateAge(birthDate));
      }
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (!patientId) return;
    // Fetch alerts without orderBy, sort client-side
    const unsubA = onSnapshot(
      query(collection(firestoreDb, "alerts"), where("patientId", "==", patientId)),
      (snap) => {
        const alerts = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort by createdAt descending
        alerts.sort((a: any, b: any) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setAlerts(alerts);
      },
      (error) => {
        console.error("Error fetching alerts:", error);
      }
    );
    // Fetch messages without orderBy, sort client-side
    const unsubM = onSnapshot(
      query(collection(firestoreDb, "messages"), where("patientId", "==", patientId)),
      (snap) => {
        const messages = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort by createdAt descending
        messages.sort((a: any, b: any) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setMessages(messages);
      },
      (error) => {
        console.error("Error fetching messages:", error);
      }
    );
    // Fetch appointments without orderBy, sort client-side
    const unsubAp = onSnapshot(
      query(collection(firestoreDb, "appointments"), where("patientId", "==", patientId)),
      (snap) => {
        const appointments = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort by at ascending
        appointments.sort((a: any, b: any) => {
          const aDate = new Date(a.at || 0).getTime();
          const bDate = new Date(b.at || 0).getTime();
          return aDate - bDate;
        });
        setAppointments(appointments);
      },
      (error) => {
        console.error("Error fetching appointments:", error);
      }
    );
    return () => { unsubA(); unsubM(); unsubAp(); };
  }, [patientId]);

  // Fetch patient files
  useEffect(() => {
    if (!patientId) return;
    const unsub = onSnapshot(
      query(collection(firestoreDb, "patientFiles"), where("patientId", "==", patientId)),
      (snap) => {
        const files = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort by createdAt descending
        files.sort((a: any, b: any) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setPatientFiles(files);
      },
      (error) => {
        console.error("Error fetching patient files:", error);
      }
    );
    return () => unsub();
  }, [patientId]);

  // Upload file handler - tries server first, falls back to direct upload
  const handleUploadFile = async () => {
    if (!selectedFile || !patientId || !user) return;
    
    // تأكد من أن المستخدم مصادق عليه
    if (!auth.currentUser) {
      alert("يرجى تسجيل الدخول أولاً");
      return;
    }
    
    setUploadingFile(true);
    try {
      // Try server upload first
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("patientId", patientId);
        formData.append("fileType", fileType);
        formData.append("description", fileDescription || '');
        formData.append("uploadedBy", user.uid);
        
        const response = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.downloadURL) {
            // Server upload successful
            await addDoc(collection(firestoreDb, "patientFiles"), {
              patientId,
              fileName: result.fileName || selectedFile.name,
              fileType,
              description: fileDescription,
              downloadURL: result.downloadURL,
              storagePath: result.storagePath,
              size: result.size || selectedFile.size,
              mimeType: result.mimeType || selectedFile.type,
              createdAt: new Date().toISOString(),
              uploadedBy: user.uid,
            });
            
            setSelectedFile(null);
            setFileDescription("");
            setFileType("other");
            setUploadDialogOpen(false);
            return; // Success, exit
          }
        }
      } catch (serverError: any) {
        console.warn("Server upload failed, trying direct upload:", serverError);
        // Fall through to direct upload
      }
      
      // Fallback: Direct upload using Firebase SDK (may have CORS issues)
      console.log("Attempting direct upload to Firebase Storage...");
      const timestamp = Date.now();
      const fileName = `${patientId}/${timestamp}_${selectedFile.name}`;
      const fileRef = ref(storage, `patientFiles/${fileName}`);
      
      const metadata = {
        contentType: selectedFile.type || 'application/octet-stream',
        customMetadata: {
          uploadedBy: user.uid,
          patientId: patientId,
          fileType: fileType,
          description: fileDescription || '',
        }
      };
      
      await uploadBytes(fileRef, selectedFile, metadata);
      const downloadURL = await getDownloadURL(fileRef);
      
      // Save file metadata to Firestore
      await addDoc(collection(firestoreDb, "patientFiles"), {
        patientId,
        fileName: selectedFile.name,
        fileType,
        description: fileDescription,
        downloadURL,
        storagePath: `patientFiles/${fileName}`,
        size: selectedFile.size,
        mimeType: selectedFile.type,
        createdAt: new Date().toISOString(),
        uploadedBy: user.uid,
      });
      
      // Reset form
      setSelectedFile(null);
      setFileDescription("");
      setFileType("other");
      setUploadDialogOpen(false);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      let errorMessage = "حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.";
      if (error?.code === 'storage/unauthorized') {
        errorMessage = "ليس لديك صلاحية لرفع الملف. تأكد من نشر Storage Rules في Firebase Console.";
      } else if (error?.code === 'storage/canceled') {
        errorMessage = "تم إلغاء عملية الرفع.";
      } else if (error?.code === 'storage/unknown' || error?.message?.includes('CORS') || error?.message?.includes('cors')) {
        errorMessage = "⚠️ خطأ CORS: يرجى تطبيق إعدادات CORS في Firebase Storage Console. راجع ملف CORS_SETUP.md للتعليمات.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete file handler
  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    if (!confirm("هل أنت متأكدة من حذف هذا الملف؟")) return;
    
    try {
      // Delete from Storage
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
      
      // Delete from Firestore
      await deleteDoc(doc(firestoreDb, "patientFiles", fileId));
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("حدث خطأ أثناء حذف الملف. يرجى المحاولة مرة أخرى.");
    }
  };

  if (loading) return null;

  const priorityColors: Record<string, string> = {
    "منخفض": "bg-emerald-100 text-emerald-800",
    "متوسط": "bg-amber-100 text-amber-800",
    "مرتفع": "bg-red-100 text-red-800",
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
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
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    الملف الشخصي
                  </CardTitle>
                  <CardDescription className="font-body text-lg mt-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    إدارة معلوماتك الشخصية ومتابعة حالتك الصحية
                  </CardDescription>
                </div>
              </div>
              {form.priority && (
                <Badge 
                  className={`text-base px-4 py-2 ${
                    priorityColors[form.priority] || ""
                  }`}
                >
                  أولوية: {form.priority}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        <Link href="/risk-assessment">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="lg" className="h-12 px-6 border-2 hover:border-primary/50 transition-all">
              <Shield className="ml-2 h-5 w-5" />
              تقييم المخاطر
            </Button>
          </motion.div>
        </Link>
        <Link href="/diary">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="lg" className="h-12 px-6 border-2 hover:border-primary/50 transition-all">
              <NotebookPen className="ml-2 h-5 w-5" />
              اليوميات
            </Button>
          </motion.div>
        </Link>
        <Link href="/appointments">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="lg" className="h-12 px-6 border-2 hover:border-primary/50 transition-all">
              <Calendar className="ml-2 h-5 w-5" />
              المواعيد
            </Button>
          </motion.div>
        </Link>
        <Link href="/education">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="lg" className="h-12 px-6 border-2 hover:border-primary/50 transition-all">
              <Sparkles className="ml-2 h-5 w-5" />
              مكتبة التوعية
            </Button>
          </motion.div>
        </Link>
      </motion.div>

      {/* Profile Form - Compact Design */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl font-bold">المعلومات الشخصية</CardTitle>
              </div>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  تعديل
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsEditing(false);
                      await loadPatientData();
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={saveLoading}
                    className="gap-2 bg-gradient-to-r from-primary to-primary/90"
                  >
                    {saveLoading ? (
                      <>
                        <Clock className="h-3 w-3 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3" />
                        حفظ
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <AnimatePresence>
              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4"
                >
                  <div className="p-2.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">تم حفظ التعديلات بنجاح!</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Name */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  الاسم الكامل
                </Label>
                {isEditing ? (
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 text-sm border-2 focus:border-primary/50"
                    placeholder="أدخلي اسمك الكامل"
                  />
                ) : (
                  <div className="h-10 px-3 flex items-center text-sm bg-muted/50 rounded-md border-2 border-transparent">
                    {form.name || <span className="text-muted-foreground">غير محدد</span>}
                  </div>
                )}
              </div>
              
              {/* Phone */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  رقم الهاتف
                </Label>
                {isEditing ? (
                  <Input
                    value={form.phone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\s+/g, "");
                      setForm({ ...form, phone: value });
                    }}
                    onBlur={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setForm({ ...form, phone: formatted });
                    }}
                    className="h-10 text-sm border-2 focus:border-primary/50"
                    placeholder="+966570811788"
                  />
                ) : (
                  <div className="h-10 px-3 flex items-center text-sm bg-muted/50 rounded-md border-2 border-transparent">
                    {form.phone || <span className="text-muted-foreground">غير محدد</span>}
                  </div>
                )}
              </div>
              
              {/* Email */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  البريد الإلكتروني
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-10 text-sm border-2 focus:border-primary/50"
                    placeholder="example@email.com"
                  />
                ) : (
                  <div className="h-10 px-3 flex items-center text-sm bg-muted/50 rounded-md border-2 border-transparent">
                    {form.email || <span className="text-muted-foreground">غير محدد</span>}
                  </div>
                )}
              </div>
              
              {/* Address */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  العنوان
                </Label>
                {isEditing ? (
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="h-10 text-sm border-2 focus:border-primary/50"
                    placeholder="العنوان الكامل"
                  />
                ) : (
                  <div className="h-10 px-3 flex items-center text-sm bg-muted/50 rounded-md border-2 border-transparent">
                    {form.address || <span className="text-muted-foreground">غير محدد</span>}
                  </div>
                )}
              </div>
              
              {/* Birth Date */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  تاريخ الميلاد {patientAge !== null && <span className="text-primary font-semibold">({patientAge} سنة)</span>}
                </Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => {
                      setForm({ ...form, birthDate: e.target.value });
                      if (e.target.value) {
                        setPatientAge(calculateAge(e.target.value));
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className="h-10 text-sm border-2 focus:border-primary/50"
                  />
                ) : (
                  <div className="h-10 px-3 flex items-center text-sm bg-muted/50 rounded-md border-2 border-transparent">
                    {form.birthDate ? new Date(form.birthDate).toLocaleDateString('ar-EG') : <span className="text-muted-foreground">غير محدد</span>}
                  </div>
                )}
              </div>
              
              {/* Doctor */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" />
                  الطبيب المتابع
                </Label>
                <div className="h-10 px-3 flex items-center text-sm bg-muted/50 rounded-md border-2 border-transparent">
                  {doctorName ? (
                    <span className="font-medium">{doctorName}</span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      غير محدد
                    </span>
                  )}
                </div>
              </div>
              
              {/* Priority - Compact Badge Only */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-primary" />
                  الأولوية
                </Label>
                <div className="h-10 px-3 flex items-center">
                  <Badge 
                    className={`text-xs ${
                      form.priority === "منخفض" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                      form.priority === "متوسط" ? "bg-amber-100 text-amber-800 border-amber-300" :
                      "bg-red-100 text-red-800 border-red-300"
                    }`}
                  >
                    {form.priority}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Patient Files Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <FileImage className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">ملفاتي الطبية</CardTitle>
                  <CardDescription className="mt-1">
                    رفعي ملفاتك الطبية (أدوية، وصفات، أشعة، تقارير) لتكون متاحة لطبيبك
                  </CardDescription>
                </div>
              </div>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="gap-2 bg-gradient-to-r from-primary to-primary/90">
                      <Upload className="h-4 w-4" />
                      رفع ملف
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-xl">رفع ملف طبي</DialogTitle>
                    <DialogDescription>
                      اختر ملفاً (صورة أو PDF) واختر نوعه
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="file-upload">الملف</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              alert("حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت.");
                              return;
                            }
                            setSelectedFile(file);
                          }
                        }}
                        className="mt-2 h-11"
                        required
                      />
                      {selectedFile && (
                        <p className="text-xs text-muted-foreground mt-1">
                          الملف المختار: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="file-type">نوع الملف</Label>
                      <Select value={fileType} onValueChange={(value: any) => setFileType(value)}>
                        <SelectTrigger id="file-type" className="mt-2 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medication">صورة دواء</SelectItem>
                          <SelectItem value="prescription">وصفة طبية</SelectItem>
                          <SelectItem value="xray">أشعة/تحليل</SelectItem>
                          <SelectItem value="report">تقرير طبي</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="file-description">وصف (اختياري)</Label>
                      <Textarea
                        id="file-description"
                        placeholder="أضيفي وصفاً مختصراً للملف..."
                        value={fileDescription}
                        onChange={(e) => setFileDescription(e.target.value)}
                        className="mt-2 min-h-24"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setUploadDialogOpen(false);
                      setSelectedFile(null);
                      setFileDescription("");
                      setFileType("other");
                    }}>
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleUploadFile}
                      disabled={!selectedFile || uploadingFile}
                      className="bg-gradient-to-r from-primary to-primary/90"
                    >
                      {uploadingFile ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin ml-2" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 ml-2" />
                          رفع
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {patientFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileImage className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg mb-2">لا توجد ملفات مرفوعة بعد</p>
                <p className="text-sm text-muted-foreground">
                  ارفعي ملفاتك الطبية لتكون متاحة لطبيبك
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {patientFiles.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
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
                                <p className="text-xs text-muted-foreground line-clamp-2">{file.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(file.createdAt).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-2"
                              onClick={() => window.open(file.downloadURL, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                              تحميل
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteFile(file.id, file.storagePath)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Last Assessment Card */}
      {lastAssessment && (() => {
        const assessment = lastAssessment; // نسخ محلي لتجنب مشاكل TypeScript
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="shadow-lg border-2 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">آخر تقييم مخاطر</CardTitle>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={
                      assessment.level === "منخفض" 
                        ? "text-green-700 border-green-300 bg-green-50 dark:bg-green-950/30"
                        : assessment.level === "متوسط"
                        ? "text-yellow-700 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30"
                        : "text-red-700 border-red-300 bg-red-50 dark:bg-red-950/30"
                    }
                  >
                    {assessment.level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">تاريخ آخر تقييم</p>
                    <p className="text-lg font-bold">{assessment.date.toLocaleDateString('ar-EG', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">النتيجة</p>
                    <p className="text-lg font-bold">{assessment.score} من 15</p>
                  </div>
                </div>
                {(() => {
                  const diffDays = Math.floor((Date.now() - assessment.date.getTime()) / (1000 * 60 * 60 * 24));
                  const daysRemaining = Math.max(0, 30 - diffDays);
                  const canAssess = diffDays >= 30;
                  
                  return (
                    <Alert className={canAssess ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"}>
                      <AlertCircle className={`h-4 w-4 ${canAssess ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`} />
                      <AlertTitle className={canAssess ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}>
                        {canAssess ? "يمكنك إجراء تقييم جديد" : "التقييم متاح مرة شهرياً"}
                      </AlertTitle>
                      <AlertDescription className={canAssess ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                        {canAssess 
                          ? "يمكنك الآن إجراء تقييم جديد للتحقق من حالتك الصحية الحالية."
                          : `يمكنك إجراء تقييم جديد بعد ${daysRemaining} يوم.`}
                      </AlertDescription>
                    </Alert>
                  );
                })()}
                <Link href="/risk-assessment">
                  <Button className="w-full h-12 bg-gradient-to-r from-primary to-primary/90">
                    <Shield className="ml-2 h-5 w-5" />
                    {(() => {
                      const diffDays = Math.floor((Date.now() - assessment.date.getTime()) / (1000 * 60 * 60 * 24));
                      return diffDays >= 30 ? "إجراء تقييم جديد" : "عرض تفاصيل التقييم";
                    })()}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {!lastAssessment && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="shadow-lg border-2 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold">تقييم المخاطر</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-700 dark:text-blue-300">لم يتم إجراء تقييم بعد</AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-400">
                  يُنصح بإجراء تقييم المخاطر لتحديد مستوى الخطر والحصول على توصيات مخصصة.
                </AlertDescription>
              </Alert>
              <Link href="/risk-assessment">
                <Button className="w-full h-12 mt-4 bg-gradient-to-r from-primary to-primary/90">
                  <Shield className="ml-2 h-5 w-5" />
                  إجراء التقييم الآن
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-lg border-2 h-full bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20 dark:to-background">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl font-bold">المواعيد</CardTitle>
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  {appointments.filter(a => new Date(a.at) >= new Date()).length} قادمة
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد مواعيد</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {appointments.slice(0, 5).map((a, index) => {
                    const date = new Date(a.at);
                    const isPast = date < new Date();
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: -4 }}
                      >
                        <Card className={`shadow-sm border ${
                          isPast ? "opacity-60" : "border-blue-200 dark:border-blue-800"
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              {!isPast && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-300 flex-shrink-0">
                                  قادم
                                </Badge>
                              )}
                              <div className="flex-1 text-right">
                                <div className="flex items-center gap-2 mb-2 justify-end">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-semibold">
                                    {date.toLocaleDateString("ar-EG", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {date.toLocaleTimeString("ar-EG", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {a.note && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 text-right">{a.note}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                  {appointments.length > 5 && (
                    <Link href="/appointments">
                      <Button variant="ghost" className="w-full mt-2" size="sm">
                        عرض الكل
                        <ArrowLeft className="mr-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg border-2 h-full bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/20 dark:to-background">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-950/30 rounded-lg">
                    <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-xl font-bold">التنبيهات</CardTitle>
                </div>
                {alerts.filter(a => a.status === 'open').length > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-red-300">
                    {alerts.filter(a => a.status === 'open').length} جديدة
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد تنبيهات</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {alerts.slice(0, 5).map((al, index) => (
                    <motion.div
                      key={al.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: -4 }}
                    >
                      <Card className={`shadow-sm border ${
                        al.status === 'open' 
                          ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20" 
                          : "opacity-60"
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {al.status === 'open' ? (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                                <p className="text-sm font-semibold">{al.message}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(al.createdAt).toLocaleDateString("ar-EG", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={al.status === 'open' 
                                ? "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30" 
                                : "border-green-300 text-green-700"
                              }
                            >
                              {al.status === 'open' ? 'مفتوح' : 'مغلق'}
                            </Badge>
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

        {/* Messages Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg border-2 h-full bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20 dark:to-background">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-950/30 rounded-lg">
                    <MessageSquareText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-xl font-bold">الرسائل</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {messages.filter(m => m.status === 'unread').length > 0 && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                      {messages.filter(m => m.status === 'unread').length} غير مقروءة
                    </Badge>
                  )}
                  {form.assignedDoctor && (
                    <Button
                      size="sm"
                      onClick={() => setSendMessageOpen(true)}
                      className="gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    >
                      <Plus className="h-4 w-4" />
                      رسالة جديدة
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquareText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">لا توجد رسائل</p>
                  {form.assignedDoctor ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSendMessageOpen(true)}
                      className="gap-2 mt-2"
                    >
                      <Plus className="h-4 w-4" />
                      إرسال رسالة للطبيب
                    </Button>
                  ) : (
                    <p className="text-xs">حددي طبيب أولاً لإرسال رسائل</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {messages.map((m, index) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: m.from === 'doctor' ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: m.from === 'doctor' ? -4 : 4 }}
                    >
                      <Card className={`shadow-sm border ${
                        m.status === 'unread' 
                          ? "border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20" 
                          : ""
                      } ${m.from === 'doctor' ? 'border-r-4 border-r-blue-500' : 'border-l-4 border-l-purple-500'}`}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  m.from === 'doctor' 
                                    ? 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/20' 
                                    : 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/20'
                                }`}
                              >
                                {m.type === 'assessment' ? 'تقييم' : m.from === 'doctor' ? 'من الطبيب' : 'منك'}
                              </Badge>
                              {m.status === 'unread' && m.from === 'doctor' && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                  جديد
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(m.createdAt).toLocaleDateString("ar-EG", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
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

      {/* Warning Alert */}
      {form.assignedDoctor && doctors.find(d => d.uid === form.assignedDoctor)?.acceptingPatients === false && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>تنبيه</AlertTitle>
            <AlertDescription>
              الطبيب المحدد مكتفى حالياً وغير متاح لاستقبال مرضى جدد.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Send Message Dialog */}
      <Dialog open={sendMessageOpen} onOpenChange={setSendMessageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              إرسال رسالة للطبيب
            </DialogTitle>
            <DialogDescription>
              أرسلي رسالتك للطبيب {doctorName || "المتابع"}
            </DialogDescription>
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
            <Button 
              variant="outline" 
              onClick={() => {
                setSendMessageOpen(false);
                setMessageText("");
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={async () => {
                if (!patientId || !messageText.trim() || !form.assignedDoctor) return;
                setSendingMessage(true);
                try {
                  await addDoc(collection(firestoreDb, "messages"), {
                    patientId,
                    text: messageText,
                    status: "unread",
                    createdAt: new Date().toISOString(),
                    from: "patient",
                  });
                  setSendMessageOpen(false);
                  setMessageText("");
                } catch (error) {
                  console.error("Error sending message:", error);
                  alert("حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.");
                } finally {
                  setSendingMessage(false);
                }
              }}
              disabled={sendingMessage || !messageText.trim() || !form.assignedDoctor}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2"
            >
              {sendingMessage ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="shadow-lg border-2 border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl font-bold text-red-700 dark:text-red-400">
                  المنطقة الخطرة
                </CardTitle>
                <CardDescription className="text-red-600 dark:text-red-400 mt-1">
                  حذف الحساب نهائياً سيؤدي إلى حذف جميع البيانات المرتبطة به
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AlertDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="lg"
                  className="gap-2 w-full sm:w-auto"
                >
                  <Trash2 className="h-5 w-5" />
                  حذف الحساب نهائياً
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    تأكيد حذف الحساب
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-base mt-3 space-y-2">
                      <p className="font-semibold">هذا الإجراء لا يمكن التراجع عنه!</p>
                      <p>سيتم حذف:</p>
                      <ul className="list-disc list-inside space-y-1 mr-4 text-sm">
                        <li>جميع بياناتك الشخصية</li>
                        <li>جميع منشورات اليوميات والتعليقات</li>
                        <li>جميع التقييمات والمواعيد</li>
                        <li>جميع الرسائل والتنبيهات</li>
                        <li>الحساب من Firebase Authentication</li>
                      </ul>
                      <p className="text-red-600 font-semibold mt-4">هل أنت متأكدة تماماً؟</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (!user || !patientId) return;
                      setDeletingAccount(true);
                      try {
                        const batch = writeBatch(firestoreDb);

                        // حذف جميع اليوميات للمريض (by patientId) أو للمستخدم (by authorUid)
                        const diarySnap = await getDocs(query(collection(firestoreDb, "diary"), where("patientId", "==", patientId)));
                        diarySnap.forEach(d => batch.delete(doc(firestoreDb, "diary", d.id)));
                        
                        // حذف جميع اليوميات التي أنشأها المستخدم (للدكاترة أيضاً)
                        const diaryByAuthorSnap = await getDocs(query(collection(firestoreDb, "diary"), where("authorUid", "==", user.uid)));
                        diaryByAuthorSnap.forEach(d => {
                          if (!diarySnap.docs.find(existing => existing.id === d.id)) {
                            batch.delete(doc(firestoreDb, "diary", d.id));
                          }
                        });

                        // حذف جميع تعليقات اليوميات للمستخدم
                        const commentsSnap = await getDocs(query(collection(firestoreDb, "diaryComments"), where("authorUid", "==", user.uid)));
                        commentsSnap.forEach(d => batch.delete(doc(firestoreDb, "diaryComments", d.id)));

                        // حذف جميع التقييمات
                        const assessSnap = await getDocs(query(collection(firestoreDb, "assessments"), where("patientId", "==", patientId)));
                        assessSnap.forEach(d => batch.delete(doc(firestoreDb, "assessments", d.id)));

                        // حذف جميع التنبيهات
                        const alertSnap = await getDocs(query(collection(firestoreDb, "alerts"), where("patientId", "==", patientId)));
                        alertSnap.forEach(d => batch.delete(doc(firestoreDb, "alerts", d.id)));

                        // حذف جميع الرسائل
                        const messageSnap = await getDocs(query(collection(firestoreDb, "messages"), where("patientId", "==", patientId)));
                        messageSnap.forEach(d => batch.delete(doc(firestoreDb, "messages", d.id)));

                        // حذف جميع المواعيد
                        const appointmentSnap = await getDocs(query(collection(firestoreDb, "appointments"), where("patientId", "==", patientId)));
                        appointmentSnap.forEach(d => batch.delete(doc(firestoreDb, "appointments", d.id)));

                        // حذف جميع الأدوية
                        const medicationSnap = await getDocs(query(collection(firestoreDb, "medications"), where("patientId", "==", patientId)));
                        medicationSnap.forEach(d => batch.delete(doc(firestoreDb, "medications", d.id)));

                        // حذف جميع طلبات إعادة التقييم
                        const reassessSnap = await getDocs(query(collection(firestoreDb, "reassessmentRequests"), where("patientId", "==", patientId)));
                        reassessSnap.forEach(d => batch.delete(doc(firestoreDb, "reassessmentRequests", d.id)));

                        // حذف بيانات المريض
                        batch.delete(doc(firestoreDb, "patients", patientId));

                        // حذف ملف المستخدم
                        batch.delete(doc(firestoreDb, "userProfiles", user.uid));

                        // تنفيذ جميع عمليات الحذف
                        await batch.commit();

                        // حذف الحساب من Firebase Authentication
                        if (auth.currentUser) {
                          await deleteUser(auth.currentUser);
                        }

                        // تسجيل الخروج وإعادة التوجيه
                        navigate("/");
                        window.location.reload();
                      } catch (error: any) {
                        console.error("Error deleting account:", error);
                        const errorMessage = error?.message || "خطأ غير معروف";
                        alert(`فشل حذف الحساب: ${errorMessage}. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.`);
                      } finally {
                        setDeletingAccount(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin ml-2" />
                        جاري الحذف...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 ml-2" />
                        نعم، احذفي الحساب
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}


