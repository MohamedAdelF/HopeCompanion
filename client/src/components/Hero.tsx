import { Button } from "@/components/ui/button";
import { MessageCircleHeart, Heart, Sparkles, ChevronDown } from "lucide-react";
import heroImage from "@assets/generated_images/Warm_medical_consultation_hero_image_d71069dd.png";
import { Link } from "wouter";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <div className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.2 }}
      />
      
      {/* Enhanced Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Main Title */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Heart className="h-8 w-8 text-white fill-white" />
              </div>
            </motion.div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent">
                رفيق الأمل
              </span>
              <br />
              <span className="text-white/95">في رحلة العلاج</span>
        </h1>
          </div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg md:text-xl lg:text-2xl text-white/95 mb-10 font-body leading-relaxed max-w-3xl mx-auto"
          >
          منصة متكاملة تجمع بين التكنولوجيا الذكية والدعم النفسي لمساعدة المريضات والأطباء في رحلة مواجهة سرطان الثدي
          </motion.p>
        
          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/signup/choose">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
                  className="text-lg px-10 py-7 rounded-full bg-gradient-to-r from-white to-white/95 text-primary hover:from-white/95 hover:to-white shadow-2xl hover:shadow-3xl transition-all duration-300 font-bold"
            data-testid="button-patient-start"
          >
                  <MessageCircleHeart className="ml-2 h-6 w-6" />
                  ابدئي الآن
          </Button>
              </motion.div>
            </Link>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
            >
          <Button
            size="lg"
                variant="ghost"
                className="text-lg px-8 py-6 rounded-full text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
          >
                <Sparkles className="ml-2 h-5 w-5" />
                استكشفي المزايا
          </Button>
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Enhanced Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <motion.a
          href="#features"
          className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-xs font-medium mb-2">انتقلي للأسفل</span>
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex items-start justify-center p-2 backdrop-blur-sm">
            <ChevronDown className="h-4 w-4 text-white/80" />
        </div>
        </motion.a>
      </motion.div>
    </div>
  );
}
