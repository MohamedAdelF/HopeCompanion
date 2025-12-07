import { RiskAssessment } from "@/components/RiskAssessment";
import { DoctorRiskAssessmentsView } from "@/components/DoctorRiskAssessmentsView";
import { useAuth } from "@/components/AuthProvider";
import { getRole } from "@/lib/authRole";

export default function RiskAssessmentPage() {
  const { user } = useAuth();
  const role = getRole();
  const isDoctor = role === "doctor" && user;

  if (isDoctor) {
    return <DoctorRiskAssessmentsView />;
  }

  return (
    <div className="py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
          تقييم المخاطر الشخصي
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground font-body px-2">
          أجيبي على بعض الأسئلة البسيطة للحصول على تقييم شخصي لمستوى الخطر لديك
        </p>
      </div>
      <RiskAssessment />
    </div>
  );
}
