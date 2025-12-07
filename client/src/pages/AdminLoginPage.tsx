import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInWithEmailAndPassword, auth, firestoreDb, doc, getDoc } from "@/lib/firebase";
import { useLocation, Link } from "wouter";
import { getRole, setRole } from "@/lib/authRole";
import { Eye, EyeOff, Lock, Shield, Sparkles, ArrowLeft, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Support admin login with username "admin" and password "admin123"
      let loginEmail = username;
      if (username.toLowerCase() === "admin" && password === "admin123") {
        loginEmail = "admin@admin.com";
      }
      
      // Validate email format
      if (!loginEmail || !loginEmail.includes("@")) {
        setError("يرجى إدخال بريد إلكتروني صحيح");
        return;
      }
      
      const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
      // Check if user is admin
      let role = "patient";
      try {
        const prof = await getDoc(doc(firestoreDb, "userProfiles", cred.user.uid));
        const data = prof.data() as any;
        if (data?.role === "admin") {
          role = "admin";
        } else {
          setError("هذا الحساب ليس لديه صلاحيات إدارة");
          return;
        }
      } catch (err) {
        setError("فشل التحقق من الصلاحيات. تأكد من أن حساب Admin موجود.");
        return;
      }
      
      setRole(role);
      navigate("/admin");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("الحساب غير موجود أو غير مصرح به.");
      } else if (err.code === "auth/wrong-password") {
        setError("كلمة المرور غير صحيحة.");
      } else if (err.code === "auth/invalid-email") {
        setError("البريد الإلكتروني غير صحيح.");
      } else {
        setError("فشل تسجيل الدخول. تحقق من بيانات الدخول.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="w-full max-w-md">
        {/* Header with Theme Toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-center flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1 text-xs font-medium">
              <Shield className="h-3 w-3" /> تسجيل دخول الإدارة
            </div>
          </div>
          <ThemeToggle />
        </div>
        
        <Card className="w-full border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">تسجيل دخول الإدارة</CardTitle>
            <CardDescription>
              لوحة تحكم النظام للمدراء فقط
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-medium mb-2 block">اسم المستخدم أو البريد الإلكتروني</label>
                <div className="relative">
                  <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                    className="pr-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="pr-9"
                  />
                  <button 
                    type="button" 
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" 
                    onClick={() => setShowPassword(!showPassword)} 
                    aria-label="toggle password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" size="lg">
                <Shield className="mr-2 h-4 w-4" />
                تسجيل الدخول
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  العودة للصفحة الرئيسية
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

