import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { firestoreDb, doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, setDoc, auth } from "@/lib/firebase";
import { storage, ref, uploadBytes, getDownloadURL } from "@/lib/firebase";
import { motion } from "framer-motion";
import { AlertCircle, Upload, Save, FileText, Award, Clock, CheckCircle2, Plus, Eye, Download, X, Phone, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

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

export default function DoctorUpdateInfo() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registrationRequest, setRegistrationRequest] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    birthDate: "",
    education: "",
    specialization: "",
    experienceYears: "",
    bio: "",
    phone: "",
  });

  // Certificates management
  const [certificates, setCertificates] = useState<any[]>([]);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [uploadCertDialogOpen, setUploadCertDialogOpen] = useState(false);
  const [selectedCertFile, setSelectedCertFile] = useState<File | null>(null);
  const [certType, setCertType] = useState<"academic" | "course" | "other">("academic");
  const [certTitle, setCertTitle] = useState("");
  const [certDescription, setCertDescription] = useState("");

  useEffect(() => {
    if (!user) return;
    const loadRequestData = async () => {
      try {
        const requestsSnap = await getDocs(
          query(
            collection(firestoreDb, "doctorRegistrationRequests"),
            where("uid", "==", user.uid),
            where("status", "==", "needsInfo")
          )
        );

        if (!requestsSnap.empty) {
          const request = requestsSnap.docs[0].data() as any;
          const requestId = requestsSnap.docs[0].id;
          setRegistrationRequest({ ...request, id: requestId });
          
          setForm({
            name: request.name || "",
            age: request.age ? String(request.age) : "",
            birthDate: request.birthDate || "",
            education: request.education || "",
            specialization: request.specialization || "",
            experienceYears: request.experienceYears ? String(request.experienceYears) : "",
            bio: request.bio || "",
            phone: request.phone || request.phoneNumber || "",
            governorate: request.governorate || "",
          });
        }

        // Load existing certificates
        const certsSnap = await getDocs(
          query(
            collection(firestoreDb, "doctorCertificates"),
            where("doctorId", "==", user.uid)
          )
        );
        setCertificates(certsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        ));

        setLoading(false);
      } catch (error) {
        console.error("Error loading request data:", error);
        setLoading(false);
      }
    };
    loadRequestData();
  }, [user]);

  const handleSave = async () => {
    if (!user || !registrationRequest) return;
    setSaving(true);

    try {
      const calculatedAge = form.birthDate ? calculateAge(form.birthDate) : (form.age ? parseInt(form.age, 10) : null);

      // تنسيق رقم الهاتف قبل الحفظ
      const { formatPhoneNumber } = await import("@/lib/formatUtils");
      const formattedPhone = form.phone && form.phone.trim() ? formatPhoneNumber(form.phone) : null;

      // Update registration request
      await updateDoc(doc(firestoreDb, "doctorRegistrationRequests", registrationRequest.id), {
        name: form.name,
        age: calculatedAge,
        birthDate: form.birthDate || null,
        education: form.education,
        specialization: form.specialization || null,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears, 10) : null,
        bio: form.bio,
        phone: formattedPhone,
        governorate: form.governorate || null,
        status: "pending", // Reset to pending for re-review
        additionalInfoRequest: null, // Clear the request
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث المعلومات بنجاح! سيتم مراجعة طلبك مرة أخرى.",
        variant: "default",
      });
      // Wait a bit to show the toast, then logout and redirect
      setTimeout(async () => {
        const { signOut } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");
        await signOut(auth);
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      console.error("Error updating request:", error);
      toast({
        title: "حدث خطأ",
        description: "حدث خطأ أثناء حفظ المعلومات. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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

  const handleUploadCertificate = async () => {
    if (!selectedCertFile || !user) return;
    
    // Check if user is authenticated
    if (!auth.currentUser) {
      toast({
        title: "خطأ في المصادقة",
        description: "يرجى تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingCertificate(true);

    try {
      // Try server upload first
      try {
        // Get authentication token
        const token = await auth.currentUser.getIdToken();
        
        const formData = new FormData();
        formData.append("file", selectedCertFile);
        formData.append("doctorId", user.uid);
        formData.append("certType", certType);
        formData.append("title", certTitle);
        formData.append("description", certDescription || '');
        formData.append("uploadedBy", user.uid);

        const response = await fetch("/api/upload-file", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.downloadURL) {
            await addDoc(collection(firestoreDb, "doctorCertificates"), {
              doctorId: user.uid,
              fileName: result.fileName || selectedCertFile.name,
              certType,
              title: certTitle,
              description: certDescription,
              downloadURL: result.downloadURL,
              storagePath: result.storagePath,
              size: result.size || selectedCertFile.size,
              mimeType: result.mimeType || selectedCertFile.type,
              createdAt: new Date().toISOString(),
            });

            setSelectedCertFile(null);
            setCertTitle("");
            setCertDescription("");
            setCertType("academic");
            setUploadCertDialogOpen(false);
            
            // Reload certificates
            const certsSnap = await getDocs(
              query(
                collection(firestoreDb, "doctorCertificates"),
                where("doctorId", "==", user.uid)
              )
            );
            setCertificates(certsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => 
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            ));
            return;
          }
        }
      } catch (serverError: any) {
        console.warn("Server upload failed, trying direct upload:", serverError);
      }

      // Fallback: Direct upload
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

      await addDoc(collection(firestoreDb, "doctorCertificates"), {
        doctorId: user.uid,
        fileName: selectedCertFile.name,
        certType,
        title: certTitle,
        description: certDescription,
        downloadURL,
        storagePath: `doctorCertificates/${fileName}`,
        size: selectedCertFile.size,
        mimeType: selectedCertFile.type,
        createdAt: new Date().toISOString(),
      });

      setSelectedCertFile(null);
      setCertTitle("");
      setCertDescription("");
      setCertType("academic");
      setUploadCertDialogOpen(false);

      // Update registration request status to pending after uploading certificate
      if (registrationRequest) {
        try {
          await updateDoc(doc(firestoreDb, "doctorRegistrationRequests", registrationRequest.id), {
            status: "pending",
            additionalInfoRequest: null,
            updatedAt: new Date().toISOString(),
          });
        } catch (updateError) {
          console.error("Error updating request status:", updateError);
        }
      }

      // Reload certificates
      const certsSnap = await getDocs(
        query(
          collection(firestoreDb, "doctorCertificates"),
          where("doctorId", "==", user.uid)
        )
      );
      setCertificates(certsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ));
      
      toast({
        title: "تم رفع الشهادة بنجاح",
        description: "تم رفع الشهادة بنجاح! تم تحديث حالة الطلب إلى 'قيد المراجعة'.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error uploading certificate:", error);
      toast({
        title: "حدث خطأ",
        description: "حدث خطأ أثناء رفع الشهادة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setUploadingCertificate(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!registrationRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">لا يوجد طلب يحتاج تحديث</h2>
          <p className="text-muted-foreground">لم يتم العثور على طلب تسجيل يحتاج تحديث معلومات.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-primary/5 to-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">تحديث معلومات التسجيل</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    مطلوب معلومات إضافية لإتمام عملية مراجعة طلبك
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {registrationRequest.additionalInfoRequest && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">طلب الإدارة:</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    {registrationRequest.additionalInfoRequest}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="text-xl font-bold">المعلومات الشخصية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">الاسم الكامل *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="birthDate">تاريخ الميلاد</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="education">التعليم/الشهادة الأكاديمية *</Label>
                  <Input
                    id="education"
                    value={form.education}
                    onChange={(e) => setForm({ ...form, education: e.target.value })}
                    placeholder="مثال: دكتوراه في الطب"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="specialization">التخصص</Label>
                  <Select value={form.specialization} onValueChange={(value) => setForm({ ...form, specialization: value })}>
                    <SelectTrigger id="specialization" className="mt-2">
                      <SelectValue placeholder="اختر التخصص" />
                    </SelectTrigger>
                    <SelectContent>
                      {breastCancerSpecializations.map((spec) => (
                        <SelectItem key={spec.value} value={spec.value}>
                          {spec.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="experienceYears">سنوات الخبرة</Label>
                  <Input
                    id="experienceYears"
                    type="number"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                    className="mt-2"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-2"
                    placeholder="+20XXXXXXXXXX أو +966XXXXXXXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="governorate">المحافظة</Label>
                  <Select
                    value={form.governorate}
                    onValueChange={(value) => setForm({ ...form, governorate: value })}
                  >
                    <SelectTrigger id="governorate" className="mt-2">
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
                </div>
              </div>
              <div>
                <Label htmlFor="bio">نبذة عنك (اختياري)</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="اكتب نبذة عنك وخبراتك..."
                  className="mt-2 min-h-24"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Certificates Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                    <Button className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg">
                      <Plus className="h-4 w-4" />
                      إضافة شهادة
                    </Button>
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
                <div className="text-center py-16">
                  <Award className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                  <p className="text-muted-foreground text-xl font-semibold mb-2">لا توجد شهادات</p>
                  <p className="text-sm text-muted-foreground">أضف شهاداتك الأكاديمية والتدريبية</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {certificates.map((cert, index) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-2 rounded-xl p-4 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
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
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end gap-4"
        >
          <Button
            onClick={handleSave}
            disabled={saving || !form.name || !form.education}
            className="bg-gradient-to-r from-primary to-primary/90 shadow-lg gap-2 px-8"
            size="lg"
          >
            {saving ? (
              <>
                <Clock className="h-5 w-5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                حفظ وتقديم الطلب
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

