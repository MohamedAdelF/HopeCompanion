import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth, firestoreDb, doc, setDoc, getDoc, collection, getDocs } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function AdminSetupPage() {
  const [status, setStatus] = useState<"idle" | "creating" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [userExists, setUserExists] = useState<boolean | null>(null);

  const checkAdminExists = async () => {
    try {
      // Try to sign in first
      const cred = await signInWithEmailAndPassword(auth, "admin@admin.com", "admin123");
      const prof = await getDoc(doc(firestoreDb, "userProfiles", cred.user.uid));
      const data = prof.data() as any;
      if (data?.role === "admin") {
        setUserExists(true);
        setMessage("✅ حساب Admin موجود بالفعل!");
        setStatus("success");
        return true;
      } else {
        setUserExists(true);
        setMessage("⚠️ الحساب موجود لكن ليس لديه صلاحيات Admin. سيتم تحديثه...");
        // Update to admin role
        await setDoc(doc(firestoreDb, "userProfiles", cred.user.uid), {
          uid: cred.user.uid,
          role: "admin",
          email: "admin@admin.com",
          createdAt: data?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        setMessage("✅ تم تحديث صلاحيات Admin بنجاح!");
        setStatus("success");
        return true;
      }
    } catch (error: any) {
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setUserExists(false);
        return false;
      }
      // Check if there's a profile in Firestore but user deleted from Auth
      try {
        const profilesSnap = await getDocs(collection(firestoreDb, "userProfiles"));
        const adminProfiles = profilesSnap.docs.filter(d => {
          const data = d.data();
          return data.role === "admin" && data.email === "admin@admin.com";
        });
        if (adminProfiles.length > 0) {
          setMessage("⚠️ يوجد ملف Admin في Firestore لكن الحساب محذوف من Authentication. سيتم إنشاء حساب جديد...");
          setUserExists(false);
          return false;
        }
      } catch (e) {
        console.warn("Could not check Firestore:", e);
      }
      setUserExists(null);
      return false;
    }
  };

  const createAdmin = async () => {
    setStatus("creating");
    setMessage("جاري إنشاء حساب Admin...");
    
    try {
      // First check if account exists
      const exists = await checkAdminExists();
      if (exists) {
        return;
      }

      // Check if there's an orphaned admin profile in Firestore first
      let orphanedProfile: any = null;
      try {
        const profilesSnap = await getDocs(collection(firestoreDb, "userProfiles"));
        const adminProfiles = profilesSnap.docs.filter(d => {
          const data = d.data();
          return data.role === "admin" && data.email === "admin@admin.com";
        });
        if (adminProfiles.length > 0) {
          orphanedProfile = adminProfiles[0];
          setMessage("⚠️ تم العثور على ملف Admin قديم. سيتم حذفه وإنشاء حساب جديد...");
          // Delete old profile
          await setDoc(doc(firestoreDb, "userProfiles", orphanedProfile.id), {
            ...orphanedProfile.data(),
            deleted: true,
            deletedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (e) {
        console.warn("Could not check for orphaned profiles:", e);
      }

      // Create new admin account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        "admin@admin.com",
        "admin123"
      );

      // Create admin profile
      await setDoc(doc(firestoreDb, "userProfiles", userCredential.user.uid), {
        uid: userCredential.user.uid,
        role: "admin",
        email: "admin@admin.com",
        createdAt: new Date().toISOString(),
        restored: orphanedProfile ? true : undefined,
        restoredAt: orphanedProfile ? new Date().toISOString() : undefined,
      });

      setStatus("success");
      setMessage("✅ تم إنشاء حساب Admin بنجاح!");
      setUserExists(true);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        // Try to update existing account
        try {
          const cred = await signInWithEmailAndPassword(auth, "admin@admin.com", "admin123");
          await setDoc(doc(firestoreDb, "userProfiles", cred.user.uid), {
            uid: cred.user.uid,
            role: "admin",
            email: "admin@admin.com"
          }, { merge: true });
          setStatus("success");
          setMessage("✅ تم تحديث صلاحيات Admin بنجاح!");
          setUserExists(true);
        } catch (updateError) {
          setStatus("error");
          setMessage("❌ حدث خطأ: " + (updateError as any).message);
        }
      } else {
        setStatus("error");
        setMessage("❌ حدث خطأ: " + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-primary/5 via-background to-background" dir="rtl">
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            استعادة/إنشاء حساب Admin
          </CardTitle>
          <CardDescription className="text-center">
            استخدم هذه الصفحة لاستعادة حساب الإدارة المحذوف أو إنشاء حساب جديد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-700 dark:text-blue-300">مهم!</AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs">
              إذا كان حساب Admin محذوفاً من Firebase Authentication، يمكنك استخدام هذه الصفحة لإعادة إنشائه.
              سيتم إنشاء حساب جديد ببيانات تسجيل الدخول التالية:
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 border-2">
            <p className="text-sm font-medium text-center mb-3">بيانات تسجيل الدخول:</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-background rounded">
                <span className="font-medium">Email:</span>
                <span className="font-mono text-primary">admin@admin.com</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-background rounded">
                <span className="font-medium">Password:</span>
                <span className="font-mono text-primary">admin123</span>
              </div>
            </div>
            <Alert className="mt-3 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20" dir="rtl">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-xs">
                ⚠️ يُنصح بتغيير كلمة المرور بعد تسجيل الدخول من لوحة الإدارة
              </AlertDescription>
            </Alert>
          </div>

          {status === "success" && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700 dark:text-green-400">نجح!</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-300">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={createAdmin}
            disabled={status === "creating" || status === "success"}
            className="w-full"
            size="lg"
          >
            {status === "creating" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === "creating" && "جاري الإنشاء..."}
            {status === "success" && "✅ تم الإنشاء"}
            {status !== "creating" && status !== "success" && "إنشاء حساب Admin"}
          </Button>

          {status === "success" && (
            <div className="space-y-2">
              <Button
                variant="default"
                onClick={() => window.location.href = "/admin/login"}
                className="w-full"
              >
                الانتقال إلى تسجيل دخول Admin
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/login"}
                className="w-full"
              >
                الانتقال إلى تسجيل الدخول العادي
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

