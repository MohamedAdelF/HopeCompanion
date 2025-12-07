import React, { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PatientNavigation } from "@/components/PatientNavigation";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import RiskAssessmentPage from "@/pages/RiskAssessmentPage";
import EducationPage from "@/pages/EducationPage";
import DiaryPage from "@/pages/DiaryPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import CalendarPage from "@/pages/CalendarPage";
import DoctorPage from "@/pages/DoctorPage";
import DoctorProfile from "@/pages/DoctorProfile";
import DoctorUpdateInfo from "@/pages/DoctorUpdateInfo";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import { getRole } from "@/lib/authRole";
import { firestoreDb, doc, getDoc, collection, query, where, getDocs } from "@/lib/firebase";
import PatientProfile from "@/pages/PatientProfile";
import ChooseRole from "@/pages/ChooseRole";
import SupportPage from "@/pages/SupportPage";
import ChatPage from "@/pages/ChatPage";
import AdminPage from "@/pages/AdminPage";
import AdminSetupPage from "@/pages/AdminSetupPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import HowPage from "@/pages/HowPage";
import PresentationPage from "@/pages/PresentationPage";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PatientNavigation />
      <main>{children}</main>
      <ChatbotWidget />
    </>
  );
}

function SignupPageWithRoleCheck() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  
  useEffect(() => {
    // إذا لم يكن هناك role parameter أو كان غير صحيح، توجيه إلى صفحة الاختيار
    if (!role || (role !== "patient" && role !== "doctor")) {
      navigate("/signup/choose", { replace: true });
    }
  }, [role, navigate]);
  
  // إذا لم يكن هناك role صحيح، لا نعرض شيئاً (سيتم التوجيه)
  const params2 = new URLSearchParams(window.location.search);
  const role2 = params2.get("role");
  if (!role2 || (role2 !== "patient" && role2 !== "doctor")) {
    return null;
  }
  
  // إذا كان هناك role صحيح، عرض SignupPage
  return (
    <PatientLayout>
      <SignupPage />
    </PatientLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PatientLayout>
          <Home />
        </PatientLayout>
      </Route>
      <Route path="/login">
        <PatientLayout>
          <LoginPage />
        </PatientLayout>
      </Route>
      <Route path="/doctor/profile">
        <ProtectedDoctor>
          <DoctorProfile />
        </ProtectedDoctor>
      </Route>
      <Route path="/doctor/update-info">
        <ProtectedDoctor>
          <DoctorUpdateInfo />
        </ProtectedDoctor>
      </Route>
      <Route path="/doctor/patient/:id">
        <ProtectedDoctor />
      </Route>
      <Route path="/signup/choose">
        <PatientLayout>
          <ChooseRole />
        </PatientLayout>
      </Route>
      <Route path="/signup">
        <SignupPageWithRoleCheck />
      </Route>
      <Route path="/profile">
        <ProtectedPatient />
      </Route>
      <Route path="/risk-assessment">
        <PatientLayout>
          <RiskAssessmentPage />
        </PatientLayout>
      </Route>
      <Route path="/education">
        <PatientLayout>
          <EducationPage />
        </PatientLayout>
      </Route>
      <Route path="/diary">
        <PatientLayout>
          <DiaryPage />
        </PatientLayout>
      </Route>
      <Route path="/appointments">
        <ProtectedPatientPage>
          <PatientLayout>
            <AppointmentsPage />
          </PatientLayout>
        </ProtectedPatientPage>
      </Route>
      <Route path="/calendar">
        <ProtectedPatientPage>
          <PatientLayout>
            <CalendarPage />
          </PatientLayout>
        </ProtectedPatientPage>
      </Route>
      <Route path="/doctor">
        <ProtectedDoctor />
      </Route>
      <Route path="/support">
        <PatientLayout>
          <SupportPage />
        </PatientLayout>
      </Route>
      <Route path="/chat">
        <PatientLayout>
          <ChatPage />
        </PatientLayout>
      </Route>
      <Route path="/how">
        <PatientLayout>
          <HowPage />
        </PatientLayout>
      </Route>
      <Route path="/presentation">
        <PatientLayout>
          <PresentationPage />
        </PatientLayout>
      </Route>
      {/* Admin setup page - available for account recovery */}
        <Route path="/admin/setup">
          <AdminSetupPage />
        </Route>
      <Route path="/admin/login">
        <AdminLoginPage />
      </Route>
      <Route path="/admin">
        <ProtectedAdmin />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ProtectedDoctor({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [checking, setChecking] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<"pending" | "needsInfo" | "rejected" | null>(null);

  useEffect(() => {
    const checkDoctorRole = async () => {
      if (loading) return;
      if (!user) {
        navigate("/login");
        return;
      }
      
      // Check if doctor is approved (exists in doctors collection)
      try {
        const doctorDoc = await getDoc(doc(firestoreDb, "doctors", user.uid));
        if (doctorDoc.exists()) {
          setIsDoctor(true);
          setIsApproved(true);
          setChecking(false);
          return;
        }
        
        // Doctor not approved, check registration request
        const requestsSnap = await getDocs(
          query(
            collection(firestoreDb, "doctorRegistrationRequests"),
            where("uid", "==", user.uid)
          )
        );
        
        if (!requestsSnap.empty) {
          const request = requestsSnap.docs[0].data() as any;
          setRegistrationStatus(request.status);
          
          // Check userProfiles for role (might be doctor but not approved yet)
          try {
            const prof = await getDoc(doc(firestoreDb, "userProfiles", user.uid));
            const data = prof.data() as any;
            if (data?.role === "doctor") {
              setIsDoctor(true);
              setIsApproved(false);
              setChecking(false);
              return;
            }
          } catch (err) {}
          
          // Check localStorage as fallback
          const role = getRole();
          if (role === "doctor") {
            setIsDoctor(true);
            setIsApproved(false);
            setChecking(false);
            return;
          }
        }
        
        // Not a doctor, redirect to home
        navigate("/");
        setChecking(false);
      } catch (err) {
        console.error("Error checking doctor status:", err);
        setChecking(false);
        navigate("/");
      }
    };
    checkDoctorRole();
  }, [user, loading, navigate]);

  // Handle redirect for unapproved doctors who need to update info
  useEffect(() => {
    if (checking || loading) return;
    if (!isDoctor || isApproved) return;
    
    // If doctor but not approved and needsInfo, redirect to update-info page
    if (registrationStatus === "needsInfo" && window.location.pathname !== "/doctor/update-info") {
      navigate("/doctor/update-info");
      return;
    }
    
    // If pending or rejected, allow access to /doctor to show status dialog
    // DoctorDashboard will handle showing the appropriate dialog
  }, [isDoctor, isApproved, registrationStatus, checking, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!isDoctor) {
    return null; // Redirect is happening
  }

  // If doctor but not approved, allow access to update-info or doctor dashboard
  // DoctorDashboard will show status dialog based on registration status
  if (!isApproved) {
    // Allow access to update-info page if needsInfo
    if (registrationStatus === "needsInfo" && window.location.pathname === "/doctor/update-info") {
      return <>{children || <DoctorPage />}</>;
    }
    // Allow access to /doctor to show status dialog (pending, rejected, etc.)
    // DoctorDashboard will handle showing the appropriate dialog
    if (window.location.pathname === "/doctor" || window.location.pathname.startsWith("/doctor/")) {
    return <>{children || <DoctorPage />}</>;
    }
  }

  return <>{children || <DoctorPage />}</>;
}

function ProtectedPatientWithAssessment({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    const checkAssessment = async () => {
      if (loading) return;
      if (!user) {
        navigate("/login");
        return;
      }
      const role = getRole();
      if (role !== "patient") {
        navigate("/doctor");
        return;
      }
      // Find patient record
      try {
        const patientsSnap = await getDocs(query(collection(firestoreDb, "patients"), where("uid", "==", user.uid)));
        if (patientsSnap.empty) {
          // No patient record, redirect to risk assessment (should create patient record during signup, but just in case)
          navigate("/risk-assessment");
          return;
        }
        const patientData = patientsSnap.docs[0];
        setPatientId(patientData.id);
        // Check if patient has completed at least one assessment
        const assessmentsSnap = await getDocs(query(collection(firestoreDb, "assessments"), where("patientId", "==", patientData.id)));
        if (assessmentsSnap.empty) {
          // No assessment found, redirect to risk assessment
          navigate("/risk-assessment");
          return;
        }
        setHasAssessment(true);
      } catch (error) {
        console.error("Error checking assessment:", error);
        // On error, redirect to risk assessment to be safe
        navigate("/risk-assessment");
      } finally {
        setChecking(false);
      }
    };
    checkAssessment();
  }, [user, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحقق من التقييم...</p>
        </div>
      </div>
    );
  }

  if (!hasAssessment) {
    return null; // Redirect is happening
  }

  return <>{children}</>;
}

function ProtectedPatientPage({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  if (loading) return null;
  if (!user) {
    navigate("/login");
    return null;
  }
  const role = getRole();
  if (role !== "patient") {
    navigate("/doctor");
    return null;
  }
  return (
    <ProtectedPatientWithAssessment>
      {children}
    </ProtectedPatientWithAssessment>
  );
}

function ProtectedPatient() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  if (loading) return null;
  if (!user) {
    navigate("/login");
    return null;
  }
  const role = getRole();
  if (role !== "patient") {
    navigate("/doctor");
    return null;
  }
  return (
    <ProtectedPatientWithAssessment>
      <PatientLayout>
        <PatientProfile />
      </PatientLayout>
    </ProtectedPatientWithAssessment>
  );
}

function ProtectedAdmin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (loading) return;
      if (!user) {
        navigate("/admin/login");
        return;
      }
      // Check role from Firestore userProfiles
      try {
        const prof = await getDoc(doc(firestoreDb, "userProfiles", user.uid));
        const data = prof.data() as any;
        if (data?.role === "admin") {
          setIsAdmin(true);
          setChecking(false);
          return;
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
      }
      // Also check localStorage as fallback
      const role = getRole();
      if (role === "admin") {
        setIsAdmin(true);
        setChecking(false);
        return;
      }
      // Not an admin, redirect to admin login
      navigate("/admin/login");
      setChecking(false);
    };
    checkAdminRole();
  }, [user, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحقق من صلاحيات الإدارة...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Redirect is happening
  }

  return <AdminPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
