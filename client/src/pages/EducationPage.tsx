import { EducationalContent } from "@/components/EducationalContent";
import { DoctorEducationalContent } from "@/components/DoctorEducationalContent";
import { useAuth } from "@/components/AuthProvider";
import { getRole } from "@/lib/authRole";

export default function EducationPage() {
  const { user } = useAuth();
  const role = getRole();
  const isDoctor = role === "doctor" && user;

  if (isDoctor) {
    return <DoctorEducationalContent />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 py-8 px-4 sm:px-6 lg:px-8">
      <EducationalContent />
    </div>
  );
}
