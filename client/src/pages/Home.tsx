import { useEffect, useCallback } from "react";
import { Hero } from "@/components/Hero";
import { FeatureCard } from "@/components/FeatureCard";
import { MedicalCentersMap } from "@/components/MedicalCentersMap";
import { MessageCircleHeart, FileText, Calendar, BookOpen, Heart, Shield, Sparkles, TrendingUp, CheckCircle2, Users, Zap, Building2, MapPin, ChevronDown, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const scrollToMedicalCenters = useCallback(() => {
    const element = document.getElementById('medical-centers-map');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handle hash links on page load
  useEffect(() => {
    if (window.location.hash === '#medical-centers-map') {
      const timeoutId = setTimeout(() => {
        scrollToMedicalCenters();
      }, 300);
      // Cleanup timeout on unmount
      return () => clearTimeout(timeoutId);
    }
  }, [scrollToMedicalCenters]);

  return (
    <div>
      <Hero />

      {/* Medical Centers Quick Access Banner */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-y-2 border-primary/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-background via-primary/5 to-background overflow-hidden cursor-pointer group hover:shadow-2xl transition-all duration-300"
              onClick={scrollToMedicalCenters}
            >
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <motion.div
                      className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg group-hover:scale-110 transition-transform"
                      whileHover={{ rotate: 5 }}
                    >
                      <Building2 className="h-8 w-8 text-primary" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/80 transition-all">
                        العيادات والمستشفيات المقترحة
                      </h3>
                      <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                        ابحثي عن أقرب مركز طبي متخصص في علاج سرطان الثدي واحصلي على معلومات الاتصال والعنوان مع خريطة تفاعلية
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">56+ مركز طبي</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                          <Navigation className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">خريطة تفاعلية</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">21 محافظة مصرية</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0"
                  >
                    <Button
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToMedicalCenters();
                      }}
                      className="w-full md:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 group-hover:shadow-primary/50"
                    >
                      <span>استكشفي المراكز الطبية</span>
                      <ChevronDown className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-bounce" />
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
      
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-background to-primary/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              خدماتنا المتكاملة
            </h2>
            </div>
            <p className="text-xl text-muted-foreground font-body max-w-3xl mx-auto leading-relaxed">
              نوفر لك مجموعة شاملة من الأدوات والخدمات لدعمك في كل خطوة من رحلتك الصحية
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
            <FeatureCard
              icon={MessageCircleHeart}
              title="دعم نفسي متواصل"
              description="تحدثي مع المساعد الذكي في أي وقت للحصول على الدعم والمعلومات الموثوقة"
              href="/chat"
            />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}>
            <FeatureCard
              icon={Shield}
              title="تقييم المخاطر"
              description="أداة تفاعلية لتقييم مستوى الخطر الشخصي مع توصيات مخصصة"
              href="/risk-assessment"
            />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }}>
            <FeatureCard
              icon={BookOpen}
              title="مكتبة توعوية"
              description="محتوى تعليمي شامل من مقالات وفيديوهات موثوقة"
              href="/education"
            />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 }}>
            <FeatureCard
              icon={FileText}
              title="يومياتي"
              description="سجلي مشاعرك وأعراضك اليومية لمتابعة تقدمك"
              href="/diary"
            />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.4 }}>
            <FeatureCard
              icon={Calendar}
              title="تنظيم المواعيد"
              description="تذكيرات تلقائية بالمواعيد والأدوية"
              href="/appointments"
            />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.5 }}>
            <FeatureCard
              icon={Heart}
              title="دعم شامل"
              description="مجتمع داعم ومعلومات موثوقة من مصادر طبية معتمدة"
              href="/support"
            />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Heart className="h-8 w-8 text-primary fill-primary" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80">
            لستِ وحدك في هذه الرحلة
          </h2>
            </div>
            <p className="text-xl font-body leading-relaxed text-foreground/80 max-w-3xl mx-auto">
            رفيق الأمل يجمع بين أحدث التقنيات الذكية والدعم النفسي المتخصص لمساعدتك
            ومساعدة أطبائك في اتخاذ أفضل القرارات الطبية. نحن هنا لنكون سنداً لك في
            كل خطوة من رحلة العلاج والتعافي.
          </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link href="/signup/choose">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base bg-gradient-to-r from-primary to-primary/90 shadow-lg hover:shadow-xl"
                  >
                    <Sparkles className="ml-2 h-5 w-5" />
                    ابدئي الآن
                  </Button>
                </motion.div>
              </Link>
              <Link href="/login">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-base border-2"
                  >
                    لدي حساب بالفعل
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">لماذا رفيق الأمل؟</h2>
            <p className="text-lg text-muted-foreground">مزايا تجعلنا الخيار الأمثل لدعمك</p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "دعم ذكي",
                description: "مساعد متكامل للاستفسارات والتوجيه",
                color: "from-yellow-500 to-orange-500"
              },
              {
                icon: TrendingUp,
                title: "متابعة دقيقة",
                description: "تنبيهات من اليوميات والتقييمات للطبيب",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: Users,
                title: "تجربة لطيفة",
                description: "تصميم عربي متوافق ويعمل على الجوال",
                color: "from-purple-500 to-pink-500"
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="h-full"
                >
                  <Card className="h-full shadow-lg hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/30 bg-gradient-to-br from-background to-primary/5 group">
                    <CardContent className="p-8 text-center space-y-4">
                      <motion.div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                        whileHover={{ rotate: 5 }}
                      >
                        <Icon className="h-8 w-8 text-white" />
                      </motion.div>
                      <h3 className="text-2xl font-bold">{feature.title}</h3>
                      <p className="text-base text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Medical Centers Map Section */}
      <div id="medical-centers-map">
        <MedicalCentersMap />
      </div>
    </div>
  );
}
