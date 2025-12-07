import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInWithEmailAndPassword } from "@/lib/firebase";
import { useLocation, Link } from "wouter";
import { getRole, setRole } from "@/lib/authRole";
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowLeft, Heart, Loader2, AlertCircle } from "lucide-react";
import { firestoreDb, doc, getDoc } from "@/lib/firebase";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword((await import("@/lib/firebase")).auth, email, password);
      // Read role from Firestore profile if available
      let role = getRole() ?? "patient";
      try {
        const prof = await getDoc(doc(firestoreDb, "userProfiles", cred.user.uid));
        const data = prof.data() as any;
        // Only allow patient and doctor roles
        if (data?.role === "doctor" || data?.role === "patient") {
          role = data.role;
        } else if (data?.role === "admin") {
          // If admin tries to login here, redirect to admin login
          setError("يرجى استخدام صفحة تسجيل دخول الإدارة");
          setIsLoading(false);
          return;
        }
      } catch {}
      setRole(role);
      navigate(role === "doctor" ? "/doctor" : "/");
    } catch (err: any) {
      setError("فشل تسجيل الدخول. تأكدي من البريد وكلمة المرور.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -ml-48 -mb-48" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Welcome Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 text-primary px-5 py-2 text-sm font-semibold shadow-lg border border-primary/20 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>أهلاً بعودتك</span>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="w-full border-2 shadow-2xl bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm relative overflow-hidden">
            {/* Decorative Corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-xl -ml-12 -mb-12" />
            
            <CardHeader className="relative z-10 pb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                تسجيل الدخول
              </CardTitle>
              <CardDescription className="text-center mt-2 text-base">
                أدخلي بياناتك للوصول إلى حسابك
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative z-10">
              <form className="space-y-5" onSubmit={onSubmit}>
                {/* Email Input */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="أدخلي بريدك الإلكتروني"
                      required
                      disabled={isLoading}
                      className="pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                    />
                  </div>
                </motion.div>

                {/* Password Input */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخلي كلمة المرور"
                      required
                      disabled={isLoading}
                      className="pr-11 pl-10 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors z-10 p-1 rounded hover:bg-primary/10"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="toggle password"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </motion.div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border-2 border-red-200 dark:border-red-800"
                  >
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                        جاري تسجيل الدخول...
                      </>
                    ) : (
                      <>
                        <Sparkles className="ml-2 h-5 w-5" />
                        دخول
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Sign Up Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 pt-6 border-t border-border/50"
              >
                <p className="text-sm text-center text-muted-foreground">
                  ليس لديك حساب؟{" "}
                  <Link href="/signup/choose" className="text-primary hover:text-primary/80 font-semibold inline-flex items-center gap-1 transition-colors">
                    إنشاء حساب
                    <ArrowLeft className="h-3 w-3" />
                  </Link>
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}


