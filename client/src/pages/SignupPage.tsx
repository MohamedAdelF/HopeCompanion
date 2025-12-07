import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useLocation, Link } from "wouter";
import { setRole, type AppRole } from "@/lib/authRole";
import { firestoreDb, doc, setDoc, addDoc, collection, getDocs } from "@/lib/firebase";
import { Eye, EyeOff, User, Mail, Phone, MapPin, Stethoscope, Heart, Sparkles, AlertCircle, CheckCircle2, Loader2, GraduationCap, Calendar, Briefcase, Clock, ChevronRight, ChevronLeft, ArrowRight, Video, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

// قائمة المحافظات المصرية
const governorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "الغربية", 
  "كفر الشيخ", "المنوفية", "البحيرة", "الإسماعيلية", "بورسعيد", "السويس",
  "شمال سيناء", "جنوب سيناء", "البحر الأحمر", "الوادي الجديد", "مطروح",
  "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "المنيا", "بني سويف", "الفيوم"
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleState] = useState<AppRole>("patient");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [assignedDoctor, setAssignedDoctor] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [governorate, setGovernorate] = useState("");
  const [consultationType, setConsultationType] = useState<"both" | "online_only">("both");
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("+20");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctorAge, setDoctorAge] = useState("");
  const [doctorEducation, setDoctorEducation] = useState("");
  const [doctorSpecialization, setDoctorSpecialization] = useState("");
  const [doctorExperienceYears, setDoctorExperienceYears] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [doctorGovernorate, setDoctorGovernorate] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [, navigate] = useLocation();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = role === "patient" ? 3 : 3; // نفس العدد للطبيب والمريض

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

  // read role from query string if provided
  const [roleLocked, setRoleLocked] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("role");
    if (r === "patient" || r === "doctor") {
      setRoleState(r);
      setRoleLocked(true);
    }
  }, []);

  // Filter doctors based on governorate and consultation type
  const filteredDoctors = doctors.filter((doctor) => {
    // If online only, show all doctors regardless of governorate
    if (consultationType === "online_only") {
      // Check if doctor offers online consultations
      // If doctor has onlineOnly field, check it; otherwise assume all doctors can do online
      return doctor.acceptingPatients !== false && 
             (doctor.onlineOnly === true || doctor.onlineOnly === undefined || doctor.consultationTypes?.includes("online"));
    }
    
    // If both (online + in-person), filter by governorate
    if (governorate) {
      const doctorGov = doctor.governorate || doctor.city;
      return doctor.acceptingPatients !== false && 
             (doctorGov === governorate || 
              doctor.consultationTypes?.includes("both") || 
              doctor.consultationTypes?.includes("in_person"));
    }
    
    // If no governorate selected, show all accepting doctors
    return doctor.acceptingPatients !== false;
  });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(firestoreDb, "doctors"));
        setDoctors(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (_e) {
        setDoctors([]);
      }
    })();
  }, []);

  // Validation functions
  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      setError("الرجاء إدخال الاسم الكامل");
      return false;
    }
    if (!birthDate) {
      setError("الرجاء إدخال تاريخ الميلاد");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (role === "patient") {
      if (!phone.trim()) {
        setError("الرجاء إدخال رقم الهاتف");
        return false;
      }
      if (!address.trim()) {
        setError("الرجاء إدخال العنوان");
        return false;
      }
      if (!governorate) {
        setError("الرجاء اختيار المحافظة");
        return false;
      }
    } else {
      if (!doctorEducation.trim()) {
        setError("الرجاء إدخال مكان الدراسة/الجامعة");
        return false;
      }
      if (!doctorSpecialization) {
        setError("الرجاء اختيار التخصص");
        return false;
      }
      if (!doctorPhone.trim()) {
        setError("الرجاء إدخال رقم الهاتف");
        return false;
      }
      if (!doctorGovernorate) {
        setError("الرجاء اختيار المحافظة");
        return false;
      }
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError("الرجاء إدخال البريد الإلكتروني");
      return false;
    }
    if (!emailTrimmed.includes("@") || !emailTrimmed.includes(".") || emailTrimmed.length < 5) {
      setError("الرجاء إدخال بريد إلكتروني صحيح");
      return false;
    }
    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    } else {
      // Don't validate step 3 when clicking next (only on submit)
      isValid = true;
    }
    
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateStep3()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(firestoreDb, "userProfiles", cred.user.uid), { uid: cred.user.uid, role });
      
      const calculatedAge = birthDate ? calculateAge(birthDate) : null;
      
      if (role === "patient") {
        await addDoc(collection(firestoreDb, "patients"), {
          name: name || email.split("@")[0],
          age: calculatedAge || 0,
          birthDate: birthDate || null,
          status: "متابعة",
          nextAppointment: "",
          riskLevel: "منخفض",
          phone: `${countryCode} ${phone}`,
          email,
          address,
          governorate: governorate || null,
          consultationType: consultationType || "both",
          assignedDoctor,
          priority: "متوسط",
          uid: cred.user.uid,
        });
      } else {
        // تنسيق رقم الهاتف قبل الحفظ
        const { formatPhoneNumber } = await import("@/lib/formatUtils");
        const formattedPhone = doctorPhone && doctorPhone.trim() ? formatPhoneNumber(`${countryCode} ${doctorPhone}`) : null;

        await addDoc(collection(firestoreDb, "doctorRegistrationRequests"), {
          uid: cred.user.uid,
          email,
          name: name || "طبيب",
          age: calculatedAge || (doctorAge ? parseInt(doctorAge, 10) : null),
          birthDate: birthDate || null,
          education: doctorEducation || "",
          specialization: doctorSpecialization || null,
          experienceYears: doctorExperienceYears ? parseInt(doctorExperienceYears, 10) : null,
          phone: formattedPhone,
          phoneNumber: formattedPhone, // For backward compatibility
          governorate: doctorGovernorate || null,
          status: "pending",
          createdAt: new Date().toISOString(),
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          additionalInfoRequest: null,
        });
        setShowApprovalDialog(true);
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
        return;
      }
      setRole(role);
      navigate(role === "doctor" ? "/doctor" : "/risk-assessment");
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const map: Record<string, string> = {
        "auth/invalid-email": "البريد الإلكتروني غير صالح.",
        "auth/email-already-in-use": "هذا البريد مسجّل مسبقاً.",
        "auth/weak-password": "كلمة المرور ضعيفة (6 أحرف على الأقل).",
        "permission-denied": "صلاحيات غير كافية للوصول إلى البيانات.",
      };
      setError(map[code || ""] || "فشل إنشاء الحساب. تأكدي من صحة البيانات.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const countryCodes = [
    { code: "+20", flag: "🇪🇬", country: "مصر" },
    { code: "+966", flag: "🇸🇦", country: "السعودية" },
    { code: "+971", flag: "🇦🇪", country: "الإمارات" },
    { code: "+965", flag: "🇰🇼", country: "الكويت" },
    { code: "+974", flag: "🇶🇦", country: "قطر" },
    { code: "+973", flag: "🇧🇭", country: "البحرين" },
    { code: "+962", flag: "🇯🇴", country: "الأردن" },
  ];

  const progress = (currentStep / totalSteps) * 100;
  
  const stepTitles = role === "patient" 
    ? ["المعلومات الشخصية", "معلومات الاتصال", "إنشاء الحساب"]
    : ["المعلومات الشخصية", "المعلومات المهنية", "إنشاء الحساب"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -ml-48 -mb-48" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl relative z-10"
      >
        <Card className="shadow-2xl border-2 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm relative overflow-hidden">
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-xl -ml-12 -mb-12" />
          
          <CardHeader className="relative z-10 pb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {role === 'doctor' ? 'إنشاء حساب طبيب' : 'إنشاء حساب مريضة'}
                </CardTitle>
                <CardDescription className="font-body text-base mt-2 flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {role === 'doctor' 
                    ? 'انضمي لمجتمع رفيق الأمل وساعدي في دعم المريضات' 
                    : 'ابدأي رحلتك مع رفيق الأمل - مجتمع داعم ومكان آمن'}
                </CardDescription>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-muted-foreground">التقدم</span>
                <span className="text-primary font-bold">
                  الخطوة {currentStep} من {totalSteps}
                </span>
              </div>
              <Progress value={progress} className="h-3" data-rtl />
              <div className="flex items-center justify-between">
                {stepTitles.map((title, index) => {
                  const stepNum = index + 1;
                  const isActive = currentStep === stepNum;
                  const isCompleted = currentStep > stepNum;
                  return (
                    <div
                      key={stepNum}
                      className={`flex items-center gap-2 transition-all ${
                        isActive ? "text-primary font-bold" : isCompleted ? "text-primary/70" : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg scale-110"
                            : isCompleted
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : stepNum}
                      </div>
                      <span className="hidden sm:inline text-xs md:text-sm">{title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative z-10">
            <form onSubmit={onSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="mb-6">
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        المعلومات الشخصية
                      </h3>
                      <p className="text-sm text-muted-foreground">أدخلي معلوماتك الأساسية للبدء</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        الاسم الكامل <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                        <Input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="أدخلي اسمك الكامل"
                          required
                          className="pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        تاريخ الميلاد <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                        <Input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          required
                          className="pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                        />
                      </div>
                      {birthDate && calculateAge(birthDate) !== null && (
                        <p className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          العمر: {calculateAge(birthDate)} سنة
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Contact/Professional Information */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {role === "patient" ? (
                      <>
                        <div className="mb-6">
                          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <Phone className="h-5 w-5 text-primary" />
                            معلومات الاتصال
                          </h3>
                          <p className="text-sm text-muted-foreground">كيف يمكننا التواصل معك؟</p>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            رقم الهاتف <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-3 gap-3" dir="ltr">
                            <Select value={countryCode} onValueChange={setCountryCode}>
                              <SelectTrigger className="col-span-1 h-12 border-2 focus:border-primary/50 bg-background/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {countryCodes.map((cc) => (
                                  <SelectItem key={cc.code} value={cc.code}>
                                    <div className="flex items-center gap-2">
                                      <span>{cc.flag}</span>
                                      <span>{cc.code}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="relative col-span-2">
                              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                              <Input
                                dir="ltr"
                                inputMode="tel"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="1X XXX XXXX"
                                required
                                className="pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            العنوان <span className="text-red-500">*</span>
                          </label>
                          <AddressAutocomplete
                            value={address}
                            onChange={setAddress}
                            placeholder="ابحثي عن العنوان (مثال: القاهرة، الجيزة، مصر الجديدة...)"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            المحافظة <span className="text-red-500">*</span>
                          </label>
                          <Select value={governorate} onValueChange={setGovernorate}>
                            <SelectTrigger className="w-full h-12 border-2 focus:border-primary/50 bg-background/50 text-right [&>span]:text-right">
                              <SelectValue placeholder="اختر المحافظة" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="text-right">
                              {governorates.map((gov) => (
                                <SelectItem key={gov} value={gov} dir="rtl" className="text-right">
                                  {gov}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <Video className="h-4 w-4 text-primary" />
                            نوع الاستشارة <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setConsultationType("both")}
                              className={`h-14 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                                consultationType === "both"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-background/50 hover:border-primary/50"
                              }`}
                            >
                              <Building2 className="h-5 w-5" />
                              <div className="text-right">
                                <div className="font-semibold">حضوري وأونلاين</div>
                                <div className="text-xs text-muted-foreground">في نفس المحافظة</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConsultationType("online_only")}
                              className={`h-14 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                                consultationType === "online_only"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-background/50 hover:border-primary/50"
                              }`}
                            >
                              <Video className="h-5 w-5" />
                              <div className="text-right">
                                <div className="font-semibold">أونلاين فقط</div>
                                <div className="text-xs text-muted-foreground">جميع المحافظات</div>
                              </div>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-primary" />
                            الطبيب المتابع <span className="text-xs text-muted-foreground">(اختياري)</span>
                          </label>
                          <div className="relative">
                            <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-20 pointer-events-none" />
                            <Select value={assignedDoctor || undefined} onValueChange={setAssignedDoctor}>
                              <SelectTrigger className="w-full h-12 pr-10 pl-10 border-2 focus:border-primary/50 bg-background/50 text-right justify-between [&>span]:text-right" dir="ltr">
                                <SelectValue placeholder="— بدون اختيار —" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredDoctors.length > 0 ? (
                                  filteredDoctors.map((d) => (
                                    <SelectItem
                                      key={d.id}
                                      value={d.uid}
                                      disabled={d.acceptingPatients === false}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{d.name || d.email}</span>
                                        {d.acceptingPatients === false && (
                                          <Badge variant="outline" className="text-xs">
                                            مكتفى
                                          </Badge>
                                        )}
                                        {consultationType === "online_only" && (
                                          <Badge variant="secondary" className="text-xs">
                                            أونلاين
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-3 text-sm text-muted-foreground text-center">
                                    {governorate && consultationType === "both"
                                      ? "لا يوجد أطباء متاحين في هذه المحافظة"
                                      : "لا يوجد أطباء متاحين"}
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            {doctors.length === 0 && (
                              <div className="text-xs text-muted-foreground mt-2 p-3 bg-muted/30 rounded-lg">
                                💡 إذا لم تظهر قائمة الأطباء، أكملي التسجيل أولاً ثم حددي الطبيب من صفحتك الشخصية.
                              </div>
                            )}
                            {doctors.length > 0 && filteredDoctors.length === 0 && (
                              <div className="text-xs text-muted-foreground mt-2 p-3 bg-muted/30 rounded-lg">
                                💡 لا يوجد أطباء متاحين حسب اختياراتك. جربي تغيير المحافظة أو نوع الاستشارة.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-6">
                          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            المعلومات المهنية
                          </h3>
                          <p className="text-sm text-muted-foreground">أدخلي معلوماتك المهنية والتخصص</p>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            مكان الدراسة / الجامعة <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <GraduationCap className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                            <Input
                              type="text"
                              value={doctorEducation}
                              onChange={(e) => setDoctorEducation(e.target.value)}
                              placeholder="مثال: جامعة القاهرة - كلية الطب"
                              required
                              className="pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-primary" />
                            التخصص في سرطان الثدي <span className="text-red-500">*</span>
                          </label>
                          <Select value={doctorSpecialization} onValueChange={setDoctorSpecialization}>
                            <SelectTrigger dir="rtl" className="w-full h-12 border-2 focus:border-primary/50 bg-background/50 text-right [&>span]:text-right">
                              <SelectValue placeholder="اختر تخصصك" />
                            </SelectTrigger>
                            <SelectContent 
                              dir="rtl" 
                              className="text-right min-w-[var(--radix-select-trigger-width)]" 
                              position="popper" 
                              side="bottom" 
                              align="start"
                              sideOffset={4}
                              alignOffset={0}
                            >
                              {breastCancerSpecializations.map((spec) => (
                                <SelectItem key={spec.value} value={spec.value} dir="rtl" className="text-right cursor-pointer">
                                  <div className="text-right w-full pr-6">
                                    <div className="font-medium text-right">{spec.label}</div>
                                    <div className="text-xs text-muted-foreground text-right mt-1">{spec.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary" />
                            سنوات الخبرة <span className="text-xs text-muted-foreground">(اختياري)</span>
                          </label>
                          <div className="relative">
                            <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                            <Input
                              type="number"
                              value={doctorExperienceYears}
                              onChange={(e) => setDoctorExperienceYears(e.target.value)}
                              placeholder="عدد السنوات"
                              min="0"
                              className="pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            يمكنك تحديث باقي المعلومات من صفحة الملف الشخصي
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            رقم الهاتف <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-3 gap-3" dir="ltr">
                            <Select value={countryCode} onValueChange={setCountryCode}>
                              <SelectTrigger className="col-span-1 h-12 border-2 focus:border-primary/50 bg-background/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {countryCodes.map((cc) => (
                                  <SelectItem key={cc.code} value={cc.code}>
                                    <div className="flex items-center gap-2">
                                      <span>{cc.flag}</span>
                                      <span>{cc.code}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="relative col-span-2">
                              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                              <Input
                                dir="ltr"
                                inputMode="tel"
                                type="tel"
                                value={doctorPhone}
                                onChange={(e) => setDoctorPhone(e.target.value)}
                                placeholder="1X XXX XXXX"
                                required
                                className="pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            المحافظة <span className="text-red-500">*</span>
                          </label>
                          <Select value={doctorGovernorate} onValueChange={setDoctorGovernorate}>
                            <SelectTrigger className="w-full h-12 border-2 focus:border-primary/50 bg-background/50 text-right [&>span]:text-right">
                              <SelectValue placeholder="اختر المحافظة" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="text-right">
                              {governorates.map((gov) => (
                                <SelectItem key={gov} value={gov} dir="rtl" className="text-right">
                                  {gov}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Account Creation */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="mb-6">
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        إنشاء الحساب
                      </h3>
                      <p className="text-sm text-muted-foreground">أدخلي بيانات تسجيل الدخول</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        البريد الإلكتروني <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            // Clear error when user starts typing
                            if (error && error.includes("بريد إلكتروني")) {
                              setError(null);
                            }
                          }}
                          placeholder="example@email.com"
                          className="pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                          onBlur={() => {
                            // Only validate on blur if user has entered something
                            if (email.trim() && currentStep === 3) {
                              const emailTrimmed = email.trim();
                              if (emailTrimmed && (!emailTrimmed.includes("@") || !emailTrimmed.includes(".") || emailTrimmed.length < 5)) {
                                setError("الرجاء إدخال بريد إلكتروني صحيح");
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        {showPassword ? <EyeOff className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-primary" />}
                        كلمة المرور <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            // Clear error when user starts typing
                            if (error && error.includes("كلمة المرور")) {
                              setError(null);
                            }
                          }}
                          placeholder="6 أحرف على الأقل"
                          className="pr-11 pl-10 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                          onBlur={() => {
                            // Only validate on blur if user has entered something
                            if (password && currentStep === 3 && password.length < 6) {
                              setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/60 hover:text-primary transition-colors z-10"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="toggle password"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">يجب أن تحتوي على 6 أحرف على الأقل</p>
                    </div>

                    {/* Summary Section */}
                    <Card className="bg-primary/5 border-primary/20 mt-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">ملخص المعلومات</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">الاسم:</span>
                          <span className="font-medium">{name || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">العمر:</span>
                          <span className="font-medium">
                            {birthDate && calculateAge(birthDate) ? `${calculateAge(birthDate)} سنة` : "—"}
                          </span>
                        </div>
                        {role === "patient" && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">الهاتف:</span>
                              <span className="font-medium">{phone ? `${countryCode} ${phone}` : "—"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">العنوان:</span>
                              <span className="font-medium">{address || "—"}</span>
                            </div>
                          </>
                        )}
                        {role === "doctor" && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">التعليم:</span>
                              <span className="font-medium">{doctorEducation || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">التخصص:</span>
                              <span className="font-medium">
                                {doctorSpecialization
                                  ? breastCancerSpecializations.find((s) => s.value === doctorSpecialization)?.label
                                  : "—"}
                              </span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Alert variant="destructive" className="border-2">
                      <AlertCircle className="h-5 w-5" />
                      <AlertDescription className="font-medium">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        جاري إنشاء الحساب...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        إنشاء الحساب
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  لديك حساب بالفعل؟{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-semibold inline-flex items-center gap-1 transition-colors">
                    سجّلي الدخول
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Dialog للموافقة على تسجيل الطبيب */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center text-2xl font-bold">
                طلب التسجيل قيد المراجعة
              </DialogTitle>
              <div className="text-center text-base mt-4 space-y-3">
                <p className="text-foreground">
                  شكراً لك على اهتمامك بالانضمام إلى منصة رفيق الأمل كطبيب.
                </p>
                <p className="text-foreground">
                  تم إرسال طلب تسجيلك إلى إدارة المنصة، وسيتم مراجعة بياناتك والتأكد من هويتك الطبية.
                </p>
                <p className="text-foreground font-semibold text-primary">
                  سيتم إشعارك عبر البريد الإلكتروني عند الموافقة على طلبك.
                </p>
              </div>
            </DialogHeader>
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => {
                  setShowApprovalDialog(false);
                  navigate("/login");
                }}
                className="bg-gradient-to-r from-primary to-primary/90"
              >
                العودة إلى صفحة تسجيل الدخول
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
