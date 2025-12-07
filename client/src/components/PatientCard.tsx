import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Pill, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { firestoreDb, doc, writeBatch, collection, getDocs, query, where, addDoc, updateDoc } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { medicationPresets, getPresetByValue } from "@/lib/medicationPresets";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/AuthProvider";

interface PatientCardProps {
  id: string;
  name: string;
  age: number;
  status: "متابعة" | "علاج" | "استشارة";
  nextAppointment: string;
  avatar?: string;
  riskLevel?: "منخفض" | "متوسط" | "مرتفع";
  priority?: "منخفض" | "متوسط" | "مرتفع";
}

export function PatientCard({ id, name, age, status, nextAppointment, avatar, riskLevel, priority }: PatientCardProps) {
  const statusColors = {
    "متابعة": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "علاج": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "استشارة": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };
  const riskColors: Record<string, string> = {
    "منخفض": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    "متوسط": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    "مرتفع": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const priorityColors: Record<string, string> = riskColors;
  const { user } = useAuth();
  const [openAppt, setOpenAppt] = useState(false);
  const [apptDate, setApptDate] = useState("");
  const [apptNote, setApptNote] = useState("");
  const [apptType, setApptType] = useState("consultation");
  const [openMedication, setOpenMedication] = useState(false);
  const [medForm, setMedForm] = useState({
    name: "",
    dosage: "",
    frequency: "once_daily",
    startDate: "",
    endDate: "",
    times: [] as string[],
    reminder: true,
  });

  return (
    <Card className="hover-elevate shadow-md hover:shadow-lg transition-all" data-testid={`card-patient-${name}`}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold truncate">{name}</CardTitle>
            <p className="text-sm text-muted-foreground font-body mt-1">{age} سنة</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${statusColors[status]} text-xs`} data-testid={`badge-status-${status}`}>
          {status}
        </Badge>
          {riskLevel && (
            <Badge className={`${riskColors[riskLevel] ?? ""} text-xs`}>{riskLevel}</Badge>
          )}
          {priority && (
            <Badge variant="outline" className={`${priorityColors[priority] ?? ""} text-xs`}>
              أولوية: {priority}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
          <Calendar className="h-4 w-4" />
          <span>الموعد القادم: {nextAppointment}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/doctor/patient/${id}`}>
            <div className="flex-1 min-w-[120px] cursor-pointer">
              <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2" data-testid={`button-view-file-${name}`}>
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>الملف الطبي</span>
          </Button>
            </div>
          </Link>
          <Dialog open={openAppt} onOpenChange={setOpenAppt}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Calendar className="h-4 w-4" />
                موعد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">إضافة موعد جديد</DialogTitle>
                <DialogDescription>
                  سيتم إشعار المريضة بالموعد تلقائياً
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="appt-date">تاريخ ووقت الموعد *</Label>
                  <Input 
                    id="appt-date"
                    type="datetime-local" 
                    value={apptDate} 
                    onChange={(e) => setApptDate(e.target.value)} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appt-type">نوع الموعد</Label>
                  <Select value={apptType} onValueChange={setApptType}>
                    <SelectTrigger id="appt-type">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">استشارة</SelectItem>
                      <SelectItem value="followup">متابعة</SelectItem>
                      <SelectItem value="medication_review">مراجعة دواء</SelectItem>
                      <SelectItem value="examination">فحص</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appt-note">ملاحظات (اختياري)</Label>
                  <Textarea 
                    id="appt-note"
                    placeholder="مثال: مراجعة نتائج الفحوصات، متابعة العلاج..." 
                    value={apptNote} 
                    onChange={(e) => setApptNote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setOpenAppt(false);
                  setApptDate('');
                  setApptNote('');
                  setApptType('consultation');
                }}>
                  إلغاء
                </Button>
                <Button onClick={async () => {
                  if (!apptDate) return;
                  try {
                    // إضافة الموعد
                    await addDoc(collection(firestoreDb, 'appointments'), { 
                      patientId: id, 
                      doctorUid: user?.uid || null, 
                      at: new Date(apptDate).toISOString(), 
                      note: apptNote,
                      type: apptType,
                      reminder: true,
                      status: "upcoming",
                      createdAt: new Date().toISOString(),
                      createdBy: "doctor" // علامة أن الموعد من الطبيب
                    });
                    // تحديث nextAppointment للمريض
                    await updateDoc(doc(firestoreDb, 'patients', id), { nextAppointment: apptDate.slice(0,10) });
                    // إضافة تنبيه للمريض
                    await addDoc(collection(firestoreDb, 'alerts'), {
                      patientId: id,
                      type: "appointment",
                      message: `تم حجز موعد جديد: ${new Date(apptDate).toLocaleDateString('ar-EG')} - ${apptType === 'consultation' ? 'استشارة' : apptType === 'followup' ? 'متابعة' : apptType === 'medication_review' ? 'مراجعة دواء' : apptType === 'examination' ? 'فحص' : 'أخرى'}`,
                      status: "open",
                      createdAt: new Date().toISOString(),
                    });
                    
                    // Send WhatsApp notification
                    try {
                      const { notifyAppointmentBooked } = await import("@/lib/notifications");
                      await notifyAppointmentBooked(
                        id,
                        user?.uid || null,
                        new Date(apptDate),
                        apptType,
                        "doctor"
                      );
                    } catch (error) {
                      console.error("Error sending notification:", error);
                      // Don't show error to user - notification is optional
                    }
                    
                    setOpenAppt(false);
                    setApptDate('');
                    setApptNote('');
                    setApptType('consultation');
                  } catch (error) {
                    console.error("Error adding appointment:", error);
                    alert("حدث خطأ أثناء إضافة الموعد. يرجى المحاولة مرة أخرى.");
                  }
                }} className="bg-gradient-to-r from-primary to-primary/90">
                  حفظ الموعد
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={openMedication} onOpenChange={setOpenMedication}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Pill className="h-4 w-4" />
                دواء
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">إضافة دواء جديد</DialogTitle>
                <DialogDescription>
                  سيتم إشعار المريضة بالدواء الجديد
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="med-name">اسم الدواء *</Label>
                  <Input 
                    id="med-name"
                    placeholder="مثال: باراسيتامول" 
                    value={medForm.name} 
                    onChange={(e) => setMedForm({...medForm, name: e.target.value})} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="med-dosage">الجرعة</Label>
                  <Input 
                    id="med-dosage"
                    placeholder="مثال: 500 مجم" 
                    value={medForm.dosage} 
                    onChange={(e) => setMedForm({...medForm, dosage: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="med-frequency">التكرار</Label>
                  <Select 
                    value={medForm.frequency} 
                    onValueChange={(value) => {
                      const preset = getPresetByValue(value);
                      setMedForm({
                        ...medForm, 
                        frequency: value, 
                        times: preset ? [...preset.defaultTimes] : []
                      });
                    }}
                  >
                    <SelectTrigger id="med-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {medicationPresets.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          <div>
                            <div className="font-medium">{preset.label}</div>
                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {medForm.frequency && medForm.frequency !== "as_needed" && medForm.times.length > 0 && (
                  <div className="space-y-2">
                    <Label>أوقات التناول *</Label>
                    <div className="space-y-2">
                      {medForm.times.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...medForm.times];
                              newTimes[index] = e.target.value;
                              setMedForm({ ...medForm, times: newTimes });
                            }}
                            className="flex-1"
                            required
                          />
                          {medForm.times.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newTimes = medForm.times.filter((_, i) => i !== index);
                                setMedForm({ ...medForm, times: newTimes });
                              }}
                              className="h-10 w-10 text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMedForm({ ...medForm, times: [...medForm.times, "09:00"] });
                        }}
                        className="w-full gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        إضافة وقت آخر
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="med-start">تاريخ البدء *</Label>
                  <Input 
                    id="med-start"
                    type="date" 
                    value={medForm.startDate} 
                    onChange={(e) => setMedForm({...medForm, startDate: e.target.value})} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="med-end">تاريخ الانتهاء (اختياري)</Label>
                  <Input 
                    id="med-end"
                    type="date" 
                    value={medForm.endDate} 
                    onChange={(e) => setMedForm({...medForm, endDate: e.target.value})} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setOpenMedication(false);
                  setMedForm({ name: "", dosage: "", frequency: "daily", startDate: "", endDate: "", times: [], reminder: true });
                }}>
                  إلغاء
                </Button>
                <Button onClick={async () => {
                  if (!medForm.name || !medForm.startDate) return;
                  if (medForm.frequency !== "as_needed" && (!medForm.times || medForm.times.length === 0)) {
                    alert("يرجى تحديد أوقات التناول للدواء.");
                    return;
                  }
                  try {
                    // إضافة الدواء
                    await addDoc(collection(firestoreDb, 'medications'), {
                      patientId: id,
                      name: medForm.name,
                      dosage: medForm.dosage,
                      frequency: medForm.frequency,
                      startDate: medForm.startDate,
                      endDate: medForm.endDate || null,
                      times: medForm.times || [],
                      reminder: medForm.reminder,
                      createdAt: new Date().toISOString(),
                      createdBy: "doctor" // علامة أن الدواء من الطبيب
                    });
                    
                    // إضافة تنبيه للمريض (في النظام)
                    await addDoc(collection(firestoreDb, 'alerts'), {
                      patientId: id,
                      type: "medication",
                      message: `تم إضافة دواء جديد: ${medForm.name}${medForm.dosage ? ` (${medForm.dosage})` : ''} - ابدأ من ${new Date(medForm.startDate).toLocaleDateString('ar-EG')}`,
                      status: "open",
                      createdAt: new Date().toISOString(),
                    });
                    
                    // إرسال تنبيه WhatsApp للمريضة
                    try {
                      const { notifyMedicationAdded } = await import("@/lib/notifications");
                      await notifyMedicationAdded(
                        id,
                        medForm.name,
                        medForm.dosage || "",
                        medForm.times,
                        medForm.startDate
                      );
                    } catch (error) {
                      console.error("Error sending medication notification:", error);
                      // Don't show error to user - notification is optional
                    }
                    setOpenMedication(false);
                    setMedForm({ name: "", dosage: "", frequency: "daily", startDate: "", endDate: "", times: [], reminder: true });
                  } catch (error) {
                    console.error("Error adding medication:", error);
                    alert("حدث خطأ أثناء إضافة الدواء. يرجى المحاولة مرة أخرى.");
                  }
                }} className="bg-gradient-to-r from-primary to-primary/90">
                  حفظ الدواء
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {user && (
            <Button variant="outline" size="sm" onClick={async () => { await updateDoc(doc(firestoreDb, 'patients', id), { assignedDoctor: user.uid }); }}>تولّي</Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">حذف</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد حذف المريضة</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف المريضة وكل سجلاتها (اليوميات، التنبيهات، التقييمات).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  const batch = writeBatch(firestoreDb);
                  const diarySnap = await getDocs(query(collection(firestoreDb, "diary"), where("patientId", "==", id)));
                  diarySnap.forEach(d => batch.delete(doc(firestoreDb, "diary", d.id)));
                  const alertSnap = await getDocs(query(collection(firestoreDb, "alerts"), where("patientId", "==", id)));
                  alertSnap.forEach(d => batch.delete(doc(firestoreDb, "alerts", d.id)));
                  const assessSnap = await getDocs(query(collection(firestoreDb, "assessments"), where("patientId", "==", id)));
                  assessSnap.forEach(d => batch.delete(doc(firestoreDb, "assessments", d.id)));
                  batch.delete(doc(firestoreDb, "patients", id));
                  await batch.commit();
                }}>تأكيد</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
