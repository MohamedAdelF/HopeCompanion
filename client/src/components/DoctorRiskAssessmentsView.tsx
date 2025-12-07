import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { firestoreDb, collection, onSnapshot, query, where, orderBy, getDocs, doc, getDoc } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Search, TrendingUp, Users, AlertTriangle, CheckCircle2, Calendar, FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Assessment {
  id: string;
  patientId: string;
  patientName?: string;
  score: number;
  level: "منخفض" | "متوسط" | "مرتفع";
  createdAt: string;
  answers?: Record<string, string>;
}

export function DoctorRiskAssessmentsView() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [patients, setPatients] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    // Fetch all assessments
    const unsub = onSnapshot(
      query(collection(firestoreDb, "assessments"), orderBy("createdAt", "desc")),
      async (snap) => {
        const assessmentsData = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        // Fetch patient names
        const patientIds = [...new Set(assessmentsData.map((a: any) => a.patientId))];
        const patientsMap: Record<string, any> = {};

        for (const patientId of patientIds) {
          try {
            const patientDoc = await getDoc(doc(firestoreDb, "patients", patientId));
            if (patientDoc.exists()) {
              const patientData = patientDoc.data();
              patientsMap[patientId] = patientData;
              assessmentsData.forEach((assessment: any) => {
                if (assessment.patientId === patientId) {
                  assessment.patientName = patientData.name || "مريضة مجهولة";
                }
              });
            }
          } catch (error) {
            console.error(`Error fetching patient ${patientId}:`, error);
          }
        }

        setPatients(patientsMap);
        setAssessments(assessmentsData as Assessment[]);
      }
    );

    return () => unsub();
  }, []);

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch =
      !searchQuery ||
      assessment.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.patientId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterLevel === "all" || assessment.level === filterLevel;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: assessments.length,
    low: assessments.filter((a) => a.level === "منخفض").length,
    medium: assessments.filter((a) => a.level === "متوسط").length,
    high: assessments.filter((a) => a.level === "مرتفع").length,
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "منخفض":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "متوسط":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "مرتفع":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setDetailsOpen(true);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              تقييمات المخاطر
            </h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة جميع تقييمات المخاطر للمرضى
            </p>
          </div>
        </div>
        <Link href="/doctor">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            العودة للوحة التحكم
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">إجمالي التقييمات</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 hover:border-emerald-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">منخفض</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.low}</p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 hover:border-amber-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">متوسط</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.medium}</p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-2 hover:border-red-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">مرتفع</p>
                  <p className="text-3xl font-bold text-red-600">{stats.high}</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والفلترة</CardTitle>
          <CardDescription>
            ابحثي عن تقييمات محددة أو فلّتري حسب مستوى الخطر
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحثي عن مريضة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="مستوى الخطر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                <SelectItem value="منخفض">منخفض</SelectItem>
                <SelectItem value="متوسط">متوسط</SelectItem>
                <SelectItem value="مرتفع">مرتفع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة التقييمات</CardTitle>
          <CardDescription>
            {filteredAssessments.length} تقييم {filterLevel !== "all" && `بمستوى ${filterLevel}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">لا توجد تقييمات مطابقة للبحث</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredAssessments.map((assessment, index) => (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: -4 }}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/50"
                      onClick={() => handleViewDetails(assessment)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Link href={`/doctor/patient/${assessment.patientId}`} onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" className="gap-2">
                                <FileText className="h-4 w-4 flex-shrink-0" />
                                <span>الملف الطبي</span>
                              </Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(assessment);
                            }}>
                              <span>التفاصيل</span>
                            </Button>
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-3 mb-2 justify-end">
                              <h3 className="font-semibold text-lg">{assessment.patientName || "مريضة مجهولة"}</h3>
                              <Badge className={getLevelColor(assessment.level)}>
                                {assessment.level}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground justify-end">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(assessment.createdAt).toLocaleDateString("ar-EG", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                <span>الدرجة: {assessment.score}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>تفاصيل التقييم</DialogTitle>
            <DialogDescription>
              معلومات كاملة عن تقييم المخاطر
            </DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">اسم المريضة</p>
                    <p className="font-semibold">{selectedAssessment.patientName || "مريضة مجهولة"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">مستوى الخطر</p>
                    <Badge className={getLevelColor(selectedAssessment.level)}>
                      {selectedAssessment.level}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الدرجة</p>
                    <p className="font-semibold">{selectedAssessment.score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">تاريخ التقييم</p>
                    <p className="font-semibold">
                      {new Date(selectedAssessment.createdAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {selectedAssessment.answers && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">الإجابات</p>
                    <div className="space-y-2">
                      {Object.entries(selectedAssessment.answers).map(([key, value]) => (
                        <div key={key} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium">{key}</p>
                          <p className="text-sm text-muted-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

