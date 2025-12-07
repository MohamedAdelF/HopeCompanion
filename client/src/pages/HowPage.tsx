import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserPlus, 
  LogIn, 
  User, 
  Shield, 
  BookOpen, 
  NotebookPen, 
  Calendar, 
  MessageCircle, 
  Building2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ArrowRight,
  Mail,
  Lock,
  FileText,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

interface Step {
  id: number;
  title: string;
  description: string;
  icon: typeof UserPlus;
  color: string;
  details: {
    title: string;
    description: string;
    icon: typeof CheckCircle2;
  }[];
}

const steps: Step[] = [
  {
    id: 1,
    title: "التسجيل وإنشاء الحساب",
    description: "ابدئي رحلتك معنا من خلال إنشاء حساب بسيط وآمن",
    icon: UserPlus,
    color: "from-blue-500 to-blue-600",
    details: [
      {
        title: "اختيار نوع الحساب",
        description: "اختيار بين حساب مريضة أو طبيب من صفحة الاختيار",
        icon: UserPlus
      },
      {
        title: "ملء البيانات الأساسية",
        description: "إدخال الاسم، البريد الإلكتروني، كلمة المرور، والمحافظة",
        icon: FileText
      },
      {
        title: "اختيار الطبيب",
        description: "اختيار الطبيب المناسب حسب المحافظة ونوع المتابعة (أونلاين/حضوري)",
        icon: User
      },
      {
        title: "تفعيل الحساب",
        description: "التحقق من البريد الإلكتروني وتفعيل الحساب",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: 2,
    title: "تسجيل الدخول",
    description: "استخدمي بريدك الإلكتروني وكلمة المرور للدخول إلى حسابك",
    icon: LogIn,
    color: "from-green-500 to-green-600",
    details: [
      {
        title: "الذهاب لصفحة تسجيل الدخول",
        description: "الضغط على زر 'تسجيل الدخول' من الصفحة الرئيسية",
        icon: LogIn
      },
      {
        title: "إدخال بيانات الدخول",
        description: "إدخال البريد الإلكتروني وكلمة المرور",
        icon: Mail
      },
      {
        title: "التحقق من الهوية",
        description: "التحقق التلقائي من صحة البيانات",
        icon: Lock
      },
      {
        title: "الدخول للوحة التحكم",
        description: "سيتم توجيهك تلقائياً للصفحة الرئيسية أو البروفايل",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: 3,
    title: "إعداد البروفايل الشخصي",
    description: "أكملي معلوماتك الشخصية والصحية لتحصلي على أفضل تجربة",
    icon: User,
    color: "from-purple-500 to-purple-600",
    details: [
      {
        title: "الوصول للبروفايل",
        description: "الضغط على أيقونة المستخدم في شريط التنقل",
        icon: User
      },
      {
        title: "تحديث البيانات الشخصية",
        description: "إضافة أو تحديث الاسم، تاريخ الميلاد، رقم الهاتف، والعنوان",
        icon: FileText
      },
      {
        title: "رفع الملفات الطبية",
        description: "رفع التقارير الطبية، الأشعة، والتحاليل في قسم الملفات",
        icon: FileText
      },
      {
        title: "حفظ التغييرات",
        description: "الضغط على زر 'حفظ' لحفظ جميع التحديثات",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: 4,
    title: "تقييم المخاطر",
    description: "احصلي على تقييم شامل لمخاطر الإصابة بناءً على معايير طبية عالمية",
    icon: Shield,
    color: "from-red-500 to-red-600",
    details: [
      {
        title: "الوصول لصفحة التقييم",
        description: "الضغط على 'تقييم المخاطر' من القائمة الرئيسية",
        icon: Shield
      },
      {
        title: "الإجابة على الأسئلة",
        description: "الإجابة على جميع الأسئلة بدقة (التقييم الأول إلزامي)",
        icon: FileText
      },
      {
        title: "عرض النتائج",
        description: "مشاهدة تقييم المخاطر والتوصيات المخصصة",
        icon: CheckCircle2
      },
      {
        title: "التقييمات اللاحقة",
        description: "يمكنك إعادة التقييم شهرياً لتحديث النتائج (اختياري)",
        icon: Calendar
      }
    ]
  },
  {
    id: 5,
    title: "مكتبة التوعية",
    description: "تصفحي مقالات ومصادر تعليمية موثوقة عن سرطان الثدي",
    icon: BookOpen,
    color: "from-indigo-500 to-indigo-600",
    details: [
      {
        title: "استكشاف المحتوى",
        description: "تصفح المقالات والفيديوهات التعليمية المتاحة",
        icon: BookOpen
      },
      {
        title: "البحث والفلترة",
        description: "استخدام البحث للعثور على مواضيع محددة",
        icon: FileText
      },
      {
        title: "قراءة المقالات",
        description: "فتح المقالات لقراءة المحتوى الكامل",
        icon: FileText
      },
      {
        title: "حفظ المفضلة",
        description: "حفظ المقالات المهمة للمراجعة لاحقاً",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: 6,
    title: "اليوميات",
    description: "سجلي مشاعرك وتجاربك اليومية في مكان آمن وخاص",
    icon: NotebookPen,
    color: "from-pink-500 to-pink-600",
    details: [
      {
        title: "إنشاء مدخل جديد",
        description: "الضغط على 'إضافة منشور جديد' لكتابة يومية جديدة",
        icon: NotebookPen
      },
      {
        title: "اختيار الحالة المزاجية",
        description: "اختيار الحالة المزاجية من الأيقونات المتاحة",
        icon: User
      },
      {
        title: "كتابة المحتوى",
        description: "كتابة اليومية مع إمكانية إضافة صور",
        icon: FileText
      },
      {
        title: "إعدادات الخصوصية",
        description: "اختيار ما إذا كانت اليومية خاصة أو يمكن للطبيب رؤيتها",
        icon: Settings
      }
    ]
  },
  {
    id: 7,
    title: "المواعيد والأدوية",
    description: "نظمي مواعيدك مع الطبيب وتذكيرات الأدوية",
    icon: Calendar,
    color: "from-orange-500 to-orange-600",
    details: [
      {
        title: "عرض المواعيد",
        description: "مشاهدة جميع المواعيد القادمة والمنتهية",
        icon: Calendar
      },
      {
        title: "حجز موعد جديد",
        description: "الضغط على 'إضافة موعد' واختيار التاريخ والوقت",
        icon: Calendar
      },
      {
        title: "إدارة الأدوية",
        description: "إضافة الأدوية مع الجرعات وأوقات تناولها",
        icon: FileText
      },
      {
        title: "التذكيرات التلقائية",
        description: "ستصلك تذكيرات تلقائية بالمواعيد والأدوية عبر الواتساب",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: 8,
    title: "المساعد الذكي",
    description: "احصلي على إجابات فورية لأسئلتك الصحية",
    icon: MessageCircle,
    color: "from-cyan-500 to-cyan-600",
    details: [
      {
        title: "فتح المحادثة",
        description: "الضغط على أيقونة المساعد الذكي في الزاوية السفلية",
        icon: MessageCircle
      },
      {
        title: "كتابة السؤال",
        description: "كتابة سؤالك في صندوق الرسائل",
        icon: FileText
      },
      {
        title: "الحصول على الإجابة",
        description: "انتظار الإجابة الفورية من المساعد الذكي",
        icon: CheckCircle2
      },
      {
        title: "متابعة المحادثة",
        description: "يمكنك متابعة المحادثة وطرح أسئلة إضافية",
        icon: MessageCircle
      }
    ]
  },
  {
    id: 9,
    title: "المراكز الطبية",
    description: "ابحثي عن أقرب مركز طبي متخصص في علاج سرطان الثدي",
    icon: Building2,
    color: "from-teal-500 to-teal-600",
    details: [
      {
        title: "الوصول للخريطة",
        description: "الضغط على 'المراكز الطبية' من القائمة أو التمرير للأسفل",
        icon: Building2
      },
      {
        title: "تحديد موقعك",
        description: "الضغط على 'تحديد موقعي' لإيجاد أقرب مركز",
        icon: User
      },
      {
        title: "استعراض المراكز",
        description: "مشاهدة قائمة المراكز مرتبة من الأقرب للأبعد",
        icon: FileText
      },
      {
        title: "الحصول على الاتجاهات",
        description: "الضغط على 'فتح في Google Maps' للحصول على الاتجاهات",
        icon: CheckCircle2
      }
    ]
  }
];

export default function HowPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background" dir="rtl">
      {/* Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b-2 border-primary/20">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              دليل استخدام الموقع
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              خطوات عملية مفصلة لمساعدتك على الاستفادة الكاملة من جميع ميزات المنصة
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                الخطوة {currentStep + 1} من {steps.length}
              </span>
              <div className="flex gap-2">
                <Link href="/">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowRight className="h-4 w-4" />
                    العودة للرئيسية
                  </Button>
                </Link>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            {steps.map((step, index) => (
              <motion.button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  index === currentStep
                    ? "bg-primary text-white scale-110"
                    : index < currentStep
                    ? "bg-primary/30 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {step.title}
              </motion.button>
            ))}
          </div>

          {/* Step Content */}
          <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden mb-8">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className={`p-4 rounded-xl bg-gradient-to-br ${currentStepData.color} shadow-lg`}
                >
                  <Icon className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl mb-2">
                    {currentStepData.title}
                  </CardTitle>
                  <p className="text-muted-foreground text-lg">
                    {currentStepData.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentStepData.details.map((detail, index) => {
                      const DetailIcon = detail.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-6 bg-primary/5 rounded-lg border border-primary/10 hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg bg-gradient-to-br ${currentStepData.color} flex-shrink-0`}>
                              <DetailIcon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg mb-2">{detail.title}</h4>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {detail.description}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-12 pt-8 border-t">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronRight className="h-5 w-5" />
                  السابق
                </Button>

                <div className="flex gap-2">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToStep(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep ? "bg-primary w-8" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={nextStep}
                  disabled={currentStep === steps.length - 1}
                  className="gap-2"
                >
                  التالي
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/signup/choose">
              <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/30">
                <CardContent className="p-6 text-center">
                  <UserPlus className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-bold mb-1">ابدئي الآن</h3>
                  <p className="text-sm text-muted-foreground">سجلي حساب جديد</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/login">
              <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/30">
                <CardContent className="p-6 text-center">
                  <LogIn className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-bold mb-1">تسجيل الدخول</h3>
                  <p className="text-sm text-muted-foreground">لديك حساب بالفعل؟</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/support">
              <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/30">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-bold mb-1">الدعم والمساعدة</h3>
                  <p className="text-sm text-muted-foreground">أسئلة شائعة</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

