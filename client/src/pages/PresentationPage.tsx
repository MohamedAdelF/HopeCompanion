import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  RotateCcw,
  Heart,
  Shield,
  BookOpen,
  NotebookPen,
  Calendar,
  MessageCircle,
  Building2,
  Users,
  BarChart3,
  Settings,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

interface Slide {
  id: number;
  title: string;
  type: "intro" | "overview" | "feature" | "tech" | "stats" | "value" | "conclusion";
  content: string[];
  icon?: typeof Heart;
  color?: string;
  highlight?: string;
}

const slides: Slide[] = [
  {
    id: 1,
    title: "رفيق الأمل",
    type: "intro",
    content: [
      "منصة رقمية شاملة مصممة خصيصاً",
      "لدعم ومتابعة مريضات سرطان الثدي في مصر"
    ],
    icon: Heart,
    color: "from-pink-500 to-purple-600",
    highlight: "PinkHopeCompanion"
  },
  {
    id: 2,
    title: "المشكلة التي نحلها",
    type: "intro",
    content: [
      "سرطان الثدي هو أكثر أنواع السرطان شيوعاً بين النساء في مصر",
      "نقص في التوعية الصحية والكشف المبكر",
      "صعوبة الوصول للمراكز الطبية المتخصصة",
      "الحاجة لدعم نفسي ومعلوماتي مستمر",
      "صعوبة التواصل بين المريضات والأطباء"
    ],
    color: "from-red-500 to-orange-600"
  },
  {
    id: 3,
    title: "الحل",
    type: "intro",
    content: [
      "رفيق الأمل يوفر منصة متكاملة",
      "تجمع كل ما تحتاجه المريضة في مكان واحد",
      "من التوعية والتقييم إلى المتابعة الطبية والدعم النفسي"
    ],
    color: "from-green-500 to-teal-600"
  },
  {
    id: 4,
    title: "ما هو رفيق الأمل؟",
    type: "overview",
    content: [
      "منصة رقمية شاملة لمريضات سرطان الثدي",
      "ثلاثة أدوار رئيسية: مريضات، أطباء، إدارة",
      "تكامل مع الذكاء الاصطناعي لدعم ذكي",
      "خريطة تفاعلية للمراكز الطبية",
      "نظام إشعارات عبر واتساب"
    ],
    icon: Sparkles,
    color: "from-blue-500 to-cyan-600"
  },
  {
    id: 5,
    title: "الأهداف الرئيسية",
    type: "overview",
    content: [
      "✅ توعية - محتوى تعليمي شامل",
      "✅ تقييم - أدوات تقييم المخاطر",
      "✅ متابعة - سجلات يومية ومواعيد",
      "✅ دعم - مساعد ذكي ودعم نفسي",
      "✅ تواصل - ربط المريضات بالأطباء"
    ],
    color: "from-purple-500 to-pink-600"
  },
  {
    id: 6,
    title: "تقييم المخاطر الذكي",
    type: "feature",
    content: [
      "أداة تفاعلية تستخدم معايير طبية عالمية",
      "ثلاثة مستويات من التقييم (أساسي، متوسط، متقدم)",
      "حساب تلقائي للمخاطر مع توصيات مخصصة",
      "حماية من التقييم المتكرر (30 يوم للتقييم الأول)",
      "طلب إعادة تقييم عاجل مع موافقة الطبيب"
    ],
    icon: Shield,
    color: "from-red-500 to-pink-600",
    highlight: "Gail Model, Tyrer-Cuzick, BRCAPRO"
  },
  {
    id: 7,
    title: "مكتبة التوعية الشاملة",
    type: "feature",
    content: [
      "محتوى منظم حسب المواضيع (الوقاية، العلاج، التعافي)",
      "مقالات من مصادر موثوقة (WHO, NCI, ACS)",
      "فيديوهات تعليمية",
      "قابل للتحديث من قبل الأطباء"
    ],
    icon: BookOpen,
    color: "from-green-500 to-emerald-600"
  },
  {
    id: 8,
    title: "اليوميات الشخصية",
    type: "feature",
    content: [
      "تسجيل المشاعر والأعراض اليومية",
      "اختيار المزاج (سعيد، محايد، حزين)",
      "مشاركة عامة أو خاصة",
      "إمكانية النشر كمجهول",
      "تفاعل مع المجتمع (إعجابات، تعليقات)"
    ],
    icon: NotebookPen,
    color: "from-pink-500 to-rose-600"
  },
  {
    id: 9,
    title: "إدارة المواعيد والأدوية",
    type: "feature",
    content: [
      "حجز وإدارة المواعيد",
      "إضافة الأدوية مع جدولة متقدمة",
      "مرات متعددة في اليوم، بعد الوجبات، كل 12 ساعة",
      "تقويم شامل للمواعيد والأدوية",
      "تذكيرات تلقائية"
    ],
    icon: Calendar,
    color: "from-orange-500 to-amber-600"
  },
  {
    id: 10,
    title: "خريطة المراكز الطبية",
    type: "feature",
    content: [
      "56+ مركز طبي في 21 محافظة مصرية",
      "خريطة تفاعلية باستخدام Google Maps",
      "تحديد الموقع التلقائي",
      "البحث والفلترة حسب المدينة والنوع",
      "عرض المسافة من موقعك"
    ],
    icon: Building2,
    color: "from-teal-500 to-cyan-600"
  },
  {
    id: 11,
    title: "المساعد الذكي",
    type: "feature",
    content: [
      "تكامل مع Google Gemini 2.5 Flash",
      "كشف ذكي للنوايا (طوارئ، أعراض، وقاية)",
      "ردود مختصرة وعامة بالعربية",
      "دعم نفسي متواصل 24/7",
      "واجهة مميزة مع عرض جذاب للردود"
    ],
    icon: MessageCircle,
    color: "from-indigo-500 to-purple-600"
  },
  {
    id: 12,
    title: "نظام الإشعارات الذكي",
    type: "feature",
    content: [
      "إشعارات تلقائية عند حجز موعد جديد",
      "تذكير بالمواعيد والأدوية",
      "إشعارات تقييم مخاطر مرتفع",
      "إرسال عبر واتساب مباشرة",
      "تذكيرات يومية للأدوية"
    ],
    icon: MessageCircle,
    color: "from-green-500 to-lime-600"
  },
  {
    id: 13,
    title: "ميزات الأطباء",
    type: "feature",
    content: [
      "لوحة تحكم متكاملة لإدارة المرضى",
      "عرض قائمة المرضى المعينين",
      "ملفات مرضى كاملة (تقييمات، يوميات، مواعيد)",
      "التنبيهات الذكية (مخاطر مرتفعة، أعراض مقلقة)",
      "نظام رسائل للتواصل مع المرضى",
      "إضافة المراكز الطبية الخاصة بهم"
    ],
    icon: Users,
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: 14,
    title: "ميزات الإدارة",
    type: "feature",
    content: [
      "إدارة المستخدمين (مريضات، أطباء، إدارة)",
      "مراجعة طلبات تسجيل الأطباء",
      "الإحصائيات والرسوم البيانية التفاعلية",
      "المساعد الذكي للإدارة (تحليل تلقائي)",
      "التصدير والاستيراد (نسخ احتياطي)",
      "إدارة المحتوى والمراجعة"
    ],
    icon: Settings,
    color: "from-purple-500 to-violet-600"
  },
  {
    id: 15,
    title: "التقنيات المستخدمة",
    type: "tech",
    content: [
      "Frontend: React + TypeScript, Tailwind CSS, Framer Motion",
      "Backend: Node.js + Express, Firebase",
      "Database: Firestore (NoSQL)",
      "Storage: Firebase Storage",
      "AI: Google Gemini 2.5 Flash, OpenAI ChatGPT, Anthropic Claude",
      "Maps: Google Maps API",
      "Security: Firebase Authentication, Firestore Security Rules"
    ],
    icon: BarChart3,
    color: "from-gray-500 to-slate-600"
  },
  {
    id: 16,
    title: "الإحصائيات والإنجازات",
    type: "stats",
    content: [
      "56+ مركز طبي في قاعدة البيانات",
      "21 محافظة مصرية مغطاة",
      "ثلاثة أدوار متكاملة (مريضات، أطباء، إدارة)",
      "نظام تقييم متدرج (أساسي، متوسط، متقدم)",
      "تكامل مع 3 نماذج AI مختلفة",
      "نظام إشعارات عبر واتساب",
      "خريطة تفاعلية مع Google Maps",
      "واجهة عربية كاملة مع دعم RTL"
    ],
    icon: CheckCircle2,
    color: "from-emerald-500 to-green-600"
  },
  {
    id: 17,
    title: "القيمة المضافة للمريضات",
    type: "value",
    content: [
      "توعية شاملة - معلومات موثوقة في مكان واحد",
      "تقييم دقيق - بناءً على معايير طبية عالمية",
      "دعم مستمر - مساعد ذكي متاح 24/7",
      "سهولة الوصول - خريطة تفاعلية للمراكز الطبية",
      "متابعة منظمة - سجلات يومية ومواعيد"
    ],
    icon: Heart,
    color: "from-pink-500 to-rose-600"
  },
  {
    id: 18,
    title: "القيمة المضافة للأطباء",
    type: "value",
    content: [
      "إدارة شاملة - لوحة تحكم متكاملة",
      "تنبيهات ذكية - لا تفوت أي حالة مهمة",
      "تواصل سهل - نظام رسائل مع المرضى",
      "إضافة المراكز - يمكنهم إضافة عياداتهم"
    ],
    icon: Users,
    color: "from-blue-500 to-cyan-600"
  },
  {
    id: 19,
    title: "القيمة المضافة للإدارة",
    type: "value",
    content: [
      "تحكم كامل - إدارة جميع جوانب النظام",
      "تحليل البيانات - رؤى وإحصائيات شاملة",
      "مساعد ذكي - تحليل واقتراحات تلقائية",
      "إدارة المستخدمين - مراقبة وإدارة الحسابات",
      "مراجعة الطلبات - الموافقة على تسجيل الأطباء"
    ],
    icon: Settings,
    color: "from-purple-500 to-indigo-600"
  },
  {
    id: 20,
    title: "الخلاصة",
    type: "conclusion",
    content: [
      "رفيق الأمل ليس مجرد موقع",
      "إنه رفيق داعم في رحلة الشفاء والتعافي",
      "يجمع كل ما تحتاجه المريضة في مكان واحد",
      "من التوعية والتقييم إلى المتابعة والدعم النفسي"
    ],
    icon: Heart,
    color: "from-pink-500 to-purple-600"
  },
  {
    id: 21,
    title: "الرؤية المستقبلية",
    type: "conclusion",
    content: [
      "توسيع قاعدة المراكز الطبية",
      "إضافة المزيد من المحتوى التعليمي",
      "تحسين المساعد الذكي",
      "إضافة ميزات جديدة بناءً على التغذية الراجعة"
    ],
    icon: Sparkles,
    color: "from-yellow-500 to-orange-600"
  },
  {
    id: 22,
    title: "شكراً لكم",
    type: "conclusion",
    content: [
      "نهدف لجعل رفيق الأمل",
      "المنصة الرائدة في مصر",
      "لدعم مريضات سرطان الثدي",
      "معاً يمكننا إحداث فرق حقيقي"
    ],
    icon: Heart,
    color: "from-pink-500 to-purple-600"
  },
  {
    id: 23,
    title: "المصادر والمراجع",
    type: "conclusion",
    content: [
      "أسئلة تقييم المخاطر:",
      "• Gail Model - المعهد الوطني للسرطان (NCI)",
      "• Tyrer-Cuzick Model - IBIS Risk Evaluator",
      "• BRCAPRO Model - تقييم طفرات BRCA",
      "",
      "المحتوى التعليمي:",
      "• منظمة الصحة العالمية (WHO)",
      "• المعهد الوطني للسرطان (NCI)",
      "• الجمعية الأمريكية للسرطان (ACS)",
      "",
      "الخدمات الخارجية:",
      "• Google Maps API - الخرائط التفاعلية",
      "• Google Places API - البحث عن الأماكن"
    ],
    icon: BookOpen,
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: 24,
    title: "المصادر والمراجع (2)",
    type: "conclusion",
    content: [
      "المراكز الطبية:",
      "• وزارة الصحة والسكان المصرية",
      "• الهيئة العامة للرعاية الصحية",
      "• دليل المستشفيات المصرية",
      "",
      "معايير طبية:",
      "• توصيات الجمعية الأمريكية للسرطان (ACS)",
      "• معايير المعهد الوطني للسرطان (NCI)",
      "",
      "ملاحظة مهمة:",
      "جميع المعلومات الطبية لأغراض توعوية فقط",
      "ولا تُغني عن استشارة الطبيب المختص"
    ],
    icon: Shield,
    color: "from-green-500 to-emerald-600"
  }
];

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => {
          if (prev === slides.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 5000); // تغيير الشريحة كل 5 ثواني
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying]);

  const nextSlide = () => {
    setIsPlaying(false);
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  };

  const prevSlide = () => {
    setIsPlaying(false);
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const goToSlide = (index: number) => {
    setIsPlaying(false);
    setCurrentSlide(index);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "Escape") {
        setIsPlaying(false);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const currentSlideData = slides[currentSlide];
  const Icon = currentSlideData.icon || Heart;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-primary/5 to-background ${isFullscreen ? "p-0" : "p-4"} transition-all`} dir="rtl">
      <div className={`max-w-7xl mx-auto ${isFullscreen ? "h-screen" : ""}`}>
        {/* Header Controls */}
        {!isFullscreen && (
          <div className="mb-6 flex items-center justify-between">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                الرئيسية
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    إيقاف
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    تشغيل تلقائي
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentSlide(0);
                }}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                إعادة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                ملء الشاشة
              </Button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {!isFullscreen && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                الشريحة {currentSlide + 1} من {slides.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(((currentSlide + 1) / slides.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Slide Indicators */}
        {!isFullscreen && (
          <div className="flex justify-center gap-1 mb-6 flex-wrap max-h-20 overflow-y-auto">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? "bg-primary scale-150"
                    : index < currentSlide
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
                title={slide.title}
              />
            ))}
          </div>
        )}

        {/* Main Slide */}
        <Card className={`border-2 border-primary/20 shadow-2xl overflow-hidden ${isFullscreen ? "h-full" : ""}`}>
          <CardContent className={`p-8 md:p-16 ${isFullscreen ? "h-full flex flex-col justify-center" : ""}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                {/* Icon */}
                {currentSlideData.icon && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mb-8 flex justify-center"
                  >
                    <div className={`p-6 rounded-2xl bg-gradient-to-br ${currentSlideData.color} shadow-lg`}>
                      <Icon className="h-16 w-16 md:h-20 md:w-20 text-white" />
                    </div>
                  </motion.div>
                )}

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent ${
                    isFullscreen ? "text-5xl md:text-6xl lg:text-7xl" : "text-3xl md:text-4xl lg:text-5xl"
                  }`}
                >
                  {currentSlideData.title}
                </motion.h1>

                {/* Highlight */}
                {currentSlideData.highlight && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl md:text-2xl text-primary font-semibold mb-6"
                  >
                    {currentSlideData.highlight}
                  </motion.p>
                )}

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`space-y-4 max-w-4xl mx-auto ${
                    isFullscreen ? "text-xl md:text-2xl" : "text-lg md:text-xl"
                  }`}
                >
                  {currentSlideData.content.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-start gap-3 justify-center"
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${currentSlideData.color} mt-2 flex-shrink-0`} />
                      <p className="text-foreground/90 leading-relaxed text-right">{item}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className={`flex justify-between items-center mt-12 ${isFullscreen ? "pt-8 border-t" : ""}`}>
              <Button
                variant="outline"
                size="lg"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="gap-2"
              >
                <ChevronRight className="h-5 w-5" />
                السابق
              </Button>

              <div className="flex gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide ? "bg-primary w-8" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="lg"
                onClick={nextSlide}
                disabled={currentSlide === slides.length - 1}
                className="gap-2"
              >
                التالي
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Hints */}
        {!isFullscreen && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            استخدم الأسهم للتنقل أو المسافة للمتابعة
          </div>
        )}
      </div>
    </div>
  );
}

