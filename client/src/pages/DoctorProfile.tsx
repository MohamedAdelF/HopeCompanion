import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { firestoreDb, doc, getDoc, updateDoc, setDoc, collection, addDoc, getDocs, query, where, deleteDoc, onSnapshot } from "@/lib/firebase";
import { storage, ref, uploadBytes, getDownloadURL, deleteObject, auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, User, GraduationCap, FileText, Calendar, Clock, Upload, Save, Edit, Sparkles, CheckCircle2, ChevronRight, Briefcase, Award, X, Download, Eye, Image, Plus, Phone, MapPin, Building2, Hospital, Trash2, Search } from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// قائمة تخصصات سرطان الثدي
const breastCancerSpecializations = [
  { value: "general_medicine", label: "الطب العام", description: "متابعة أولية وتوجيه المرضى" },
  { value: "breast_surgery", label: "جراحة الثدي", description: "تخصص في جراحات الثدي (استئصال الأورام، إعادة البناء)" },
  { value: "oncology", label: "طب الأورام", description: "تخصص في علاج الأورام الخبيثة (كيميائي، مناعي)" },
  { value: "radiology", label: "الأشعة التشخيصية", description: "تخصص في فحوصات الثدي (ماموجرام، سونار، MRI)" },
  { value: "pathology", label: "علم الأمراض (الباثولوجيا)", description: "تخصص في تحليل العينات والأنسجة" },
  { value: "radiation_oncology", label: "العلاج الإشعاعي", description: "تخصص في العلاج بالإشعاع" },
  { value: "psycho_oncology", label: "الطب النفسي للأورام", description: "دعم نفسي وعلاجي للمريضات" },
  { value: "reconstructive_surgery", label: "جراحة التجميل والإعادة", description: "إعادة بناء الثدي بعد الجراحة" },
  { value: "clinical_oncology", label: "الأورام السريرية", description: "متابعة وعلاج حالات السرطان" },
];

export default function DoctorProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    birthDate: "",
    education: "",
    specialization: "",
    experienceYears: "",
    certificateUrl: "",
    bio: "",
    phone: "",
    governorate: "",
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePreview, setCertificatePreview] = useState<string | null>(null);
  const [doctorAge, setDoctorAge] = useState<number | null>(null);
  
  // Certificates management
  const [certificates, setCertificates] = useState<any[]>([]);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [uploadCertDialogOpen, setUploadCertDialogOpen] = useState(false);
  const [selectedCertFile, setSelectedCertFile] = useState<File | null>(null);
  const [certType, setCertType] = useState<"academic" | "course" | "other">("academic");
  const [certTitle, setCertTitle] = useState("");
  const [certDescription, setCertDescription] = useState("");
  const [viewingCert, setViewingCert] = useState<string | null>(null);

  // Medical Centers management
  const [medicalCenters, setMedicalCenters] = useState<any[]>([]);
  const [addCenterDialogOpen, setAddCenterDialogOpen] = useState(false);
  const [centerForm, setCenterForm] = useState({
    name: "",
    type: "clinic" as "clinic" | "hospital",
    address: "",
    phone: "",
    city: "",
    latitude: "",
    longitude: "",
    specialties: "",
  });
  const [editingCenter, setEditingCenter] = useState<string | null>(null);
  const [deletingCenter, setDeletingCenter] = useState<string | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [searchPlace, setSearchPlace] = useState("");

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

  useEffect(() => {
    if (!user) return;
    const loadDoctorData = async () => {
      try {
        const d = await getDoc(doc(firestoreDb, "doctors", user.uid));
        const data = d.data();
        if (data) {
          const birthDate = data.birthDate || "";
          setForm({
            name: data.name || "",
            age: String(data.age || ""),
            birthDate: birthDate,
            education: data.education || "",
            specialization: data.specialization || "",
            experienceYears: String(data.experienceYears || ""),
            certificateUrl: data.certificateUrl || "",
            bio: data.bio || "",
            phone: data.phone || data.phoneNumber || "",
            governorate: data.governorate || "",
          });
          // حساب العمر
          if (birthDate) {
            setDoctorAge(calculateAge(birthDate));
          } else if (data.age) {
            setDoctorAge(data.age);
          } else {
            setDoctorAge(null);
          }
          if (data.certificateUrl) {
            setCertificatePreview(data.certificateUrl);
          }
        }
      } catch (error) {
        console.error("Error loading doctor data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDoctorData();
  }, [user]);

  // Load certificates
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsub = onSnapshot(
      query(collection(firestoreDb, "doctorCertificates"), where("doctorId", "==", user.uid)),
      (snap) => {
        const certs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort by createdAt descending
        certs.sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setCertificates(certs);
      },
      (error) => {
        console.error("Error loading certificates:", error);
      }
    );
    
    return () => unsub();
  }, [user?.uid]);

  // Load medical centers
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsub = onSnapshot(
      query(collection(firestoreDb, "medicalCenters"), where("doctorId", "==", user.uid)),
      (snap) => {
        const centers = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setMedicalCenters(centers);
      },
      (error) => {
        console.error("Error loading medical centers:", error);
      }
    );
    
    return () => unsub();
  }, [user?.uid]);

  // Handle add/edit medical center
  const handleSaveCenter = async () => {
    if (!user?.uid) return;
    
    if (!centerForm.name || !centerForm.address || !centerForm.phone || !centerForm.city) {
      alert("الرجاء إدخال جميع الحقول المطلوبة");
      return;
    }

    if (!centerForm.latitude || !centerForm.longitude) {
      alert("الرجاء تحديد الموقع على الخريطة");
      return;
    }

    try {
      const centerData = {
        name: centerForm.name,
        type: centerForm.type,
        address: centerForm.address,
        phone: centerForm.phone,
        city: centerForm.city,
        latitude: parseFloat(centerForm.latitude),
        longitude: parseFloat(centerForm.longitude),
        country: "مصر",
        specialties: centerForm.specialties ? centerForm.specialties.split(",").map(s => s.trim()) : [],
        doctorId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingCenter) {
        await updateDoc(doc(firestoreDb, "medicalCenters", editingCenter), centerData);
      } else {
        await addDoc(collection(firestoreDb, "medicalCenters"), centerData);
      }

      setAddCenterDialogOpen(false);
      setCenterForm({
        name: "",
        type: "clinic",
        address: "",
        phone: "",
        city: "",
        latitude: "",
        longitude: "",
        specialties: "",
      });
      setEditingCenter(null);
    } catch (error) {
      console.error("Error saving medical center:", error);
      alert("حدث خطأ أثناء حفظ المركز الطبي");
    }
  };

  // Handle delete medical center
  const handleDeleteCenter = async (centerId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المركز الطبي؟")) return;

    try {
      await deleteDoc(doc(firestoreDb, "medicalCenters", centerId));
      setDeletingCenter(null);
    } catch (error) {
      console.error("Error deleting medical center:", error);
      alert("حدث خطأ أثناء حذف المركز الطبي");
    }
  };

  // Handle edit medical center
  const handleEditCenter = (center: any) => {
    setEditingCenter(center.id);
    setCenterForm({
      name: center.name || "",
      type: center.type || "clinic",
      address: center.address || "",
      phone: center.phone || "",
      city: center.city || "",
      latitude: String(center.latitude || ""),
      longitude: String(center.longitude || ""),
      specialties: center.specialties?.join(", ") || "",
    });
    setAddCenterDialogOpen(true);
  };

  // Upload certificate handler
  const handleUploadCertificate = async () => {
    if (!selectedCertFile || !user?.uid) return;
    
    if (!auth.currentUser) {
      alert("يرجى تسجيل الدخول أولاً");
      return;
    }
    
    setUploadingCertificate(true);
    try {
      // Try server upload first
      try {
        const formData = new FormData();
        formData.append("file", selectedCertFile);
        formData.append("doctorId", user.uid);
        formData.append("certType", certType);
        formData.append("title", certTitle);
        formData.append("description", certDescription || '');
        formData.append("uploadedBy", user.uid);
        
        const response = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.downloadURL) {
            // Server upload successful
            await addDoc(collection(firestoreDb, "doctorCertificates"), {
              doctorId: user.uid,
              fileName: result.fileName || selectedCertFile.name,
              certType,
              title: certTitle || (certType === "academic" ? "شهادة أكاديمية" : certType === "course" ? "شهادة كورس" : "شهادة أخرى"),
              description: certDescription,
              downloadURL: result.downloadURL,
              storagePath: result.storagePath,
              size: result.size || selectedCertFile.size,
              mimeType: result.mimeType || selectedCertFile.type,
              createdAt: new Date().toISOString(),
              uploadedBy: user.uid,
            });
            
            setSelectedCertFile(null);
            setCertTitle("");
            setCertDescription("");
            setCertType("academic");
            setUploadCertDialogOpen(false);
            return;
          }
        }
      } catch (serverError: any) {
        console.warn("Server upload failed, trying direct upload:", serverError);
      }
      
      // Fallback: Direct upload using Firebase SDK
      const timestamp = Date.now();
      const fileName = `${user.uid}/${timestamp}_${selectedCertFile.name}`;
      const fileRef = ref(storage, `doctorCertificates/${fileName}`);
      
      const metadata = {
        contentType: selectedCertFile.type || 'application/octet-stream',
        customMetadata: {
          uploadedBy: user.uid,
          doctorId: user.uid,
          certType: certType,
          title: certTitle || '',
          description: certDescription || '',
        }
      };
      
      await uploadBytes(fileRef, selectedCertFile, metadata);
      const downloadURL = await getDownloadURL(fileRef);
      
      // Save certificate metadata to Firestore
      await addDoc(collection(firestoreDb, "doctorCertificates"), {
        doctorId: user.uid,
        fileName: selectedCertFile.name,
        certType,
        title: certTitle || (certType === "academic" ? "شهادة أكاديمية" : certType === "course" ? "شهادة كورس" : "شهادة أخرى"),
        description: certDescription,
        downloadURL,
        storagePath: `doctorCertificates/${fileName}`,
        size: selectedCertFile.size,
        mimeType: selectedCertFile.type,
        createdAt: new Date().toISOString(),
        uploadedBy: user.uid,
      });
      
      setSelectedCertFile(null);
      setCertTitle("");
      setCertDescription("");
      setCertType("academic");
      setUploadCertDialogOpen(false);
    } catch (error: any) {
      console.error("Error uploading certificate:", error);
      let errorMessage = "حدث خطأ أثناء رفع الشهادة. يرجى المحاولة مرة أخرى.";
      if (error?.code === 'storage/unauthorized') {
        errorMessage = "ليس لديك صلاحية لرفع الشهادة. تأكد من نشر Storage Rules في Firebase Console.";
      } else if (error?.code === 'storage/canceled') {
        errorMessage = "تم إلغاء عملية الرفع.";
      } else if (error?.code === 'storage/unknown' || error?.message?.includes('CORS') || error?.message?.includes('cors')) {
        errorMessage = "⚠️ خطأ CORS: يرجى تطبيق إعدادات CORS في Firebase Storage Console.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setUploadingCertificate(false);
    }
  };

  // Delete certificate handler
  const handleDeleteCertificate = async (certId: string, storagePath: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشهادة؟")) return;
    
    try {
      // Delete from Storage
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      }
      
      // Delete from Firestore
      await deleteDoc(doc(firestoreDb, "doctorCertificates", certId));
    } catch (error: any) {
      console.error("Error deleting certificate:", error);
      alert("حدث خطأ أثناء حذف الشهادة");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificateFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertificatePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaveLoading(true);
    try {
      // في الإنتاج، يجب رفع الملف إلى Firebase Storage أولاً
      // هنا سنستخدم base64 كحل مؤقت
      let certificateUrl = form.certificateUrl;
      if (certificateFile && certificatePreview) {
        certificateUrl = certificatePreview; // في الإنتاج، استخدم URL من Firebase Storage
      }

      // حساب العمر من تاريخ الميلاد
      const calculatedAge = form.birthDate ? calculateAge(form.birthDate) : (form.age ? parseInt(form.age, 10) : null);

      // تنسيق رقم الهاتف قبل الحفظ
      const { formatPhoneNumber } = await import("@/lib/formatUtils");
      const formattedPhone = form.phone && form.phone.trim() ? formatPhoneNumber(form.phone) : null;

      const updateData: any = {
        name: form.name,
        age: calculatedAge || null,
        birthDate: form.birthDate || null,
        education: form.education,
        specialization: form.specialization || null,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears, 10) : null,
        certificateUrl: certificateUrl,
        bio: form.bio,
        phone: formattedPhone,
        governorate: form.governorate || null,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(firestoreDb, "doctors", user.uid), updateData);
      if (form.birthDate) {
        setDoctorAge(calculateAge(form.birthDate));
      } else if (calculatedAge) {
        setDoctorAge(calculatedAge);
      }
      setSaveSuccess(true);
      setIsEditing(false);
      setCertificateFile(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
              <p className="text-muted-foreground">جارٍ تحميل البيانات...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-12">
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
                    الملف الشخصي
                  </CardTitle>
                  <CardDescription className="font-body text-base sm:text-lg mt-2 flex items-center gap-2 flex-wrap">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span>معلوماتك الشخصية والمهنية</span>
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/doctor">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="gap-2 shadow-md hover:shadow-lg transition-shadow border-2">
                      <ChevronRight className="h-4 w-4" />
                      <span className="hidden sm:inline">رجوع</span>
                    </Button>
                  </motion.div>
                </Link>
                {!isEditing ? (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={() => setIsEditing(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg hover:shadow-xl transition-all">
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline">تعديل</span>
                      <span className="sm:hidden">تعديل</span>
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setCertificateFile(null);
                        if (!certificatePreview && form.certificateUrl) {
                          setCertificatePreview(form.certificateUrl);
                        }
                      }}
                      className="gap-2 border-2"
                    >
                      إلغاء
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-200/50 dark:from-blue-950/40 dark:to-blue-900/30 rounded-xl shadow-md border border-blue-200/50 dark:border-blue-800/50">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">المعلومات الشخصية</CardTitle>
                <CardDescription className="mt-1 text-base">
                  معلوماتك الأساسية والمهنية
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-primary" />
                  الاسم الكامل
                </Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-12 border-2"
                    placeholder="اسمك الكامل"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center border-2 rounded-md bg-muted/50">
                    {form.name || "—"}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="birthDate" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  تاريخ الميلاد
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => {
                        setForm({ ...form, birthDate: e.target.value });
                        if (e.target.value) {
                          setDoctorAge(calculateAge(e.target.value));
                        }
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      className="h-12 border-2"
                    />
                    {form.birthDate && doctorAge !== null && (
                      <p className="text-xs text-primary font-medium mt-1.5">
                        العمر: {doctorAge} سنة
                      </p>
                    )}
                    {!form.birthDate && doctorAge !== null && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        العمر: {doctorAge} سنة
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="h-12 px-4 flex items-center border-2 rounded-md bg-muted/50">
                      {form.birthDate ? new Date(form.birthDate).toLocaleDateString('ar-EG') : "—"}
                    </div>
                    {doctorAge !== null && (
                      <p className="text-xs text-muted-foreground">
                        العمر: {doctorAge} سنة
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="education" className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  مكان الدراسة / الجامعة
                </Label>
                {isEditing ? (
                  <Input
                    id="education"
                    value={form.education}
                    onChange={(e) => setForm({ ...form, education: e.target.value })}
                    className="h-12 border-2"
                    placeholder="مثال: جامعة الملك سعود"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center border-2 rounded-md bg-muted/50">
                    {form.education || "—"}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="specialization" className="flex items-center gap-2 mb-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  التخصص في سرطان الثدي
                </Label>
                {isEditing ? (
                  <Select
                    value={form.specialization}
                    onValueChange={(value) => setForm({ ...form, specialization: value })}
                  >
                    <SelectTrigger id="specialization" className="h-12 border-2">
                      <SelectValue placeholder="اختر تخصصك" />
                    </SelectTrigger>
                    <SelectContent>
                      {breastCancerSpecializations.map((spec) => (
                        <SelectItem key={spec.value} value={spec.value}>
                          <div>
                            <div className="font-medium">{spec.label}</div>
                            <div className="text-xs text-muted-foreground">{spec.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-12 px-4 flex items-center border-2 rounded-md bg-muted/50">
                    {form.specialization 
                      ? breastCancerSpecializations.find(s => s.value === form.specialization)?.label || form.specialization
                      : "—"}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="experienceYears" className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  سنوات الخبرة
                </Label>
                {isEditing ? (
                  <Input
                    id="experienceYears"
                    type="number"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                    className="h-12 border-2"
                    placeholder="عدد السنوات"
                    min="0"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center border-2 rounded-md bg-muted/50">
                    {form.experienceYears ? `${form.experienceYears} سنة` : "—"}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-primary" />
                  رقم الهاتف
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-12 border-2"
                    placeholder="+20XXXXXXXXXX أو +966XXXXXXXXX"
                  />
                ) : (
                  <div className="h-12 px-4 flex items-center border-2 rounded-md bg-muted/50">
                    {form.phone || "—"}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="governorate" className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  المحافظة
                </Label>
                {isEditing ? (
                  <Select
                    value={form.governorate}
                    onValueChange={(value) => setForm({ ...form, governorate: value })}
                  >
                    <SelectTrigger id="governorate" className="h-12 border-2">
                      <SelectValue placeholder="اختر المحافظة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="text-right">
                      {["القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "الغربية", 
                        "كفر الشيخ", "المنوفية", "البحيرة", "الإسماعيلية", "بورسعيد", "السويس",
                        "شمال سيناء", "جنوب سيناء", "البحر الأحمر", "الوادي الجديد", "مطروح",
                        "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "المنيا", "بني سويف", "الفيوم"].map((gov) => (
                        <SelectItem key={gov} value={gov} dir="rtl" className="text-right">
                          {gov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-12 px-4 flex items-center border-2 rounded-md bg-muted/50">
                    {form.governorate || "—"}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bio" className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  نبذة عني (اختياري)
                </Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    className="min-h-32 border-2"
                    placeholder="اكتبي نبذة عنك المهنية..."
                  />
                ) : (
                  <div className="min-h-32 px-4 py-3 border-2 rounded-md bg-muted/50">
                    {form.bio || "—"}
                  </div>
                )}
              </div>
            </div>
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                {saveSuccess && (
                  <Badge variant="outline" className="gap-2 border-green-300 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    تم الحفظ بنجاح
                  </Badge>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="bg-gradient-to-r from-primary to-primary/90 gap-2"
                >
                  {saveLoading ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      حفظ التغييرات
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Certificates Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-200/50 dark:from-emerald-950/40 dark:to-emerald-900/30 rounded-xl shadow-md border border-emerald-200/50 dark:border-emerald-800/50">
                  <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">الشهادات والمؤهلات</CardTitle>
                  <CardDescription className="mt-1.5 text-base">
                    {certificates.length} شهادة مرفوعة
                  </CardDescription>
                </div>
              </div>
              <Dialog open={uploadCertDialogOpen} onOpenChange={setUploadCertDialogOpen}>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg hover:shadow-xl transition-all">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">إضافة شهادة</span>
                      <span className="sm:hidden">إضافة</span>
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-xl">إضافة شهادة جديدة</DialogTitle>
                    <DialogDescription>
                      رفع شهادة أكاديمية، كورس، أو شهادة أخرى
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="cert-type">نوع الشهادة *</Label>
                      <Select value={certType} onValueChange={(value: any) => setCertType(value)}>
                        <SelectTrigger id="cert-type" className="mt-2 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="academic">شهادة أكاديمية</SelectItem>
                          <SelectItem value="course">شهادة كورس/تدريب</SelectItem>
                          <SelectItem value="other">شهادة أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="cert-title">عنوان الشهادة (اختياري)</Label>
                      <Input
                        id="cert-title"
                        value={certTitle}
                        onChange={(e) => setCertTitle(e.target.value)}
                        placeholder="مثال: ماجستير في طب الأورام"
                        className="mt-2 h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cert-description">وصف (اختياري)</Label>
                      <Textarea
                        id="cert-description"
                        value={certDescription}
                        onChange={(e) => setCertDescription(e.target.value)}
                        placeholder="معلومات إضافية عن الشهادة..."
                        className="mt-2 min-h-24"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cert-file">ملف الشهادة *</Label>
                      <Input
                        id="cert-file"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setSelectedCertFile(e.target.files?.[0] || null)}
                        className="mt-2 h-11"
                        required
                      />
                      {selectedCertFile && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          الملف المحدد: {selectedCertFile.name} ({(selectedCertFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setUploadCertDialogOpen(false);
                      setSelectedCertFile(null);
                      setCertTitle("");
                      setCertDescription("");
                      setCertType("academic");
                    }}>
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleUploadCertificate}
                      disabled={!selectedCertFile || uploadingCertificate}
                      className="bg-gradient-to-r from-primary to-primary/90 gap-2"
                    >
                      {uploadingCertificate ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          رفع الشهادة
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {certificates.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Award className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                </motion.div>
                <p className="text-muted-foreground text-xl font-semibold mb-2">لا توجد شهادات</p>
                <p className="text-sm text-muted-foreground">أضف شهاداتك الأكاديمية والتدريبية لإتمام ملفك الشخصي</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {certificates.map((cert, index) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card className="shadow-md border-2 hover:shadow-lg transition-all h-full">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                              {cert.mimeType?.startsWith('image/') ? (
                                <Image className="h-5 w-5 text-primary" />
                              ) : (
                                <FileText className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate mb-1">
                                {cert.title || (cert.certType === "academic" ? "شهادة أكاديمية" : cert.certType === "course" ? "شهادة كورس" : "شهادة أخرى")}
                              </h4>
                              <Badge variant="outline" className="text-xs mb-2">
                                {cert.certType === 'academic' ? 'أكاديمية' :
                                 cert.certType === 'course' ? 'كورس/تدريب' : 'أخرى'}
                              </Badge>
                              {cert.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{cert.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(cert.createdAt).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                              {cert.size && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {(cert.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-2"
                              onClick={() => setViewingCert(cert.downloadURL)}
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
                                link.href = cert.downloadURL;
                                link.download = cert.fileName;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4" />
                              تحميل
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleDeleteCertificate(cert.id, cert.storagePath)}
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

      {/* View Certificate Dialog */}
      <Dialog open={!!viewingCert} onOpenChange={(open) => !open && setViewingCert(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl">عرض الشهادة</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {viewingCert?.startsWith('data:image') || viewingCert?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img
                src={viewingCert}
                alt="الشهادة"
                className="max-w-full h-auto rounded-lg border shadow-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <a
                  href={viewingCert || '#'}
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

      {/* Medical Centers Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <Card className="border-2 shadow-xl bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg border border-primary/20"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <MapPin className="h-8 w-8 text-primary" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-2">
                    المراكز الطبية
                  </CardTitle>
                  <CardDescription className="font-body text-base mt-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>إدارة عياداتك ومستشفياتك على الخريطة</span>
                  </CardDescription>
                </div>
              </div>
              <Dialog open={addCenterDialogOpen} onOpenChange={setAddCenterDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => {
                    setEditingCenter(null);
                    setCenterForm({
                      name: "",
                      type: "clinic",
                      address: "",
                      phone: "",
                      city: "",
                      latitude: "",
                      longitude: "",
                      specialties: "",
                    });
                  }}>
                    <Plus className="h-4 w-4" />
                    إضافة مركز طبي
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>{editingCenter ? "تعديل المركز الطبي" : "إضافة مركز طبي جديد"}</DialogTitle>
                    <DialogDescription>
                      أضف عيادة أو مستشفى ليظهر على الخريطة
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>اسم المركز <span className="text-red-500">*</span></Label>
                      <Input
                        value={centerForm.name}
                        onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                        placeholder="مثال: عيادة د. أحمد محمد"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>نوع المركز <span className="text-red-500">*</span></Label>
                      <Select value={centerForm.type} onValueChange={(value: "clinic" | "hospital") => setCenterForm({ ...centerForm, type: value })}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clinic">عيادة</SelectItem>
                          <SelectItem value="hospital">مستشفى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>العنوان <span className="text-red-500">*</span></Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={centerForm.address}
                          onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
                          placeholder="مثال: شارع النيل، القاهرة"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMapDialogOpen(true)}
                          className="gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          اختر من الخريطة
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>المحافظة <span className="text-red-500">*</span></Label>
                        <Input
                          value={centerForm.city}
                          onChange={(e) => setCenterForm({ ...centerForm, city: e.target.value })}
                          placeholder="مثال: القاهرة"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>رقم الهاتف <span className="text-red-500">*</span></Label>
                        <Input
                          value={centerForm.phone}
                          onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })}
                          placeholder="مثال: +20212345678"
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>خط العرض (Latitude) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          step="any"
                          value={centerForm.latitude}
                          onChange={(e) => setCenterForm({ ...centerForm, latitude: e.target.value })}
                          placeholder="مثال: 30.0444"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>خط الطول (Longitude) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          step="any"
                          value={centerForm.longitude}
                          onChange={(e) => setCenterForm({ ...centerForm, longitude: e.target.value })}
                          placeholder="مثال: 31.2357"
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>التخصصات (مفصولة بفواصل)</Label>
                      <Input
                        value={centerForm.specialties}
                        onChange={(e) => setCenterForm({ ...centerForm, specialties: e.target.value })}
                        placeholder="مثال: أورام الثدي، جراحة الثدي"
                        className="mt-2"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                      💡 يمكنك استخدام زر "اختر من الخريطة" للبحث عن الموقع أو النقر مباشرة على الخريطة لتحديد الموقع
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddCenterDialogOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSaveCenter}>حفظ</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {medicalCenters.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد مراكز طبية مضافة</p>
                <p className="text-sm mt-2">أضف عيادة أو مستشفى ليظهر على الخريطة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medicalCenters.map((center) => (
                  <Card key={center.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {center.type === "hospital" ? (
                              <Hospital className="h-5 w-5 text-red-500" />
                            ) : (
                              <Building2 className="h-5 w-5 text-blue-500" />
                            )}
                            <h3 className="font-bold text-lg">{center.name}</h3>
                            <Badge variant={center.type === "hospital" ? "destructive" : "default"}>
                              {center.type === "hospital" ? "مستشفى" : "عيادة"}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{center.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{center.city}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{center.phone}</span>
                            </div>
                            {center.specialties && center.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {center.specialties.map((spec: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {spec}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCenter(center)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeletingCenter(center.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCenter} onOpenChange={(open) => !open && setDeletingCenter(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا المركز الطبي؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCenter(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deletingCenter && handleDeleteCenter(deletingCenter)}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Picker Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>اختر موقع المركز الطبي</DialogTitle>
            <DialogDescription>
              ابحث عن الموقع أو انقر مباشرة على الخريطة لتحديد الموقع
            </DialogDescription>
          </DialogHeader>
          <LocationPicker
            onLocationSelect={(location) => {
              setCenterForm({
                ...centerForm,
                latitude: String(location.lat),
                longitude: String(location.lng),
                address: location.address,
                city: location.city || centerForm.city,
              });
              setMapDialogOpen(false);
            }}
            initialLat={centerForm.latitude ? parseFloat(centerForm.latitude) : undefined}
            initialLng={centerForm.longitude ? parseFloat(centerForm.longitude) : undefined}
            initialAddress={centerForm.address}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

