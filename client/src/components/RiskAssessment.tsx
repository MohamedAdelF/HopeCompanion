import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Shield, Sparkles, TrendingUp, Heart, ArrowLeftCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, updateDoc, doc, getDoc, firestoreDb } from "@/lib/firebase";
import { getDocs } from "@/lib/firebase";
import { query as fsQuery, where as fsWhere } from "@/lib/firebase";
import { updateDoc as fsUpdateDoc } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/AuthProvider";
import { Link } from "wouter";

// الأسئلة الأساسية - التقييم الأول (Gail Model الأساسي)
const basicQuestions = [
  {
    id: "age",
    question: "كم عمرك؟",
    options: [
      { value: "under40", label: "أقل من 40 سنة", risk: 1 },
      { value: "40-50", label: "40-50 سنة", risk: 2 },
      { value: "50-60", label: "50-60 سنة", risk: 3 },
      { value: "over60", label: "أكثر من 60 سنة", risk: 4 },
    ],
  },
  {
    id: "family",
    question: "هل يوجد تاريخ عائلي للإصابة بسرطان الثدي؟",
    options: [
      { value: "no", label: "لا يوجد", risk: 0 },
      { value: "distant", label: "أقارب من الدرجة الثانية", risk: 2 },
      { value: "close", label: "أقارب من الدرجة الأولى", risk: 4 },
    ],
  },
  {
    id: "activity",
    question: "هل تمارسين الرياضة بانتظام؟",
    options: [
      { value: "yes", label: "نعم، أكثر من 3 مرات أسبوعياً", risk: 0 },
      { value: "sometimes", label: "أحياناً", risk: 1 },
      { value: "no", label: "لا", risk: 2 },
    ],
  },
  {
    id: "menstruation",
    question: "في أي عمر بدأت الدورة الشهرية؟",
    options: [
      { value: "over13", label: "أكبر من 13", risk: 0 },
      { value: "12-13", label: "من 12 إلى 13", risk: 1 },
      { value: "under12", label: "أقل من 12", risk: 2 },
    ],
  },
  {
    id: "pregnancy",
    question: "هل لديكِ حمل كامل سابق أو رضاعة طبيعية؟",
    options: [
      { value: "both", label: "نعم، كِلاهما", risk: 0 },
      { value: "one", label: "واحد منهما", risk: 1 },
      { value: "none", label: "لا", risk: 2 },
    ],
  },
  {
    id: "weight",
    question: "مؤشر كتلة الجسم (تقريباً)",
    options: [
      { value: "<25", label: "أقل من 25", risk: 0 },
      { value: "25-30", label: "25-30", risk: 1 },
      { value: ">30", label: "أكبر من 30", risk: 2 },
    ],
  },
];

// الأسئلة المتوسطة - التقييم الثاني (Gail Model + Tyrer-Cuzick)
const intermediateQuestions = [
  {
    id: "family_detail",
    question: "كم عدد أقاربك من الدرجة الأولى (أم، أخت، ابنة) الذين أصيبوا بسرطان الثدي؟",
    options: [
      { value: "none", label: "لا يوجد", risk: 0 },
      { value: "one", label: "واحد", risk: 3 },
      { value: "two", label: "اثنان أو أكثر", risk: 6 },
    ],
  },
  {
    id: "family_age",
    question: "في أي عمر أصيب أقرباؤك بسرطان الثدي؟",
    options: [
      { value: "no_family", label: "لا يوجد تاريخ عائلي", risk: 0 },
      { value: "over50", label: "أكثر من 50 سنة", risk: 1 },
      { value: "under50", label: "أقل من 50 سنة", risk: 3 },
    ],
  },
  {
    id: "biopsy",
    question: "هل أجريتِ خزعة سابقة للثدي؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes_normal", label: "نعم، وكانت النتيجة طبيعية", risk: 1 },
      { value: "yes_atypical", label: "نعم، وكانت هناك تغيرات غير طبيعية", risk: 4 },
    ],
  },
  {
    id: "menopause",
    question: "هل وصلتِ لسن اليأس (انقطاع الطمث)؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes_natural", label: "نعم، طبيعياً", risk: 1 },
      { value: "yes_surgical", label: "نعم، جراحياً (استئصال المبيضين)", risk: 2 },
    ],
  },
  {
    id: "hormone_therapy",
    question: "هل استخدمتِ علاجاً هرمونياً (مثل حبوب منع الحمل أو العلاج الهرموني بعد انقطاع الطمث)؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes_short", label: "نعم، لمدة أقل من 5 سنوات", risk: 1 },
      { value: "yes_long", label: "نعم، لمدة 5 سنوات أو أكثر", risk: 2 },
    ],
  },
  {
    id: "alcohol",
    question: "ما هي كمية الكحول التي تتناولينها؟",
    options: [
      { value: "none", label: "لا أتناول الكحول", risk: 0 },
      { value: "occasional", label: "نادراً (أقل من مرة أسبوعياً)", risk: 1 },
      { value: "regular", label: "بانتظام (مرة أو أكثر أسبوعياً)", risk: 2 },
    ],
  },
];

// الأسئلة المتقدمة - التقييم الثالث وما بعده (BRCAPRO + معايير متقدمة)
const advancedQuestions = [
  {
    id: "genetic_testing",
    question: "هل أجريتِ فحصاً وراثياً للجينات (BRCA1/BRCA2)؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes_negative", label: "نعم، وكانت النتيجة سلبية", risk: 0 },
      { value: "yes_positive", label: "نعم، وكانت النتيجة إيجابية", risk: 8 },
      { value: "unknown", label: "لا أعرف", risk: 1 },
    ],
  },
  {
    id: "ovarian_cancer",
    question: "هل يوجد تاريخ عائلي لسرطان المبيض؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes", label: "نعم", risk: 3 },
    ],
  },
  {
    id: "dense_breasts",
    question: "هل تم إخبارك أن لديكِ أنسجة ثدي كثيفة (من فحص ماموجرام سابق)؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes", label: "نعم", risk: 2 },
      { value: "unknown", label: "لا أعرف / لم أقم بفحص ماموجرام", risk: 0 },
    ],
  },
  {
    id: "radiation",
    question: "هل تلقيتِ علاجاً إشعاعياً في منطقة الصدر قبل سن 30؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes", label: "نعم", risk: 4 },
    ],
  },
  {
    id: "diabetes",
    question: "هل تعانين من مرض السكري؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes_type2", label: "نعم، النوع الثاني", risk: 1 },
      { value: "yes_type1", label: "نعم، النوع الأول", risk: 0 },
    ],
  },
  {
    id: "previous_cancer",
    question: "هل أصبتِ سابقاً بسرطان الثدي أو سرطان آخر؟",
    options: [
      { value: "no", label: "لا", risk: 0 },
      { value: "yes_breast", label: "نعم، سرطان الثدي", risk: 5 },
      { value: "yes_other", label: "نعم، سرطان آخر", risk: 2 },
    ],
  },
];

// دالة للحصول على الأسئلة المناسبة بناءً على عدد التقييمات السابقة
function getQuestionsForAssessment(assessmentCount: number) {
  if (assessmentCount === 0) {
    // التقييم الأول: أسئلة أساسية
    return basicQuestions;
  } else if (assessmentCount === 1) {
    // التقييم الثاني: أسئلة متوسطة
    return intermediateQuestions;
  } else {
    // التقييم الثالث وما بعده: أسئلة متقدمة
    return advancedQuestions;
  }
}

export function RiskAssessment() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [proceed, setProceed] = useState(false);
  const [lockedInfo, setLockedInfo] = useState<{ locked: boolean; lastDate?: Date } | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: patients, isLoading: isLoadingPatients } = useQuery<{ id: string }[]>({
    queryKey: ["patients:first", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const fs = await import("@/lib/firebase");
      try {
        const snap = await fs.getDocs(fs.query(fs.collection(fs.firestoreDb, "patients"), fs.where("uid", "==", user.uid)));
        return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      } catch (error) {
        console.error("Error fetching patients:", error);
        return [];
      }
    },
    enabled: !!user?.uid, // فقط للمستخدمين المسجلين
  });
  const patientId = patients?.[0]?.id;
  const needsProfile = useMemo(() => !user || !patientId, [user, patientId]);
  const [hasCompletedAssessment, setHasCompletedAssessment] = useState<boolean | null>(null);
  const [assessmentCount, setAssessmentCount] = useState<number>(0);
  
  // إعادة جلب البيانات عند تغيير patientId أو عند تحميل الصفحة
  useEffect(() => {
    if (user && patientId) {
      queryClient.invalidateQueries({ queryKey: ["assessment:last", patientId] });
    }
  }, [user, patientId, queryClient]);

  // منع إعادة التقييم إذا كان التقييم مقفولاً
  useEffect(() => {
    // إذا كان هناك قفل وتقييم محفوظ، تأكد من عدم إمكانية إعادة التقييم
    if (user && patientId && lockedInfo?.locked && showResults) {
      // إذا كان showResults = true ولكن التقييم مقفول، هذا يعني أن التقييم تم للتو
      // لا نفعل شيء هنا، فقط نتأكد من أن المستخدم لا يستطيع إعادة التقييم
      // التحقق يتم في handleNext و handleAnswer
    }
    // إذا كان هناك قفل ولكن showResults = false، هذا يعني أن المستخدم حاول إعادة التقييم
    // سيتم عرض شاشة القفل تلقائياً في الشرط السابق
  }, [showResults, lockedInfo, user, patientId]);

  // جلب آخر تقييم وآخر طلب إعادة تقييم قبل أي إرجاع مشروط
  const { isLoading: isLoadingAssessment, isError: isErrorAssessment } = useQuery({
    queryKey: ["assessment:last", patientId],
    enabled: !!user && !!patientId,
    refetchOnMount: "always", // دائماً إعادة الجلب عند تحميل الصفحة
    refetchOnWindowFocus: true, // إعادة الجلب عند التركيز على النافذة
    staleTime: 0, // البيانات غير صالحة فوراً - لا استخدام cache
    cacheTime: 0, // لا تخزين cache
    queryFn: async () => {
      if (!user || !patientId) return null;
      try {
        // جلب جميع التقييمات بدون orderBy لتجنب مشكلة الفهرس
        const allSnap = await getDocs(fsQuery(collection(firestoreDb, "assessments"), fsWhere("patientId", "==", patientId)));
        // Sort client-side by createdAt descending
        const sorted = allSnap.docs.sort((a: any, b: any) => {
          const aDate = new Date((a.data() as any).createdAt || 0).getTime();
          const bDate = new Date((b.data() as any).createdAt || 0).getTime();
          return bDate - aDate;
        });
        const snap = { docs: sorted.slice(0, 1) } as any;
        const lastDate = snap.docs[0] ? new Date((snap.docs[0].data() as any).createdAt) : undefined;
        
        // حساب عدد التقييمات السابقة
        const count = sorted.length;
        setAssessmentCount(count);
        
        // جلب آخر طلب إعادة تقييم بدون orderBy لتجنب مشكلة الفهرس
        let req: any | undefined;
        try {
          const allReqSnap = await getDocs(fsQuery(collection(firestoreDb, "reassessmentRequests"), fsWhere("patientId", "==", patientId)));
          // Sort client-side by createdAt descending
          const sorted = allReqSnap.docs.sort((a: any, b: any) => {
            const aDate = new Date((a.data() as any).createdAt || 0).getTime();
            const bDate = new Date((b.data() as any).createdAt || 0).getTime();
            return bDate - aDate;
          });
          req = sorted[0]?.data() as any | undefined;
        } catch (error: any) {
          console.warn("⚠️ فشل جلب reassessmentRequests:", error);
          req = undefined;
        }
        setPendingRequest(req || null);
        const hasCompleted = !!lastDate;
        setHasCompletedAssessment(hasCompleted);
        if (!lastDate) { 
          setLockedInfo({ locked: false }); 
          return null; 
        }
        const diffDays = (Date.now() - lastDate.getTime()) / (1000*60*60*24);
        const approved = req && req.status === 'approved';
        
        // التحقق من نوع آخر تقييم
        const lastAssessmentData = sorted[0]?.data() as any;
        const lastAssessmentNumber = lastAssessmentData?.assessmentNumber || 1;
        const isFirstAssessment = lastAssessmentNumber === 1;
        
        // القفل يطبق فقط على التقييم الأول (إلزامي)
        // التقييم الثاني والثالث اختياري (لا قفل)
        const isLocked = isFirstAssessment && diffDays < 30 && !approved;
        
        console.log(`🔒 تحقق من القفل: آخر تقييم كان قبل ${Math.floor(diffDays)} يوم (رقم ${lastAssessmentNumber}). القفل: ${isLocked ? 'مفعّل' : 'غير مفعّل'} ${isFirstAssessment ? '(تقييم أول - إلزامي)' : '(تقييم اختياري)'}`);
        setLockedInfo({ locked: isLocked, lastDate });
        return null;
      } catch (error) {
        console.error("Error fetching assessment:", error);
        // في حالة الخطأ، نفترض أنه لا يوجد قفل (يسمح بالتقييم)
        setLockedInfo({ locked: false });
        setHasCompletedAssessment(false);
        return null;
      }
    }
  });

// شاشة الانتظار - عند جلب بيانات المريض أو التقييم
// يجب الانتظار فقط إذا كان الاستعلام قيد التحميل
// إذا انتهى الاستعلام ولكن lockedInfo === null، هذا يعني لا يوجد تقييم (يسمح بالتقييم)
if (!!user && !needsProfile && patientId && !isErrorAssessment && (isLoadingPatients || isLoadingAssessment)) {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Card className="shadow-lg border-2 bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Shield className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <CardTitle className="text-2xl">جارٍ التحقق من أهلية التقييم…</CardTitle>
            </div>
            <CardDescription className="font-body text-base text-center">
              ثوانٍ قليلة وسنخبرك ما إذا كان بإمكانك إكمال التقييم الآن.
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  );
}

// شاشة القفل الشهري - يجب التحقق قبل عرض أي شيء
// التحقق من القفل: القفل يطبق فقط على التقييم الأول (إلزامي)
// التقييم الثاني والثالث اختياريان (لا قفل)
// إذا كان showResults = true (بعد حفظ التقييم)، نسمح بعرض النتائج فقط، لا نسمح بإعادة التقييم
// إذا كان showResults = false، نمنع الوصول للأسئلة تماماً (التقييم الأول فقط)
// ملاحظة: يجب أن ننتظر حتى ينتهي التحميل (isLoadingAssessment = false) قبل التحقق من القفل
if (!!user && !needsProfile && patientId && !isLoadingAssessment && !isErrorAssessment && lockedInfo !== null && lockedInfo?.locked === true && !showResults && assessmentCount === 0) {
  console.log("🚫 منع التقييم الأول: القفل مفعّل (إلزامي)");
    const last = lockedInfo.lastDate ? lockedInfo.lastDate.toLocaleDateString('ar-EG') : '';
    return (
      <div className="max-w-3xl mx-auto p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="shadow-lg border-2 bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-amber-100 dark:bg-amber-950/30 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">التقييم الأول مكتمل</CardTitle>
                  <CardDescription className="font-body text-base mt-1">
                    أكملتِ التقييم الأول (الإلزامي) بتاريخ {last}. 
                    {lockedInfo.lastDate && (() => {
                      const daysRemaining = Math.max(0, Math.ceil(30 - ((Date.now() - lockedInfo.lastDate.getTime()) / (1000 * 60 * 60 * 24))));
                      return daysRemaining > 0 ? ` يمكنك إجراء التقييم الثاني (اختياري) بعد ${daysRemaining} يوم.` : ' يمكنك إجراء التقييم الثاني (اختياري) الآن.';
                    })()} 
                    <span className="block mt-2 text-sm text-muted-foreground">
                      💡 التقييم الثاني والثالث اختياريان ويمكنك تخطيهما. التقييم الأول كان إلزامياً لمعرفة حالتك الأولية.
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingRequest && pendingRequest.status !== 'rejected' ? (
                <Alert className={pendingRequest.status === 'approved' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>طلب إعادة تقييم</AlertTitle>
                  <AlertDescription>
                    {pendingRequest.status === 'approved' ? 'طلبك مقبول — يمكنك المتابعة الآن!' : 'طلبك قيد المراجعة لدى الطبيب'}
                  </AlertDescription>
                </Alert>
              ) : (
                <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 shadow-lg">
                        <Sparkles className="ml-2 h-5 w-5" />
                        طلب إعادة تقييم عاجل
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-xl">اذكري سبب الطلب</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea 
                        placeholder="مثال: ظهور أعراض جديدة/تغير ملحوظ في الحالة الصحية..." 
                        value={requestReason} 
                        onChange={(e) => setRequestReason(e.target.value)}
                        className="min-h-24"
                      />
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setRequestOpen(false)}>إلغاء</Button>
                        <Button onClick={async () => {
                          if (!user || !patientId || !requestReason.trim()) return;
                          await addDoc(collection(firestoreDb, 'reassessmentRequests'), { patientId, reason: requestReason, status: 'pending', createdAt: new Date().toISOString() });
                          setRequestReason('');
                          setRequestOpen(false);
                        }} className="bg-gradient-to-r from-primary to-primary/90">
                          إرسال الطلب
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const saveAssessment = async () => {
    if (!user || !patientId) {
      // لا يمكن حفظ التقييم بدون تسجيل دخول و patientId
      // لكن يمكن عرض النتائج للمستخدمين غير المسجلين
      return;
    }
    try {
      // حساب المخاطر بناءً على الأسئلة المستخدمة
      let score = calculateRisk();
      
      // تحديد مستوى الخطر بناءً على نوع الأسئلة
      const maxRisk = assessmentCount === 0 ? 15 : assessmentCount === 1 ? 18 : 25;
      const lowThreshold = Math.floor(maxRisk * 0.2);
      const mediumThreshold = Math.floor(maxRisk * 0.5);
      
      const level = score <= lowThreshold ? "منخفض" : score <= mediumThreshold ? "متوسط" : "مرتفع";
      const now = new Date();
      
      // تحديد نوع الأسئلة المستخدمة
      const questionType = assessmentCount === 0 ? "basic" : assessmentCount === 1 ? "intermediate" : "advanced";
      
      // حفظ التقييم في Firebase
      const assessmentData = {
        patientId,
        score,
        level,
        createdAt: now.toISOString(),
        questionType, // حفظ نوع الأسئلة المستخدمة
        assessmentNumber: assessmentCount + 1, // رقم التقييم (1, 2, 3, ...)
        recommendations: [
          "الفحص الذاتي الشهري للثدي",
          "زيارة الطبيب للفحص السنوي",
          "الحفاظ على نمط حياة صحي",
        ].concat(score > 6 ? ["يُنصح بإجراء فحص ماموجرام في أقرب وقت"] : []),
        answers,
      };
      console.log("💾 بدء حفظ التقييم في Firebase:", {
        patientId,
        score,
        level,
        createdAt: now.toISOString(),
        "patientId type": typeof patientId,
        "patientId value": JSON.stringify(patientId)
      });
      console.log("📝 البيانات الكاملة للتقييم:", JSON.stringify(assessmentData, null, 2));
      
      const assessmentDoc = await addDoc(collection(firestoreDb, "assessments"), assessmentData);
      
      // التحقق من أن البيانات حُفظت بشكل صحيح
      const verifySnap = await getDocs(fsQuery(collection(firestoreDb, "assessments"), fsWhere("__name__", "==", assessmentDoc.id)));
      const savedData = verifySnap.docs[0]?.data();
      
      console.log("✅ تم حفظ التقييم بنجاح!", {
        documentId: assessmentDoc.id,
        patientId: patientId,
        savedPatientId: savedData?.patientId,
        matches: savedData?.patientId === patientId,
        level,
        score,
        "verification": savedData ? "✅ البيانات محفوظة بشكل صحيح" : "❌ لا يمكن التحقق من البيانات"
      });
      
      // تحديث طلبات إعادة التقييم المعتمدة
      const reqSnap2 = await getDocs(fsQuery(collection(firestoreDb, 'reassessmentRequests'), fsWhere('patientId','==', patientId), fsWhere('status','==','approved')));
      for (const d of reqSnap2.docs) { 
        await fsUpdateDoc(doc(firestoreDb, 'reassessmentRequests', d.id), { status: 'used' }); 
      }
      
      // تحديث مستوى الخطر وتاريخ آخر تقييم في ملف المريض
      await updateDoc(doc(firestoreDb, "patients", patientId), { 
        riskLevel: level,
        lastAssessmentDate: now.toISOString() // إضافة تاريخ آخر تقييم
      });
      
      if (level === "مرتفع") {
        await addDoc(collection(firestoreDb, "alerts"), {
          patientId,
          type: "risk",
          message: "مستوى الخطر مرتفع — يُنصح بمتابعة عاجلة.",
          status: "open",
          createdAt: now.toISOString(),
        });
        
        // Send WhatsApp notification for high risk
        try {
          // Get assigned doctor UID
          const patientDoc = await getDoc(doc(firestoreDb, "patients", patientId));
          const assignedDoctor = patientDoc.exists() ? patientDoc.data()?.assignedDoctor : null;
          
          const { notifyHighRisk } = await import("@/lib/notifications");
          await notifyHighRisk(patientId, assignedDoctor || null);
        } catch (error) {
          console.error("Error sending high risk notification:", error);
          // Don't show error to user - notification is optional
        }
      }
      
      // إرسال رسالة إلى لوحة تحكم الطبيب
      await addDoc(collection(firestoreDb, "messages"), {
        patientId,
        text: `تم إرسال تقييم مخاطر جديد — النتيجة: ${level} (الدرجة: ${score})`,
        status: "unread",
        createdAt: now.toISOString(),
        type: "assessment",
      });
      
      // إضافة موعد تلقائي لإعادة التقييم بعد 30 يوم
      const nextAssessmentDate = new Date(now);
      nextAssessmentDate.setDate(nextAssessmentDate.getDate() + 30); // إضافة 30 يوم
      
      await addDoc(collection(firestoreDb, "appointments"), {
        patientId,
        at: nextAssessmentDate.toISOString(),
        note: "موعد إعادة تقييم المخاطر الشهري - يجب إكمال التقييم في هذا التاريخ",
        type: "risk_assessment",
        reminder: true,
        status: "upcoming",
        createdAt: now.toISOString(),
        isAutoCreated: true, // علامة لتحديد أنه موعد تلقائي
      });
      
      // تحديث حالة القفل مباشرة بعد حفظ التقييم
      setLockedInfo({ locked: true, lastDate: now });
      setHasCompletedAssessment(true);
      
      // إعادة جلب البيانات لتحديث الاستعلام والتحقق من القفل
      await queryClient.invalidateQueries({ queryKey: ["assessment:last", patientId] });
      await queryClient.refetchQueries({ queryKey: ["assessment:last", patientId] });
      
      console.log("✅ تم حفظ التقييم بنجاح في Firebase - القفل مفعّل لمدة 30 يوم");
    } catch (error) {
      console.error("❌ خطأ في حفظ التقييم:", error);
      // لا نمنع عرض النتائج حتى لو فشل الحفظ
      // يمكن للمستخدم رؤية النتائج ولكن لن يتم حفظها
    }
  };

  // الحصول على الأسئلة المناسبة بناءً على عدد التقييمات السابقة
  const questions = getQuestionsForAssessment(assessmentCount);
  const progress = ((currentStep + 1) / questions.length) * 100;
  const currentQuestion = questions[currentStep];
  const hasAnswer = !!answers[currentQuestion?.id];


  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleNext = async () => {
    // التحقق من القفل قبل المتابعة - منع إعادة التقييم إذا كان مقفولاً
    // هذا فحص إضافي للسلامة، لكن يجب أن يكون القفل قد تم التحقق منه عند فتح الصفحة
    if (user && patientId && lockedInfo?.locked && !showResults) {
      // محجوب شهرياً: امنعي التقدم وأعيدي العرض ليظهر كارت القيد
      setShowResults(false);
      setCurrentStep(0);
      setAnswers({});
      // إعادة جلب البيانات لضمان عرض شاشة القفل
      await queryClient.invalidateQueries({ queryKey: ["assessment:last", patientId] });
      await queryClient.refetchQueries({ queryKey: ["assessment:last", patientId] });
      return;
    }
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // قبل عرض النتائج وحفظ التقييم، تحقق من القفل مرة أخرى للسلامة (التقييم الأول فقط)
      // إعادة جلب البيانات للتأكد من أحدث حالة
      await queryClient.refetchQueries({ queryKey: ["assessment:last", patientId] });
      
      if (user && patientId && lockedInfo?.locked && !showResults && assessmentCount === 0) {
        // محجوب (التقييم الأول فقط): أعدي الحالة وأظهري شاشة القفل
        setShowResults(false);
        setCurrentStep(0);
        setAnswers({});
        return;
      }
      setShowResults(true);
      await saveAssessment();
      // بعد حفظ التقييم، تم تحديث lockedInfo - سيتم التحقق عند إعادة عرض الصفحة
      // لا يمكن إعادة التقييم إلا بعد 30 يوم أو بعد موافقة الطبيب
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateRisk = () => {
    let totalRisk = 0;
    Object.entries(answers).forEach(([questionId, answer]) => {
      const question = questions.find((q) => q.id === questionId);
      const option = question?.options.find((o) => o.value === answer);
      if (option) totalRisk += option.risk;
    });
    
    // تعديل الحدود بناءً على نوع الأسئلة
    // الأسئلة الأساسية: الحد الأقصى 15
    // الأسئلة المتوسطة: الحد الأقصى 18
    // الأسئلة المتقدمة: الحد الأقصى 25
    const maxRisk = assessmentCount === 0 ? 15 : assessmentCount === 1 ? 18 : 25;
    
    return Math.min(totalRisk, maxRisk);
  };

  const getRiskLevel = (risk: number) => {
    // تعديل الحدود بناءً على نوع الأسئلة
    const maxRisk = assessmentCount === 0 ? 15 : assessmentCount === 1 ? 18 : 25;
    const lowThreshold = Math.floor(maxRisk * 0.2); // 20% من الحد الأقصى
    const mediumThreshold = Math.floor(maxRisk * 0.5); // 50% من الحد الأقصى
    
    if (risk <= lowThreshold) return { level: "منخفض", color: "text-green-600", icon: CheckCircle2 };
    if (risk <= mediumThreshold) return { level: "متوسط", color: "text-yellow-600", icon: AlertCircle };
    return { level: "مرتفع", color: "text-red-600", icon: AlertCircle };
  };

  if (showResults) {
    const riskScore = calculateRisk();
    const riskInfo = getRiskLevel(riskScore);
    const RiskIcon = riskInfo.icon;

    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-2xl border-2 bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  نتيجة التقييم
                </CardTitle>
              </div>
        </CardHeader>
            <CardContent className="space-y-8">
              {/* Risk Level Display */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-muted/30 to-transparent rounded-xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  <div className={`p-6 rounded-full ${riskInfo.color === "text-green-600" ? "bg-green-100 dark:bg-green-950/30" : riskInfo.color === "text-yellow-600" ? "bg-yellow-100 dark:bg-yellow-950/30" : "bg-red-100 dark:bg-red-950/30"}`}>
                    <RiskIcon className={`h-20 w-20 ${riskInfo.color}`} />
            </div>
                </motion.div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-body text-muted-foreground">مستوى الخطر لديك</p>
                  <Badge 
                    variant="outline" 
                    className={`text-2xl font-bold px-6 py-2 ${riskInfo.color === "text-green-600" ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : riskInfo.color === "text-yellow-600" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400" : "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"}`}
                  >
                    {riskInfo.level}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-4">
                    الدرجة الإجمالية: <span className="font-semibold text-foreground">{riskScore}</span> من {assessmentCount === 0 ? 15 : assessmentCount === 1 ? 18 : 25}
                    {assessmentCount > 0 && (
                      <span className="block mt-1 text-xs text-muted-foreground">
                        (تقييم {assessmentCount === 1 ? "ثاني" : assessmentCount === 2 ? "ثالث" : `رقم ${assessmentCount + 1}`} - أسئلة {assessmentCount === 1 ? "متوسطة" : "متقدمة"})
                      </span>
                    )}
                  </p>
          </div>
              </motion.div>

              {/* Lock Info Message */}
              {user && patientId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  {lockedInfo?.locked ? (
                    <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-base font-bold text-green-700 dark:text-green-300">
                        ✅ تم حفظ تقييمك بنجاح في Firebase
                      </AlertTitle>
                      <AlertDescription className="text-sm text-green-600 dark:text-green-400 mt-1">
                        تم حفظ تقييمك بتاريخ {lockedInfo.lastDate ? lockedInfo.lastDate.toLocaleDateString('ar-EG') : 'اليوم'}. 
                        يمكنك إجراء تقييم جديد بعد {lockedInfo.lastDate 
                          ? Math.max(0, Math.ceil(30 - ((Date.now() - lockedInfo.lastDate.getTime()) / (1000 * 60 * 60 * 24))))
                          : 30} يوم. 
                        يمكنك طلب إعادة تقييم عاجل من صفحة الملف الشخصي إذا ظهرت أعراض جديدة.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <AlertTitle className="text-base font-bold text-blue-700 dark:text-blue-300">
                        تم حفظ تقييمك
                      </AlertTitle>
                      <AlertDescription className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        تم حفظ تقييمك بنجاح في Firebase وسيتم إرساله للطبيب المتابع لك.
                      </AlertDescription>
                    </Alert>
                  )}
                </motion.div>
              )}

              {/* Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-xl">التوصيات المخصصة</h3>
                </div>
                <Card className="bg-gradient-to-br from-background to-muted/20 border-2">
                  <CardContent className="p-6">
                    <ul className="space-y-3 mr-6">
                      {[
                        "الفحص الذاتي الشهري للثدي",
                        "زيارة الطبيب للفحص السنوي",
                        "الحفاظ على نمط حياة صحي",
                        ...(riskScore > 6 ? ["يُنصح بإجراء فحص ماموجرام في أقرب وقت"] : [])
                      ].map((rec, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-center gap-3 text-base"
                        >
                          <CheckCircle className={`h-5 w-5 ${index === 3 && riskScore > 6 ? "text-red-600" : "text-green-600"}`} />
                          <span className={index === 3 && riskScore > 6 ? "text-red-700 dark:text-red-400 font-semibold" : ""}>
                            {rec}
                          </span>
                        </motion.li>
                      ))}
            </ul>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <motion.div
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href="/">
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 shadow-lg"
                      size="lg"
                    >
                      <ArrowLeftCircle className="ml-2 h-5 w-5" />
                      العودة للصفحة الرئيسية
                    </Button>
                  </Link>
                </motion.div>
                {user && patientId && (
                  <motion.div
                    className="flex-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href="/profile">
                      <Button
                        variant="outline"
                        className="w-full h-12 border-2"
                        size="lg"
                      >
                        <Heart className="ml-2 h-5 w-5" />
                        عرض الملف الشخصي
                      </Button>
                    </Link>
                  </motion.div>
                )}
              </div>

              {/* Login Prompt for Guests */}
              {(!user || !patientId) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-4"
                >
                  <Alert className="border-primary/50 bg-primary/5">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-lg">احفظي نتيجتك</AlertTitle>
                    <AlertDescription className="mt-2">
                      لربط النتيجة بملفك وإرسالها للطبيب تلقائياً، سجّلي الدخول أو أنشئي حساباً الآن.
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Link href="/login">
                          <Button className="w-full h-11 bg-gradient-to-r from-primary to-primary/90">
                            تسجيل الدخول
                          </Button>
                        </Link>
                        <Link href="/signup/choose">
                          <Button variant="outline" className="w-full h-11">
                            إنشاء حساب
                          </Button>
                        </Link>
                      </div>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
        </CardContent>
      </Card>
        </motion.div>
      </div>
    );
  }

  if (needsProfile && !showResults && !proceed) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-2xl border-2 bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  لنبدأ قبل التقييم
                </CardTitle>
              </div>
              <CardDescription className="font-body text-base text-center">
                سجّلي الدخول أو أنشئي ملفاً لربط نتائجك بطبيبك ومتابعتها تلقائياً.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/login">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 shadow-lg" size="lg">
                      <CheckCircle2 className="ml-2 h-5 w-5" />
                      تسجيل الدخول
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/signup/choose">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" className="w-full h-12" size="lg">
                      <Sparkles className="ml-2 h-5 w-5" />
                      إنشاء ملف جديد
                    </Button>
                  </motion.div>
                </Link>
              </div>
              <div className="text-center pt-4 border-t">
                <button 
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors" 
                  onClick={() => setProceed(true)}
                >
                  المتابعة بدون تسجيل
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // فحص إضافي: التأكد من القفل قبل عرض الأسئلة
  // لا نعرض الأسئلة إذا:
  // 1. الاستعلام لا يزال قيد التحميل - ننتظر حتى ينتهي
  // 2. التقييم مقفول (lockedInfo.locked === true) - حتى لو كان showResults = false
  // ملاحظة: إذا انتهى التحميل و lockedInfo === null، يعني لا يوجد تقييم (يسمح بالتقييم)
  // تحقق من القفل قبل عرض أي شيء
  if (!!user && !needsProfile && patientId && !isErrorAssessment) {
    // إذا كان التحميل لا يزال جارياً، اظهري شاشة الانتظار
    if (isLoadingAssessment) {
      console.log("⏳ جارٍ جلب بيانات التقييم...");
      return null; // سيتم عرض شاشة الانتظار في الشرط السابق
    }
    // إذا كان هناك قفل وكان showResults = false، امنعي عرض الأسئلة
    // هذه الحالة يجب أن تكون محمية من قبل الشرط السابق (شاشة القفل)
    if (lockedInfo !== null && lockedInfo?.locked === true && !showResults) {
      console.log("🚫 منع عرض الأسئلة: القفل مفعّل");
      // لا نعرض أي شيء - سيتم عرض شاشة القفل في الشرط السابق
      return null;
    }
    if (lockedInfo !== null && lockedInfo?.locked === false) {
      console.log("✅ القفل غير مفعّل - يمكن إجراء التقييم");
    }
    if (lockedInfo === null) {
      console.log("ℹ️ لا يوجد تقييم سابق - يمكن إجراء التقييم");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Mandatory Assessment Alert for New Users - التقييم الأول فقط */}
      {user && patientId && hasCompletedAssessment === false && assessmentCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="border-2 border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5 shadow-lg">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-bold text-primary">تقييم إلزامي</AlertTitle>
            <AlertDescription className="mt-2 text-base">
              مرحباً بك! يجب إكمال التقييم الأول (الإلزامي) للوصول إلى جميع ميزات الموقع. هذا التقييم يساعدنا في معرفة حالتك الأولية وتوفير الرعاية المناسبة لكِ.
              <span className="block mt-2 text-sm text-muted-foreground">
                💡 التقييم الثاني والثالث اختياريان ويمكنك إجراؤهما لاحقاً للحصول على تقييم أكثر تفصيلاً.
              </span>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
      
      {/* Optional Assessment Info for Users with First Assessment Completed */}
      {user && patientId && hasCompletedAssessment === true && assessmentCount === 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="border-2 border-blue-500/50 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 shadow-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-lg font-bold text-blue-700 dark:text-blue-300">تقييم اختياري</AlertTitle>
            <AlertDescription className="mt-2 text-base text-blue-600 dark:text-blue-400">
              أكملتِ التقييم الأول بنجاح! يمكنك الآن إجراء التقييم الثاني (اختياري) للحصول على تقييم أكثر تفصيلاً. هذا التقييم غير إلزامي ويمكنك تخطيه.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
      
      {user && patientId && hasCompletedAssessment === true && assessmentCount >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="border-2 border-purple-500/50 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 shadow-lg">
            <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <AlertTitle className="text-lg font-bold text-purple-700 dark:text-purple-300">تقييم متقدم (اختياري)</AlertTitle>
            <AlertDescription className="mt-2 text-base text-purple-600 dark:text-purple-400">
              يمكنك إجراء التقييم الثالث (متقدم) للحصول على تقييم شامل ومفصل. هذا التقييم اختياري تماماً.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
      <motion.div 
        initial={{ opacity: 0, y: 8 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-2xl border-2 bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  تقييم المخاطر الشخصي
                </CardTitle>
                <CardDescription className="font-body text-base mt-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {assessmentCount === 0 
                    ? "أجيبي عن 6 أسئلة أساسية خلال دقيقة واحدة لتحصلي على توصيات مخصصة. خصوصيتك محفوظة."
                    : assessmentCount === 1
                    ? "أجيبي عن 6 أسئلة متوسطة التفصيل لتحصلي على تقييم أدق. خصوصيتك محفوظة."
                    : "أجيبي عن 6 أسئلة متقدمة لتحصلي على تقييم شامل ومفصل. خصوصيتك محفوظة."
                  }
        </CardDescription>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-muted-foreground">التقدم</span>
                <span className="text-primary font-bold">{currentStep + 1} من {questions.length}</span>
              </div>
              <Progress value={progress} className="h-3" data-rtl />
            </div>
      </CardHeader>
          <CardContent className="space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-right">{currentQuestion.question}</h3>
                  <p className="text-sm text-muted-foreground text-right">اختاري الإجابة الأقرب لوضعك الحالي.</p>
                </div>
          <RadioGroup
            value={answers[currentQuestion.id]}
            onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                  className="space-y-3"
                  dir="rtl"
          >
                  {currentQuestion.options.map((option, index) => (
                    <motion.div
                key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: -4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleAnswer(currentQuestion.id, option.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAnswer(currentQuestion.id, option.value);
                          }
                        }}
                        className={`w-full text-right rounded-xl border-2 p-5 transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer ${
                          answers[currentQuestion.id] === option.value 
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md' 
                            : 'border-border hover:border-primary/50 hover:bg-primary/5'
                        }`}
                        data-testid={`radio-${currentQuestion.id}-${option.value}`}
                      >
                        <span className="text-base font-medium flex-1">{option.label}</span>
                <RadioGroupItem
                  value={option.value}
                          id={`${currentQuestion.id}-${option.value}`}
                          className={answers[currentQuestion.id] === option.value ? 'border-primary' : ''}
                        />
                      </div>
                    </motion.div>
            ))}
          </RadioGroup>
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-4 pt-4 border-t">
              <motion.div 
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
                  className="w-full h-12"
            data-testid="button-previous"
                  size="lg"
          >
                  <ArrowRight className="ml-2 h-5 w-5" />
            السابق
          </Button>
              </motion.div>
              <motion.div 
                className="flex-1"
                whileHover={{ scale: hasAnswer ? 1.02 : 1 }}
                whileTap={{ scale: hasAnswer ? 0.98 : 1 }}
              >
          <Button
            onClick={handleNext}
            disabled={!hasAnswer}
                  className={`w-full h-12 bg-gradient-to-r from-primary to-primary/90 shadow-lg ${
                    !hasAnswer ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
            data-testid="button-next"
                  size="lg"
          >
                  {currentStep === questions.length - 1 ? (
                    <>
                      <TrendingUp className="mr-2 h-5 w-5" />
                      عرض النتائج
                    </>
                  ) : (
                    <>
                      التالي
                      <ArrowLeft className="mr-2 h-5 w-5" />
                    </>
                  )}
          </Button>
              </motion.div>
        </div>
            <p className="text-xs text-muted-foreground text-center">
              💡 يمكنك العودة وتغيير إجاباتك في أي وقت قبل عرض النتيجة.
            </p>
      </CardContent>
    </Card>
      </motion.div>
    </div>
  );
}
