import { DoctorDashboard } from "@/components/DoctorDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Heart, LogOut, Stethoscope, Home } from "lucide-react";
import { Switch, Route, useLocation } from "wouter";
import { PatientDetails } from "@/pages/PatientDetails";
import { useAuth } from "@/components/AuthProvider";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function DoctorPage() {
  const { logout, user } = useAuth();
  const [location] = useLocation();
  const isPatientDetails = location?.includes("/doctor/patient/");

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            {/* Left Section */}
            <div className="flex items-center gap-4 flex-1">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Heart className="h-8 w-8 text-primary fill-primary" />
                    <div>
                      <span className="text-xl font-bold">رفيق الأمل</span>
                      <span className="text-sm text-muted-foreground mr-2">- لوحة الأطباء</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
              {isPatientDetails && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-muted-foreground">|</span>
                  <Link href="/doctor">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Home className="h-4 w-4" />
                      <span className="hidden sm:inline">العودة للوحة التحكم</span>
                    </Button>
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Center Section - Home Button */}
            <div className="flex items-center justify-center flex-1">
              <Link href="/">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-primary"
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">الصفحة الرئيسية</span>
                    <span className="sm:hidden">الرئيسية</span>
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              {!isPatientDetails && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary px-3 py-1">
                    <Stethoscope className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">لوحة الأطباء</span>
                  </Badge>
                </motion.div>
              )}
            <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
                <span className="sm:hidden">خروج</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Switch>
          <Route path="/doctor/patient/:id" component={PatientDetails} />
          <Route path="/doctor">
        <DoctorDashboard />
          </Route>
        </Switch>
      </main>
    </div>
  );
}
