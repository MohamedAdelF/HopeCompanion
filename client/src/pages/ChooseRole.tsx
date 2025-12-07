import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Stethoscope, ArrowLeft, Shield, Sparkles, Heart, CheckCircle2, Star, Users, Calendar, FileText, MessageCircleHeart } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function ChooseRole() {
  const features = {
    patient: [
      { icon: FileText, text: "إدارة ملفك الصحي" },
      { icon: Calendar, text: "متابعة اليوميات" },
      { icon: MessageCircleHeart, text: "دعم نفسي متواصل" },
      { icon: Users, text: "تقييمات المخاطر" },
    ],
    doctor: [
      { icon: Users, text: "لوحة تحكم بالمرضى" },
      { icon: FileText, text: "تنبيهات ذكية" },
      { icon: Calendar, text: "إدارة المواعيد" },
      { icon: MessageCircleHeart, text: "نظام الرسائل" },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -ml-48 -mb-48" />
      
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 text-primary px-5 py-2 text-sm font-semibold shadow-lg border border-primary/20 backdrop-blur-sm mb-6">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>ابدئي رحلتك مع رفيق الأمل</span>
          </div>
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg">
              <Heart className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            اختاري نوع الحساب المناسب لك
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            يمكنك دائماً تغيير المعلومات لاحقاً من ملفك الشخصي
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-12">
          {/* Patient Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full group cursor-pointer border-2 border-primary/30 hover:border-primary/60 bg-gradient-to-br from-background via-background to-primary/5 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                  {/* Recommended Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-primary to-primary/90 text-white rounded-full text-xs font-bold shadow-lg">
                      <Star className="h-3 w-3 fill-white" />
                      <span>موصى به</span>
                    </div>
                  </div>

                  {/* Decorative Corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors" />
                  
                  <CardHeader className="relative z-10 pb-4">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                      <span>مريضة</span>
                    </CardTitle>
                    <CardDescription className="text-center mt-2 text-base">
                      إدارة شاملة لصحتك ورحلتك العلاجية
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="relative z-10 space-y-6">
                    {/* Features List */}
                    <div className="grid grid-cols-2 gap-3">
                      {features.patient.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors"
                          >
                            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm font-medium">{feature.text}</span>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed text-center">
                      إدارة ملفك الصحي ويومياتك، إجراء تقييمات المخاطر، واستلام تنبيهات ودعم نفسي وتعليمي.
                    </p>

                    {/* CTA Button */}
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/signup?role=patient`;
                      }}
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                    >
                      <span>الانتقال لتعبئة البيانات</span>
                      <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
          </motion.div>

          {/* Doctor Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-full group cursor-pointer border-2 border-border hover:border-primary/40 bg-gradient-to-br from-background via-background to-primary/5 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                  {/* Decorative Corner */}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -ml-16 -mt-16 group-hover:bg-primary/20 transition-colors" />
                  
                  <CardHeader className="relative z-10 pb-4">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                        <Stethoscope className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                      <span>طبيب</span>
                    </CardTitle>
                    <CardDescription className="text-center mt-2 text-base">
                      لوحة تحكم متكاملة لإدارة المرضى
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="relative z-10 space-y-6">
                    {/* Features List */}
                    <div className="grid grid-cols-2 gap-3">
                      {features.doctor.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                            className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors"
                          >
                            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm font-medium">{feature.text}</span>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed text-center">
                      لوحة تحكم بالمرضى، تنبيهات ذكية من اليوميات والتقييمات، إدارة المواعيد والرسائل.
                    </p>

                    {/* CTA Button */}
                    <Button 
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/signup?role=doctor`;
                      }}
                      className="w-full h-12 text-base font-semibold border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                    >
                      <span>الانتقال لتعبئة البيانات</span>
                      <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
          </motion.div>
        </div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <Card className="border-2 bg-gradient-to-br from-background to-primary/5 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    أمان وخصوصية كاملة
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    نلتزم بتجربة آمنة ولطيفة. بياناتك تُستخدم لتحسين رعايتك فقط. جميع المعلومات محمية ومشفرة.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">
            لديك حساب مسبقاً؟{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-semibold inline-flex items-center gap-1 transition-colors">
              تسجيل الدخول
              <ArrowLeft className="h-3 w-3" />
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}


