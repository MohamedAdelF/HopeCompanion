import { PatientAppointments } from "@/components/PatientAppointments";

export default function AppointmentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 py-8 px-4 sm:px-6 lg:px-8">
      <PatientAppointments />
    </div>
  );
}

