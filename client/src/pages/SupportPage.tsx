import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  HelpCircle, 
  Mail, 
  Phone, 
  MessageCircle, 
  Heart, 
  Users, 
  BookOpen, 
  Shield, 
  CheckCircle2, 
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  Sparkles,
  AlertCircle,
  Stethoscope,
  Calendar,
  Loader2
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { firestoreDb, collection, addDoc } from "@/lib/firebase";
import { Link } from "wouter";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "general" | "medical" | "technical";
}

const faqData: FAQItem[] = [
  {
    id: "1",
    question: "ما هي أعراض سرطان الثدي التي يجب أن أنتبه إليها؟",
    answer: "أعراض سرطان الثدي الرئيسية تشمل: كتلة أو سماكة في الثدي أو تحت الإبط، تغيّر في حجم أو شكل الثدي، إفرازات من الحلمة (خاصة الدموية)، تغيّرات في جلد الثدي (احمرار، تجعّد، قشور)، تغيّر في الحلمة (انكماش أو انعكاس)، أو ألم مستمر. تذكّري أن معظم الكتل ليست سرطانية، لكن أي تغيّر يستدعي استشارة الطبيب فوراً.",
    category: "medical"
  },
  {
    id: "2",
    question: "كيف أفحص ثديي ذاتياً؟",
    answer: "الفحص الذاتي يتم بعد انتهاء الدورة بـ 3-5 أيام. قومي بالفحص: 1) أمام المرآة للتحقق من التغيّرات في الشكل والحجم، 2) تحت الدش باستخدام أصابعك للتحسّس بحركة دائرية من الخارج للداخل، 3) مستلقية على ظهرك مع وضع يد تحت رأسك وفحص بيدك الأخرى. ابحثي عن كتل، تورّم، تغيّرات في الجلد، أو إفرازات. إن لاحظتِ أي تغيّر، راجعي الطبيب خلال أسبوع.",
    category: "medical"
  },
  {
    id: "3",
    question: "متى يجب أن أزور الطبيب؟",
    answer: "يجب زيارة الطبيب فوراً إذا لاحظتِ: كتلة جديدة أو متغيّرة، إفراز دموي من الحلمة، تغيّر مفاجئ في شكل الثدي، أو ألم مستمر أو شديد. الفحوصات الدورية: الفحص الذاتي شهرياً بعد سن 20، الفحص السريري سنوياً من سن 25-40، والماموجرام كل 1-2 سنة من سن 40-50، ثم سنوياً بعد 50.",
    category: "medical"
  },
  {
    id: "4",
    question: "كيف يمكنني التواصل مع الطبيب المتابع لحالتي؟",
    answer: "يمكنك التواصل مع طبيبك من خلال صفحة 'التواصل مع الطبيب' في القائمة الرئيسية أو من خلال قائمة 'المزيد' في شريط التنقل. يمكنك إرسال رسائل مباشرة وسيقوم الطبيب بالرد عليها في أقرب وقت ممكن (عادة خلال 24 ساعة).",
    category: "general"
  },
  {
    id: "5",
    question: "ما هي عوامل الخطر لسرطان الثدي؟",
    answer: "عوامل الخطر تشمل: التقدّم في العمر (فوق 50)، التاريخ العائلي، الطفرات الجينية (BRCA1, BRCA2)، بدء الدورة مبكراً أو انقطاعها متأخراً (عوامل لا يمكن تغييرها). عوامل قابلة للتحكم: الوزن الزائد بعد سن اليأس، قلة النشاط البدني، شرب الكحول، وعدم الإرضاع الطبيعي. للوقاية: اتبعي نظام غذائي صحي، مارسي الرياضة، وفحصي بانتظام.",
    category: "medical"
  },
  {
    id: "6",
    question: "كيف يمكنني استخدام المساعد الذكي؟",
    answer: "المساعد الذكي متخصص في سرطان الثدي ومتاح دائماً. يمكنك الوصول إليه من خلال: 1) الأيقونة في الزاوية السفلية اليمنى من الشاشة، 2) صفحة 'المساعد الذكي' من القائمة، أو 3) من خلال 'مركز الدعم'. يمكنك طرح أسئلة عن الأعراض، الفحص الذاتي، الوقاية، والدعم النفسي. المساعد متاح 24/7 لتقديم الدعم والمعلومات الموثوقة.",
    category: "technical"
  },
  {
    id: "7",
    question: "ما هو الفرق بين تقييم المخاطر والفحص الطبي الفعلي؟",
    answer: "تقييم المخاطر هو أداة توعوية تساعدك على فهم العوامل المؤثرة على خطر إصابتك بسرطان الثدي. يعطيك فكرة عامة عن مستوى الخطر (منخفض، متوسط، مرتفع) لكنه لا يُغني عن الفحص الطبي الفعلي. يُنصح دائماً باستشارة طبيبك للحصول على تشخيص دقيق. الفحوصات الطبية الفعلية (الفحص السريري، الماموجرام، السونار) هي التي تكشف عن أي مشاكل فعلياً.",
    category: "medical"
  },
  {
    id: "8",
    question: "كيف يمكنني حجز موعد متابعة؟",
    answer: "يمكنك حجز موعد من خلال صفحة 'المواعيد' في القائمة الرئيسية أو من قائمة 'المزيد'. اختر التاريخ والوقت المناسبين لك، وسيصلك تأكيد بالموعد. يمكنك أيضاً التواصل مع طبيبك مباشرة لطلب موعد مناسب إذا لم تجدِ وقتاً متاحاً في الجدول.",
    category: "general"
  },
  {
    id: "9",
    question: "هل بياناتي الشخصية محمية وآمنة؟",
    answer: "نعم، نحن نستخدم أعلى معايير الأمان لحماية بياناتك. جميع المعلومات مشفرة ومحمية وفقاً لقوانين حماية البيانات الطبية الدولية. لا يتم مشاركة بياناتك مع أي جهات خارجية دون موافقتك الصريحة. فريقنا الطبي فقط لديه صلاحية الوصول لبياناتك الصحية لضمان تقديم أفضل رعاية ممكنة.",
    category: "technical"
  },
  {
    id: "10",
    question: "كيف يمكنني تغيير معلوماتي الشخصية؟",
    answer: "يمكنك تحديث معلوماتك الشخصية من صفحة 'الملف الشخصي' والتي يمكنك الوصول إليها من خلال أيقونة الحساب في شريط التنقل. يمكنك تعديل اسمك، رقم الهاتف، العنوان، الطبيب المتابع، وأي معلومات أخرى. جميع التحديثات تظهر فوراً في ملفك.",
    category: "general"
  },
  {
    id: "11",
    question: "هل يمكنني استخدام التطبيق بدون إنترنت؟",
    answer: "بعض الميزات تعمل بدون إنترنت مثل: قراءة المحتوى التعليمي المحفوظ، اليوميات المحفوظة، وعرض المعلومات المحفوظة. لكن للتواصل مع الطبيب، استخدام المساعد الذكي، حجز المواعيد، أو الحصول على تحديثات جديدة، ستحتاجين لاتصال بالإنترنت.",
    category: "technical"
  },
  {
    id: "12",
    question: "ما هي طرق الوقاية من سرطان الثدي؟",
    answer: "للوقاية من سرطان الثدي: 1) اتبعي نظام غذائي صحي غني بالخضار والفواكه، 2) مارسي الرياضة 30 دقيقة معظم أيام الأسبوع، 3) حافظي على وزن صحي خاصة بعد سن اليأس، 4) تجنّبي الكحول أو قلّلي منه، 5) الإرضاع الطبيعي إن أمكن، 6) الفحص المبكر بانتظام (الفحص الذاتي شهرياً، الفحص السريري سنوياً، الماموجرام حسب العمر). تذكّري: الاكتشاف المبكر يحسّن نتائج العلاج بشكل كبير.",
    category: "medical"
  }
];

export default function SupportPage() {
  const { user } = useAuth();
  const [openFAQs, setOpenFAQs] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    email: user?.email || "",
    subject: "",
    message: "",
  });
  const [selectedCategory, setSelectedCategory] = useState<"all" | "general" | "medical" | "technical">("all");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Update form data when user changes
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
        name: prev.name || user.email?.split("@")[0] || "",
      }));
    }
  }, [user]);

  const toggleFAQ = (id: string) => {
    const newOpen = new Set(openFAQs);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenFAQs(newOpen);
  };

  const filteredFAQs = selectedCategory === "all" 
    ? faqData 
    : faqData.filter(faq => faq.category === selectedCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      return;
    }
    
    setSending(true);
    try {
      // Save to Firestore support collection
      await addDoc(collection(firestoreDb, "supportRequests"), {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        userId: user?.uid || null,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setSent(true);
      setFormData({ 
        name: user?.email?.split("@")[0] || "", 
        email: user?.email || "", 
        subject: "", 
        message: "" 
      });
      
      setTimeout(() => {
        setSent(false);
      }, 5000);
    } catch (error) {
      console.error("Error sending support request:", error);
      alert("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                مركز الدعم والمساعدة
              </h1>
            </div>
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground font-body max-w-3xl mx-auto leading-relaxed px-4">
              نحن هنا لدعمك في كل خطوة من رحلتك الصحية. اتصلي بنا أو ابحثي عن إجابة لسؤالك
            </p>
          </motion.div>

          {/* Quick Support Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">المساعد الذكي</CardTitle>
                      <CardDescription>متاح 24/7</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    احصلي على إجابات فورية من مساعدنا الذكي المتخصص في سرطان الثدي
                  </p>
                  <Button variant="outline" className="w-full border-purple-300 dark:border-purple-700" asChild>
                    <Link href="/chat">
                      <MessageCircle className="h-4 w-4 ml-2" />
                      ابدأ المحادثة
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-2 border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl">
                      <Stethoscope className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">التواصل مع الطبيب</CardTitle>
                      <CardDescription>رد في غضون 24 ساعة</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    تواصلي مع طبيبك المتابع مباشرة
                  </p>
                  <Button variant="outline" className="w-full border-pink-300 dark:border-pink-700" asChild>
                    <Link href="/doctor">افتح المحادثة</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">البريد الإلكتروني</CardTitle>
                      <CardDescription>support@pinkhope.com</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    أرسلي لنا بريداً وسنرد عليك قريباً
                  </p>
                  <Button variant="outline" className="w-full border-purple-300 dark:border-purple-700" asChild>
                    <a href="mailto:support@pinkhope.com">إرسال بريد</a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <HelpCircle className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                الأسئلة الشائعة
              </h2>
            </div>
            <p className="text-lg text-muted-foreground">
              إجابات على الأسئلة الأكثر شيوعاً
            </p>
          </motion.div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {(["all", "general", "medical", "technical"] as const).map((cat) => (
              <motion.div
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={selectedCategory === cat 
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 shadow-md" 
                    : "hover:border-primary/50"}
                >
                  {cat === "all" && "الكل"}
                  {cat === "general" && "عام"}
                  {cat === "medical" && "طبي"}
                  {cat === "technical" && "تقني"}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredFAQs.map((faq, idx) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-2 hover:border-primary/50 transition-all overflow-hidden group">
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleFAQ(faq.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <HelpCircle className="h-5 w-5 text-primary" />
                          </div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">{faq.question}</CardTitle>
                        </div>
                        {openFAQs.has(faq.id) ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                    <AnimatePresence>
                      {openFAQs.has(faq.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <CardContent className="pt-0 pb-4">
                            <div className="pr-12 text-muted-foreground leading-relaxed">
                              {faq.answer}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-background dark:from-purple-950/10 dark:via-pink-950/10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Mail className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                تواصلي معنا
              </h2>
            </div>
            <p className="text-lg text-muted-foreground">
              لم تجدي إجابتك؟ أرسلي لنا رسالة وسنرد عليك قريباً
            </p>
          </motion.div>

          <Card className="border-2 shadow-xl">
            <CardHeader>
              <CardTitle>نموذج التواصل</CardTitle>
              <CardDescription>
                املأي النموذج أدناه وسنتواصل معك في أقرب وقت ممكن
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أدخلي اسمك"
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="example@email.com"
                      required
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">الموضوع *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="ما هو موضوع استفسارك؟"
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">الرسالة *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="اكتبي رسالتك هنا..."
                    required
                    rows={6}
                    className="rounded-xl resize-none"
                  />
                </div>
                <AnimatePresence>
                  {sent && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="text-green-700 dark:text-green-400 font-medium">
                        تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button
                  type="submit"
                  disabled={sending || sent}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl h-12 text-lg font-semibold"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : sent ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 ml-2" />
                      تم الإرسال
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 ml-2" />
                      إرسال الرسالة
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Support Resources */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="h-8 w-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                موارد الدعم الإضافية
              </h2>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookOpen,
                title: "المكتبة التعليمية",
                description: "محتوى تعليمي شامل عن الصحة والوقاية",
                href: "/education",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: Shield,
                title: "تقييم المخاطر",
                description: "تقييم شخصي لمستوى الخطر",
                href: "/risk-assessment",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Calendar,
                title: "المواعيد",
                description: "إدارة مواعيدك الطبية",
                href: "/appointments",
                color: "from-pink-500 to-rose-500"
              },
              {
                icon: Heart,
                title: "الدعم النفسي",
                description: "موارد للصحة النفسية والعاطفية",
                href: "/diary",
                color: "from-rose-500 to-pink-500"
              }
            ].map((resource, idx) => (
              <motion.div
                key={resource.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <Card className="h-full border-2 hover:border-primary/50 transition-all cursor-pointer group">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${resource.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <resource.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full" asChild>
                      <Link href={resource.href}>استكشف الآن</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Notice */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-t border-b border-red-200 dark:border-red-800">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex items-start gap-4 p-6 bg-white dark:bg-red-950/10 rounded-2xl border-2 border-red-300 dark:border-red-700 shadow-lg"
          >
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
                في حالات الطوارئ
              </h3>
              <p className="text-red-600 dark:text-red-300 leading-relaxed">
                إذا كنت تواجهين حالة طبية طارئة أو أعراض خطيرة (مثل ألم شديد، نزيف، أو صعوبة في التنفس)، 
                يرجى <strong>التوجه فوراً إلى أقرب مستشفى</strong> أو الاتصال برقم الطوارئ (997). 
                لا تعتمدي على هذا الموقع في حالات الطوارئ الطبية.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
