import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Bot, 
  Send, 
  Loader2, 
  Sparkles, 
  Trash2, 
  Clock,
  MessageCircle,
  Heart,
  Stethoscope,
  Shield,
  ArrowLeft,
  MoreVertical,
  RotateCcw,
  Settings
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/AuthProvider";
import { firestoreDb, collection, addDoc, getDocs, query, where, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const quickSuggestions = [
  { text: "ما هي أعراض سرطان الثدي؟", icon: MessageCircle },
  { text: "كيف أفحص ثديي ذاتياً؟", icon: Shield },
  { text: "ما هي عوامل الخطر لسرطان الثدي؟", icon: Heart },
  { text: "متى يجب أن أزور الطبيب؟", icon: Stethoscope },
];

const conversationTopics = [
  { title: "الأعراض", emoji: "🔍", color: "from-blue-500 to-cyan-500", query: "ما هي أعراض سرطان الثدي؟" },
  { title: "الفحص الذاتي", emoji: "✋", color: "from-purple-500 to-pink-500", query: "كيف أفحص ثديي ذاتياً؟" },
  { title: "الوقاية", emoji: "🛡️", color: "from-green-500 to-emerald-500", query: "كيف أحمي نفسي من سرطان الثدي؟" },
  { title: "الدعم النفسي", emoji: "💚", color: "from-pink-500 to-rose-500", query: "أشعر بالقلق، ماذا أفعل؟" },
  { title: "متى أزور الطبيب", emoji: "👩‍⚕️", color: "from-orange-500 to-red-500", query: "متى يجب أن أزور الطبيب؟" },
  { title: "النظام الغذائي", emoji: "🥗", color: "from-emerald-500 to-teal-500", query: "ما هو أفضل نظام غذائي للوقاية؟" },
];

export default function ChatPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "مرحباً بك! أنا مساعدك الذكي المتخصص في سرطان الثدي في رفيق الأمل. أنا هنا لدعمك وتقديم معلومات موثوقة عن سرطان الثدي، الفحص الذاتي، الأعراض، الوقاية، والمتابعة. كيف يمكنني مساعدتك اليوم؟",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find patientId for logged-in user
  useEffect(() => {
    (async () => {
      if (!user) return setPatientId(null);
      const fs = await import("@/lib/firebase");
      const snap = await fs.getDocs(
        fs.query(
          fs.collection(fs.firestoreDb, "patients"),
          fs.where("uid", "==", user.uid)
        )
      );
      const first = snap.docs[0];
      setPatientId(first ? first.id : null);
    })();
  }, [user]);

  // Auto-scroll to latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const detectIntent = (text: string): "emergency" | "symptoms" | "prevention" | "examination" | "treatment" | "support" | "other" => {
    const t = text.toLowerCase();
    const arabicText = text;
    
    // Emergency - urgent symptoms (check first as highest priority)
    const dangerKeywords = [
      "ألم شديد", "نزيف", "إفراز دموي", "كتلة كبيرة", "تورم مفاجئ",
      "حرارة", "خدر", "تغير سريع", "يزداد بسرعة", "طارئ", "عاجل"
    ];
    if (dangerKeywords.some((k) => arabicText.includes(k))) return "emergency";
    if (/(severe pain|heavy bleeding|bloody discharge|large lump|sudden swelling|emergency|urgent)/i.test(t)) return "emergency";

    // Prevention - check before symptoms to avoid false positives
    const preventionKeywords = [
      "نظام غذائي", "غذاء", "طعام", "أكل", "وجبات", "حمية", "رجيم",
      "وقاية", "منع", "تجنب", "تقليل", "خفض", "عوامل الخطر",
      "ماذا أفعل لأحمي نفسي", "كيف أمنع", "الوقاية", "التحصين",
      "فيتامينات", "مكملات", "أفضل غذاء", "أفضل نظام"
    ];
    if (preventionKeywords.some((k) => arabicText.includes(k))) return "prevention";
    if (/(prevent|avoid|reduce|risk factor|how to prevent|protection|diet|nutrition|food|vitamin|supplement)/i.test(t)) return "prevention";

    // Symptoms (more specific keywords)
    const symptomKeywords = [
      "أعراض سرطان", "أعراض المرض", "علامات المرض",
      "كيف أعرف إني مريضة", "ماذا يعني وجود", "ما هي أعراض",
      "كتلة في الثدي", "تورم في الثدي", "إفراز من الثدي", 
      "تغير في الثدي", "ألم في الثدي", "علامات سرطان"
    ];
    if (symptomKeywords.some((k) => arabicText.includes(k))) return "symptoms";
    if (/(symptom|sign|how do i know|what does|breast cancer symptom|lump|discharge|breast pain)/i.test(t)) return "symptoms";

    // Examination
    const examKeywords = [
      "فحص", "كيف أفحص", "متى أفحص", "الفحص الذاتي", "ماموجرام",
      "سونار", "كشف", "متابعة"
    ];
    if (examKeywords.some((k) => arabicText.includes(k))) return "examination";
    if (/(exam|check|how to check|mammogram|ultrasound|self-exam)/i.test(t)) return "examination";

    // Treatment
    const treatmentKeywords = [
      "علاج", "جراحة", "كيمو", "إشعاع", "دواء", "جرعة",
      "ماذا بعد التشخيص", "العلاج المناسب"
    ];
    if (treatmentKeywords.some((k) => arabicText.includes(k))) return "treatment";
    if (/(treatment|therapy|surgery|chemotherapy|radiation|medication|what after diagnosis)/i.test(t)) return "treatment";

    // Support
    const supportKeywords = [
      "قلق", "خوف", "توتر", "دعم نفسي", "مساعدة", "أشعر",
      "مضغوط", "مكتئب", "حزين"
    ];
    if (supportKeywords.some((k) => arabicText.includes(k))) return "support";
    if (/(anxiety|fear|worried|support|help|feeling|stressed|depressed|sad)/i.test(t)) return "support";

    return "other";
  };

  const handleSendMessage = async (content?: string) => {
    const textToSend = (content ?? message).trim();
    if (!textToSend || isSending) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setMessage("");
    // لا نخفي الاقتراحات - تبقى ظاهرة دائماً
    setIsSending(true);
    setIsTyping(true);

    try {
      // Simulate thinking time for better UX
      await new Promise((resolve) => setTimeout(resolve, 600));

      // قاعدة بيانات شاملة للردود التلقائية المتخصصة في سرطان الثدي
      const breastCancerKnowledgeBase: Record<string, string> = {
        // الأعراض
        "ما هي أعراض سرطان الثدي؟": 
          "أعراض سرطان الثدي تشمل:\n\n• كتلة في الثدي أو تحت الإبط\n• تغيّر في حجم أو شكل الثدي\n• إفرازات من الحلمة (خاصة الدموية)\n• تغيّر في جلد الثدي (احمرار، تجعّد، أو قشور)\n• تغيّر في الحلمة (انكماش أو انعكاس)\n• ألم مستمر في الثدي\n\n⚠️ تذكّري: معظم الكتل ليست سرطانية، لكن أي تغيّر يستدعي استشارة الطبيب فوراً.",
        
        "ما هي أعراض سرطان الثدي": 
          "أعراض سرطان الثدي تشمل:\n\n• كتلة في الثدي أو تحت الإبط\n• تغيّر في حجم أو شكل الثدي\n• إفرازات من الحلمة (خاصة الدموية)\n• تغيّر في جلد الثدي (احمرار، تجعّد، أو قشور)\n• تغيّر في الحلمة (انكماش أو انعكاس)\n• ألم مستمر في الثدي\n\n⚠️ تذكّري: معظم الكتل ليست سرطانية، لكن أي تغيّر يستدعي استشارة الطبيب فوراً.",
        
        // الفحص الذاتي
        "كيف أفحص ثديي ذاتياً؟": 
          "الفحص الذاتي خطوة مهمة للاكتشاف المبكر:\n\n📅 التوقيت: بعد انتهاء الدورة بـ 3-5 أيام\n\n🔍 طريقة الفحص:\n1️⃣ أمام المرآة: تحقّقي من التغيّرات في الشكل والحجم\n2️⃣ تحت الدش: استخدمي أصابعك للتحسّس بحركة دائرية\n3️⃣ مستلقية: ضعي يد تحت رأسك وافحصي بيدك الأخرى\n\n💡 ابحثي عن: كتل، تورّم، تغيّرات في الجلد، إفرازات\n\nإن لاحظتِ أي تغيّر، راجعي الطبيب خلال أسبوع.",
        
        "ما هو الفحص الذاتي": 
          "الفحص الذاتي خطوة مهمة للاكتشاف المبكر:\n\n📅 التوقيت: بعد انتهاء الدورة بـ 3-5 أيام\n\n🔍 طريقة الفحص:\n1️⃣ أمام المرآة: تحقّقي من التغيّرات في الشكل والحجم\n2️⃣ تحت الدش: استخدمي أصابعك للتحسّس بحركة دائرية\n3️⃣ مستلقية: ضعي يد تحت رأسك وافحصي بيدك الأخرى\n\n💡 ابحثي عن: كتل، تورّم، تغيّرات في الجلد، إفرازات\n\nإن لاحظتِ أي تغيّر، راجعي الطبيب خلال أسبوع.",
        
        // عوامل الخطر
        "ما هي عوامل الخطر لسرطان الثدي؟": 
          "عوامل الخطر الرئيسية:\n\n🔴 عوامل لا يمكن تغييرها:\n• التقدّم في العمر (فوق 50)\n• التاريخ العائلي\n• الطفرات الجينية (BRCA1, BRCA2)\n• بدء الدورة مبكراً أو انقطاعها متأخراً\n\n🟡 عوامل قابلة للتحكم:\n• الوزن الزائد بعد سن اليأس\n• قلة النشاط البدني\n• شرب الكحول\n• عدم الإرضاع الطبيعي\n\n💚 للوقاية: اتبعي نظام غذائي صحي، مارسي الرياضة، افحصي بانتظام.",
        
        // المتابعة والفحوصات
        "متى يجب أن أزور الطبيب؟": 
          "زيارة الطبيب ضرورية في الحالات التالية:\n\n⚠️ فوراً إذا لاحظتِ:\n• كتلة جديدة أو متغيّرة\n• إفراز دموي من الحلمة\n• تغيّر مفاجئ في شكل الثدي\n• ألم مستمر أو شديد\n\n📅 فحوصات دورية:\n• الفحص الذاتي: شهرياً بعد سن 20\n• الفحص السريري: سنوياً من سن 25-40\n• الماموجرام: كل 1-2 سنة من سن 40-50، ثم سنوياً بعد 50\n\n💡 نصيحة: لا تنتظري ظهور الأعراض، الوقاية خير من العلاج.",
        
        // الدعم النفسي
        "أشعر بالقلق، ماذا أفعل؟": 
          "قلقك مشروع وطبيعي. إليك خطوات تساعدك:\n\n🌬️ تمرين التنفّس:\n• شهيق 4 ثوانٍ\n• حبس 4 ثوانٍ\n• زفير 6 ثوانٍ\n• كرّري لمدة دقيقتين\n\n💚 استراتيجيات أخرى:\n• تحدّثي مع طبيبك عن مخاوفك\n• انضمي لمجموعات دعم\n• مارسي النشاط البدني\n• احصلي على قسط كافٍ من النوم\n\nإن استمر القلق، احجزي موعد متابعة مع الطبيب أو استشاري نفسي.",
        
        // الوقاية
        "كيف أحمي نفسي من سرطان الثدي؟": 
          "للوقاية من سرطان الثدي:\n\n✅ نمط حياة صحي:\n• نظام غذائي متوازن غني بالخضار والفواكه\n• ممارسة الرياضة 30 دقيقة معظم أيام الأسبوع\n• الحفاظ على وزن صحي\n• تجنّب الكحول أو تقليله\n• الإرضاع الطبيعي إن أمكن\n\n🔍 الفحص المبكر:\n• الفحص الذاتي: شهرياً بعد سن 20\n• الفحص السريري: سنوياً من سن 25\n• الماموجرام: بانتظام حسب العمر (40+)\n\n💚 تذكّري: الوقاية والاكتشاف المبكر هما المفتاح!",
        
        // النظام الغذائي للوقاية
        "ما هو أفضل نظام غذائي للوقاية؟": 
          "نظام غذائي للوقاية من سرطان الثدي:\n\n🥗 الأطعمة الموصى بها:\n• الخضار الورقية الداكنة (سبانخ، كرنب)\n• الطماطم (غنية بالليكوبين)\n• التوت والفراولة (مضادات أكسدة)\n• الأسماك الدهنية (سلمون، تونة) - أوميغا 3\n• البقوليات (فاصوليا، عدس)\n• الحبوب الكاملة (قمح كامل، أرز بني)\n• المكسرات (لوز، جوز)\n\n❌ تجنّبي:\n• الأطعمة المعالجة والمعلبة\n• السكريات المكررة\n• الدهون المشبعة والدهون المتحولة\n• الكحول (تجنّبيه أو قلّليه)\n\n💡 نصيحة: اتبعي نظاماً متنوعاً، طازجاً، وملوناً! كلما زادت الألوان في طبقك، زادت الفائدة.",
        
        "أفضل نظام غذائي للوقاية": 
          "نظام غذائي للوقاية من سرطان الثدي:\n\n🥗 الأطعمة الموصى بها:\n• الخضار الورقية الداكنة (سبانخ، كرنب)\n• الطماطم (غنية بالليكوبين)\n• التوت والفراولة (مضادات أكسدة)\n• الأسماك الدهنية (سلمون، تونة) - أوميغا 3\n• البقوليات (فاصوليا، عدس)\n• الحبوب الكاملة (قمح كامل، أرز بني)\n• المكسرات (لوز، جوز)\n\n❌ تجنّبي:\n• الأطعمة المعالجة والمعلبة\n• السكريات المكررة\n• الدهون المشبعة والدهون المتحولة\n• الكحول (تجنّبيه أو قلّليه)\n\n💡 نصيحة: اتبعي نظاماً متنوعاً، طازجاً، وملوناً! كلما زادت الألوان في طبقك، زادت الفائدة.",
        
        "نظام غذائي للوقاية من سرطان الثدي": 
          "نظام غذائي للوقاية من سرطان الثدي:\n\n🥗 الأطعمة الموصى بها:\n• الخضار الورقية الداكنة (سبانخ، كرنب)\n• الطماطم (غنية بالليكوبين)\n• التوت والفراولة (مضادات أكسدة)\n• الأسماك الدهنية (سلمون، تونة) - أوميغا 3\n• البقوليات (فاصوليا، عدس)\n• الحبوب الكاملة (قمح كامل، أرز بني)\n• المكسرات (لوز، جوز)\n\n❌ تجنّبي:\n• الأطعمة المعالجة والمعلبة\n• السكريات المكررة\n• الدهون المشبعة والدهون المتحولة\n• الكحول (تجنّبيه أو قلّليه)\n\n💡 نصيحة: اتبعي نظاماً متنوعاً، طازجاً، وملوناً! كلما زادت الألوان في طبقك، زادت الفائدة.",
      };

      // البحث عن رد مباشر
      let replyText = breastCancerKnowledgeBase[textToSend];
      
      // إذا لم يكن هناك رد مباشر، نحلل النية
      if (!replyText) {
        const intent = detectIntent(textToSend);
        
        switch (intent) {
          case "emergency":
            replyText = "⚠️ بما أنكِ ذكرتِ أعراضاً مقلقة (ألم شديد، نزيف، أو تغيّر مفاجئ)، يُنصح بالتواصل مع الطبيب فوراً أو التوجه لأقرب مستشفى في حالة الطوارئ. لا تنتظري الموعد المجدول.";
            if (patientId) {
              await addDoc(collection(firestoreDb, "alerts"), {
                patientId,
                type: "symptom",
                message: "ذُكرت أعراض مقلقة في المحادثة — يُنصح بالمتابعة الفورية.",
                status: "open",
                createdAt: new Date().toISOString(),
              });
            }
            break;
            
          case "symptoms":
            replyText = "أعراض سرطان الثدي قد تشمل:\n\n• كتلة أو سماكة في الثدي أو الإبط\n• تغيّر في حجم، شكل، أو مظهر الثدي\n• إفرازات من الحلمة (خاصة الدموية)\n• تغيّرات في الجلد (احمرار، تجعّد)\n• تغيّر في الحلمة أو الألم\n\n💡 المهم: معظم التغيّرات ليست سرطانية، لكن أي تغيّر يستدعي استشارة الطبيب للتشخيص الدقيق.";
            break;
            
          case "prevention":
            // التحقق إذا كان السؤال عن النظام الغذائي تحديداً
            if (textToSend.includes("نظام غذائي") || textToSend.includes("غذاء") || textToSend.includes("طعام") || textToSend.includes("أكل") || textToSend.includes("حمية") || /diet|nutrition|food|eat/i.test(textToSend)) {
              replyText = "نظام غذائي للوقاية من سرطان الثدي:\n\n🥗 الأطعمة الموصى بها:\n• الخضار الورقية الداكنة (سبانخ، كرنب)\n• الطماطم (غنية بالليكوبين)\n• التوت والفراولة (مضادات أكسدة)\n• الأسماك الدهنية (سلمون، تونة) - أوميغا 3\n• البقوليات (فاصوليا، عدس)\n• الحبوب الكاملة (قمح كامل، أرز بني)\n• المكسرات (لوز، جوز)\n\n❌ تجنّبي:\n• الأطعمة المعالجة والمعلبة\n• السكريات المكررة\n• الدهون المشبعة والدهون المتحولة\n• الكحول (تجنّبيه أو قلّليه)\n\n💡 نصيحة: اتبعي نظاماً متنوعاً، طازجاً، وملوناً! كلما زادت الألوان في طبقك، زادت الفائدة.";
            } else {
              replyText = "للوقاية من سرطان الثدي:\n\n✅ احرصي على:\n• نظام غذائي صحي غني بالخضار والفواكه\n• ممارسة الرياضة 30 دقيقة معظم أيام الأسبوع\n• الحفاظ على وزن صحي\n• الإرضاع الطبيعي إن أمكن\n• تجنّب الكحول أو تقليله\n\n🔍 الفحص المبكر:\n• الفحص الذاتي شهرياً\n• الماموجرام بانتظام حسب العمر\n\n💚 تذكّري: الاكتشاف المبكر يحسّن نتائج العلاج بشكل كبير.";
            }
            break;
            
          case "examination":
            replyText = "فحوصات سرطان الثدي:\n\n🔍 الفحص الذاتي:\n• شهرياً بعد سن 20\n• بعد 3-5 أيام من انتهاء الدورة\n• تحسّسي بحركة دائرية من الخارج للداخل\n\n👩‍⚕️ الفحص السريري:\n• سنوياً من سن 25-40\n• يُجرى من قبل الطبيب المختص\n\n📷 الماموجرام:\n• كل 1-2 سنة من سن 40-50\n• سنوياً بعد سن 50\n• أو حسب توصيات طبيبك\n\n💡 المفتاح: الاكتشاف المبكر = علاج أفضل.";
            break;
            
          case "treatment":
            replyText = "خيارات علاج سرطان الثدي:\n\n🏥 أنواع العلاج:\n• الجراحة: لإزالة الورم\n• العلاج الكيميائي: للأورام العدوانية\n• العلاج الإشعاعي: بعد الجراحة\n• العلاج الهرموني: للأورام الحساسة للهرمونات\n• العلاج الموجه: للطفرات الجينية\n\n💡 الخطة العلاجية:\nتتحدّد حسب:\n• نوع ومرحلة السرطان\n• عمرك وصحتك العامة\n• تفضيلاتك الشخصية\n\n🔑 الأهم: ناقشي كل الخيارات مع فريقك الطبي قبل اتخاذ القرار.";
            break;
            
          case "support":
            replyText = "أفهم قلقك ومخاوفك. هذه مشاعر طبيعية تماماً.\n\n💚 نصائح للدعم النفسي:\n• تحدّثي مع طبيبك عن مخاوفك\n• انضمي لمجموعات دعم محلية أو عبر الإنترنت\n• مارسي التأمل أو اليوجا\n• احصلي على دعم من العائلة والأصدقاء\n• فكري في استشارة نفسية متخصصة\n\n🌬️ تمرين سريع للاسترخاء:\nشهيق 4، حبس 4، زفير 6. كرّري 5 مرات.\n\nتذكّري: أنت لست وحدك. نحن هنا لدعمك.";
            break;
            
          default:
            // استخدام API كخيار احتياطي
            try {
              if (!auth.currentUser) {
                replyText = "يجب تسجيل الدخول أولاً لاستخدام المساعد الذكي.";
              } else {
                const token = await auth.currentUser.getIdToken();
                const res = await fetch("/api/coach", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                  },
                  credentials: "include",
                  body: JSON.stringify({
                    message: `سرطان الثدي - ${textToSend}`,
                  }),
                });
                
                if (res.ok) {
                  const data = (await res.json()) as { reply: string };
                  replyText = data.reply;
                } else {
                  throw new Error("API request failed");
                }
              }
            } catch {
              replyText = "شكراً لسؤالك. أنا متخصص في سرطان الثدي وأستطيع مساعدتك في:\n\n• الأعراض والعلامات\n• الفحص الذاتي والفحوصات\n• الوقاية وعوامل الخطر\n• الدعم النفسي\n\nيمكنك طرح سؤالك بشكل أكثر تحديداً وسأقدم لك إجابة مفصلة.";
            }
        }
      }

      // Additional delay for typing effect
      await new Promise((resolve) => setTimeout(resolve, 400));

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        sender: "bot",
        timestamp: new Date(),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botResponse]);

      // Persist conversation snippet for doctor if user is mapped to patient
      // فقط حفظ رسالة المريض، رد الـ bot لا يُحفظ كرسالة من طبيب لأنه ليس طبيب حقيقي
      if (patientId) {
        try {
          await addDoc(collection(firestoreDb, "messages"), {
            patientId,
            text: textToSend,
            from: "patient",
            status: "unread",
            createdAt: new Date().toISOString(),
            type: "chat",
          });
          // لا نحفظ رد الـ bot كرسالة من طبيب لأنه لا يمر بقواعد Firebase
          // الـ bot ليس طبيب حقيقي والرسالة لا يمكن أن تمر بقواعد isPatientAssignedToDoctor
        } catch (error) {
          console.error("Error saving chat message:", error);
          // لا نمنع المحادثة إذا فشل حفظ الرسالة
        }
      }
    } catch {
      setIsTyping(false);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "تعذر الاتصال الآن. حاولي مرة أخرى لاحقاً.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "1",
        text: "مرحباً بك! أنا مساعدك الذكي المتخصص في سرطان الثدي في رفيق الأمل. أنا هنا لدعمك وتقديم معلومات موثوقة عن سرطان الثدي، الفحص الذاتي، الأعراض، الوقاية، والمتابعة. كيف يمكنني مساعدتك اليوم؟",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
    setShowSuggestions(true);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50/30 via-pink-50/30 to-background dark:from-purple-950/10 dark:via-pink-950/10">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm"
        dir="rtl"
        lang="ar"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-purple-200 dark:ring-purple-800">
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                    <Bot className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    مساعدك الذكي
                  </h1>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    متاح الآن
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleClearChat}>
                    <RotateCcw className="h-4 w-4 ml-2" />
                    مسح المحادثة
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/support">
                      <Settings className="h-4 w-4 ml-2" />
                      إعدادات الدعم
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Conversation Topics & Quick Suggestions - Always Visible */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 sticky top-0 bg-background/80 backdrop-blur-sm z-10 pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-2 border-b border-purple-100 dark:border-purple-900"
            >
              <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-base font-bold text-foreground">مواضيع للمناقشة</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {conversationTopics.map((topic, idx) => (
                    <motion.button
                      key={topic.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "p-2.5 rounded-xl bg-gradient-to-br",
                        topic.color,
                        "text-white text-xs font-medium shadow-md hover:shadow-lg transition-all"
                      )}
                      onClick={() => handleSendMessage(topic.query)}
                      disabled={isSending}
                    >
                      <span className="text-xl mb-0.5 block">{topic.emoji}</span>
                      <span className="leading-tight">{topic.title}</span>
                    </motion.button>
                  ))}
                </div>
              </Card>

              {/* Quick Suggestions - Always Visible */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-sm font-semibold text-foreground">اقتراحات سريعة</h4>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {quickSuggestions.map((suggestion, idx) => (
                    <motion.div
                      key={suggestion.text}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(suggestion.text)}
                        className="rounded-full border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-400 dark:hover:border-purple-700 transition-all h-auto py-2 px-4 text-xs font-medium shadow-sm hover:shadow"
                        disabled={isSending}
                      >
                        <suggestion.icon className="h-3.5 w-3.5 ml-2" />
                        {suggestion.text}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Messages */}
            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx === messages.length - 1 ? 0.1 : 0 }}
                  className={cn(
                    "flex gap-4 items-start",
                    msg.sender === "user" ? "flex-row-reverse" : ""
                  )}
                >
                  {msg.sender === "bot" && (
                    <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-purple-200/50 dark:ring-purple-800/50">
                      <AvatarFallback className="bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-purple-600 dark:text-purple-400">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {msg.sender === "user" && (
                    <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-pink-200/50 dark:ring-pink-800/50">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {user?.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <motion.div
                    initial={{ opacity: 0, x: msg.sender === "user" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                      "rounded-2xl px-5 py-4 max-w-[75%] md:max-w-[60%] shadow-lg backdrop-blur-sm",
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 text-white rounded-tr-sm border border-white/20"
                        : "bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-950/40 dark:via-pink-950/30 dark:to-purple-950/50 text-foreground border-2 border-purple-200/60 dark:border-purple-800/60 rounded-tl-sm shadow-purple-200/50 dark:shadow-purple-900/20"
                    )}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-wrap break-words text-right font-medium" dir="rtl" lang="ar">
                      {msg.text}
                    </p>
                    <div
                      className={cn(
                        "text-xs mt-3 opacity-60 flex items-center gap-1",
                        msg.sender === "user"
                          ? "text-white/70"
                          : "text-muted-foreground"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {formatTime(msg.timestamp)}
                    </div>
                  </motion.div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 items-start"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-purple-200/50 dark:ring-purple-800/50">
                    <AvatarFallback className="bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-purple-600 dark:text-purple-400">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl rounded-tl-sm px-5 py-4 border border-purple-200/50 dark:border-purple-800/50">
                    <div className="flex gap-2">
                      <motion.div
                        className="w-2.5 h-2.5 bg-purple-500 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.7, delay: 0 }}
                      />
                      <motion.div
                        className="w-2.5 h-2.5 bg-pink-500 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2.5 h-2.5 bg-purple-500 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.7, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-t bg-background/80 backdrop-blur-sm py-4 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-3 items-end"
            >
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="اكتبي رسالتك هنا..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="rounded-2xl pr-12 h-12 bg-background border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-base text-right"
                  disabled={isSending}
                  dir="rtl"
                  lang="ar"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={!message.trim() || isSending}
                className="rounded-full h-12 w-12 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg transition-all disabled:opacity-50 flex-shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-3">
              المساعد الذكي متاح 24/7 لتقديم الدعم والمعلومات. في حالات الطوارئ، يُرجى الاتصال بالطوارئ.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
