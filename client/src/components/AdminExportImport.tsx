import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Upload, 
  FileText, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  FileSpreadsheet,
  FileJson,
  Eye,
  X,
  Info,
  Package,
  Save,
  Archive
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { 
  collection, 
  firestoreDb, 
  writeBatch, 
  addDoc, 
  setDoc, 
  doc,
  query,
  where,
  getDocs
} from "@/lib/firebase";

interface ExportImportProps {
  patients: any[];
  doctors: any[];
  diaryEntries: any[];
  assessments: any[];
  messages: any[];
  appointments: any[];
  alerts: any[];
  admins: any[];
}

type ExportFormat = "json" | "csv" | "csv-separate";
type ExportType = "all" | "patients" | "doctors" | "diary" | "assessments" | "messages" | "appointments" | "alerts";

export function AdminExportImport({
  patients,
  doctors,
  diaryEntries,
  assessments,
  messages,
  appointments,
  alerts,
  admins,
}: ExportImportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<ExportType>("all");
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportProgress(0);
    setExportStatus("");

    try {
      setExportStatus("جاري تحضير البيانات...");
      setExportProgress(10);

      let dataToExport: any = {};
      let fileName = "";

      if (selectedExportType === "all") {
        dataToExport = {
          exportDate: new Date().toISOString(),
          exportVersion: "2.0",
          patients,
          doctors,
          diaryEntries,
          assessments,
          messages,
          appointments,
          alerts,
          admins,
          stats: {
            totalPatients: patients.length,
            totalDoctors: doctors.length,
            totalDiaryEntries: diaryEntries.length,
            totalAssessments: assessments.length,
            totalMessages: messages.length,
            totalAppointments: appointments.length,
            totalAlerts: alerts.length,
            totalAdmins: admins.length,
          },
        };
        fileName = `pinkhope-full-export-${new Date().toISOString().split("T")[0]}`;
      } else {
        const collections: Record<ExportType, any[]> = {
          all: [],
          patients,
          doctors,
          diary: diaryEntries,
          assessments,
          messages,
          appointments,
          alerts,
        };
        dataToExport = {
          exportDate: new Date().toISOString(),
          exportVersion: "2.0",
          [selectedExportType]: collections[selectedExportType],
          stats: {
            [`total${selectedExportType.charAt(0).toUpperCase() + selectedExportType.slice(1)}`]: collections[selectedExportType].length,
          },
        };
        fileName = `pinkhope-${selectedExportType}-export-${new Date().toISOString().split("T")[0]}`;
      }

      setExportProgress(30);
      setExportStatus("جاري إنشاء الملف...");

      if (format === "json") {
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
          type: "application/json;charset=utf-8" 
        });
        downloadFile(blob, `${fileName}.json`, "application/json");
      } else if (format === "csv") {
        if (selectedExportType === "all") {
          // Single CSV with all data
          const csvContent = generateCSV(dataToExport);
          const blob = new Blob(['\ufeff' + csvContent], { 
            type: "text/csv;charset=utf-8;" 
          });
          downloadFile(blob, `${fileName}.csv`, "text/csv");
        } else {
          const csvContent = convertToCSV(
            dataToExport[selectedExportType] || [], 
            selectedExportType
          );
          const blob = new Blob(['\ufeff' + csvContent], { 
            type: "text/csv;charset=utf-8;" 
          });
          downloadFile(blob, `${fileName}.csv`, "text/csv");
        }
      } else if (format === "csv-separate") {
        setExportStatus("جاري إنشاء ملفات CSV منفصلة...");
        setExportProgress(50);
        
        // Create ZIP-like download of multiple files
        const files: { name: string; content: string }[] = [];
        
        if (patients.length > 0) {
          files.push({ name: "patients.csv", content: convertToCSV(patients, "patients") });
        }
        if (doctors.length > 0) {
          files.push({ name: "doctors.csv", content: convertToCSV(doctors, "doctors") });
        }
        if (diaryEntries.length > 0) {
          files.push({ name: "diary.csv", content: convertToCSV(diaryEntries, "diary") });
        }
        if (assessments.length > 0) {
          files.push({ name: "assessments.csv", content: convertToCSV(assessments, "assessments") });
        }
        if (messages.length > 0) {
          files.push({ name: "messages.csv", content: convertToCSV(messages, "messages") });
        }
        if (appointments.length > 0) {
          files.push({ name: "appointments.csv", content: convertToCSV(appointments, "appointments") });
        }
        if (alerts.length > 0) {
          files.push({ name: "alerts.csv", content: convertToCSV(alerts, "alerts") });
        }

        // Download each file
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const blob = new Blob(['\ufeff' + file.content], { 
            type: "text/csv;charset=utf-8;" 
          });
          downloadFile(blob, file.name, "text/csv");
          setExportProgress(50 + ((i + 1) / files.length) * 40);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setExportProgress(100);
      setExportStatus("تم التصدير بنجاح!");
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setExportStatus("");
        setExportProgress(0);
      }, 5000);
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus("حدث خطأ أثناء التصدير");
      alert("حدث خطأ أثناء التصدير: " + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (blob: Blob, filename: string, mimeType: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const generateCSV = (data: any): string => {
    let csv = "";
    
    // Patients
    if (data.patients && data.patients.length > 0) {
      csv += "=== المرضى ===\n";
      csv += convertToCSV(data.patients, "patients");
      csv += "\n\n";
    }
    
    // Doctors
    if (data.doctors && data.doctors.length > 0) {
      csv += "=== الأطباء ===\n";
      csv += convertToCSV(data.doctors, "doctors");
      csv += "\n\n";
    }
    
    // Assessments
    if (data.assessments && data.assessments.length > 0) {
      csv += "=== التقييمات ===\n";
      csv += convertToCSV(data.assessments, "assessments");
      csv += "\n\n";
    }
    
    // Diary
    if (data.diaryEntries && data.diaryEntries.length > 0) {
      csv += "=== اليوميات ===\n";
      csv += convertToCSV(data.diaryEntries, "diary");
      csv += "\n\n";
    }
    
    // Messages
    if (data.messages && data.messages.length > 0) {
      csv += "=== الرسائل ===\n";
      csv += convertToCSV(data.messages, "messages");
      csv += "\n\n";
    }
    
    // Appointments
    if (data.appointments && data.appointments.length > 0) {
      csv += "=== المواعيد ===\n";
      csv += convertToCSV(data.appointments, "appointments");
      csv += "\n\n";
    }
    
    // Alerts
    if (data.alerts && data.alerts.length > 0) {
      csv += "=== التنبيهات ===\n";
      csv += convertToCSV(data.alerts, "alerts");
    }
    
    return csv;
  };

  const convertToCSV = (data: any[], name: string): string => {
    if (!data || data.length === 0) return "لا توجد بيانات";
    
    // Flatten nested objects and handle arrays
    const flattenObject = (obj: any, prefix = ""): any => {
      const flattened: any = {};
      for (const key in obj) {
        if (obj[key] === null || obj[key] === undefined) {
          flattened[prefix + key] = "";
        } else if (Array.isArray(obj[key])) {
          flattened[prefix + key] = JSON.stringify(obj[key]);
        } else if (typeof obj[key] === "object") {
          Object.assign(flattened, flattenObject(obj[key], prefix + key + "_"));
        } else {
          flattened[prefix + key] = String(obj[key]).replace(/,/g, ";").replace(/\n/g, " ");
        }
      }
      return flattened;
    };

    const flattenedData = data.map(item => flattenObject(item));
    const headers = Object.keys(flattenedData[0]);
    
    const rows = flattenedData.map((item) =>
      headers.map((header) => {
        const value = item[header] || "";
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return value;
      })
    );

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus("جاري قراءة الملف...");
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate data structure
      if (!data.exportVersion) {
        alert("ملف قديم أو غير صالح. يرجى التأكد من صيغة الملف.");
        return;
      }

      setPreviewData(data);
      setShowPreview(true);
    } catch (error) {
      console.error("Import preview error:", error);
      alert("حدث خطأ أثناء قراءة الملف. يرجى التأكد من صيغة الملف.");
    }

    // Reset input
    event.target.value = "";
  };

  const handleImport = async () => {
    if (!previewData) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportStatus("");
    setShowPreview(false);

    try {
      const batchSize = 500; // Firestore batch limit
      let totalImported = 0;
      let totalToImport = 0;

      // Calculate total items
      const collections = [
        { name: "patients", data: previewData.patients || [] },
        { name: "doctors", data: previewData.doctors || [] },
        { name: "diary", data: previewData.diaryEntries || [] },
        { name: "assessments", data: previewData.assessments || [] },
        { name: "messages", data: previewData.messages || [] },
        { name: "appointments", data: previewData.appointments || [] },
        { name: "alerts", data: previewData.alerts || [] },
      ];

      collections.forEach(col => {
        totalToImport += col.data.length;
      });

      if (totalToImport === 0) {
        alert("الملف لا يحتوي على بيانات للاستيراد!");
        setIsImporting(false);
        return;
      }

      // Import each collection
      for (const collection of collections) {
        if (!collection.data || collection.data.length === 0) continue;

        setImportStatus(`جاري استيراد ${collection.name}...`);
        
        // Check for existing documents if merge mode
        const existingDocs = new Set<string>();
        if (importMode === "merge") {
          try {
            // Get all existing documents to check for duplicates
            // Note: In production, you might want to check by specific fields like email or uid
            const existingSnap = await getDocs(collection(firestoreDb, collection.name));
            existingSnap.forEach(doc => {
              const data = doc.data();
              // Check by id if exists, or by other unique fields
              if (data.id) existingDocs.add(data.id);
            });
          } catch (e) {
            console.warn("Could not check existing documents:", e);
            // Continue anyway
          }
        }

        // Process in batches
        for (let i = 0; i < collection.data.length; i += batchSize) {
          const batch = writeBatch(firestoreDb);
          const chunk = collection.data.slice(i, i + batchSize);

          for (const item of chunk) {
            // Remove id and internal fields from data
            const { id: oldId, importedAt, importedFrom, ...itemData } = item;
            
            // Skip if exists in merge mode (by old id)
            if (importMode === "merge" && oldId && existingDocs.has(oldId)) {
              continue;
            }

            // Create new document with Firestore-generated ID
            const docRef = doc(collection(firestoreDb, collection.name));
            batch.set(docRef, {
              ...itemData,
              importedAt: new Date().toISOString(),
              importedFrom: previewData.exportDate || new Date().toISOString(),
            });
          }

          await batch.commit();
          totalImported += chunk.length;
          setImportProgress((totalImported / totalToImport) * 90);
        }
      }

      setImportProgress(100);
      setImportStatus("تم الاستيراد بنجاح!");
      setImportSuccess(true);
      
      setTimeout(() => {
        setImportSuccess(false);
        setImportStatus("");
        setImportProgress(0);
        setPreviewData(null);
      }, 5000);

      // Reload page after 2 seconds to show new data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Import error:", error);
      setImportStatus("حدث خطأ أثناء الاستيراد");
      alert(`حدث خطأ أثناء الاستيراد: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const dataStats = [
    { label: "مرضى", value: patients.length, icon: "👥", color: "text-blue-500" },
    { label: "أطباء", value: doctors.length, icon: "👨‍⚕️", color: "text-green-500" },
    { label: "يوميات", value: diaryEntries.length, icon: "📔", color: "text-purple-500" },
    { label: "تقييمات", value: assessments.length, icon: "🛡️", color: "text-orange-500" },
    { label: "رسائل", value: messages.length, icon: "💬", color: "text-pink-500" },
    { label: "مواعيد", value: appointments.length, icon: "📅", color: "text-indigo-500" },
    { label: "تنبيهات", value: alerts.length, icon: "⚠️", color: "text-red-500" },
    { label: "مدراء", value: admins.length, icon: "👑", color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Export Section */}
      <Card className="border-2 shadow-lg bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <CardTitle className="flex items-center gap-2 text-right">
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
            <span>تصدير البيانات</span>
          </CardTitle>
          <CardDescription className="text-right">
            تصدير جميع بيانات النظام في ملف قابل للنسخ الاحتياطي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Export Type Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block text-right">نوع التصدير:</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: "all" as ExportType, label: "الكل", icon: Package },
                { value: "patients" as ExportType, label: "المرضى", icon: "👥" },
                { value: "doctors" as ExportType, label: "الأطباء", icon: "👨‍⚕️" },
                { value: "diary" as ExportType, label: "اليوميات", icon: "📔" },
                { value: "assessments" as ExportType, label: "التقييمات", icon: "🛡️" },
                { value: "messages" as ExportType, label: "الرسائل", icon: "💬" },
                { value: "appointments" as ExportType, label: "المواعيد", icon: "📅" },
                { value: "alerts" as ExportType, label: "التنبيهات", icon: "⚠️" },
              ].map((type) => (
                <motion.button
                  key={type.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedExportType(type.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    selectedExportType === type.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    {typeof type.icon === "string" ? (
                      <span className="text-lg">{type.icon}</span>
                    ) : (
                      <type.icon className="h-4 w-4" />
                    )}
                    <span>{type.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Export Format Buttons */}
          <div>
            <label className="text-sm font-medium mb-3 block text-right">صيغة التصدير:</label>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleExport("json")}
                disabled={isExporting}
                variant="default"
                className="flex items-center gap-2"
                size="lg"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileJson className="h-4 w-4" />
                )}
                <span>تصدير JSON</span>
              </Button>
              <Button
                onClick={() => handleExport("csv")}
                disabled={isExporting}
                variant="outline"
                className="flex items-center gap-2"
                size="lg"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span>تصدير CSV</span>
              </Button>
              <Button
                onClick={() => handleExport("csv-separate")}
                disabled={isExporting}
                variant="outline"
                className="flex items-center gap-2"
                size="lg"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                <span>CSV منفصل</span>
              </Button>
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{exportStatus}</span>
                <span className="font-medium">{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}

          {/* Export Success */}
          <AnimatePresence>
            {exportSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700 dark:text-green-300">تم التصدير بنجاح!</AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    تم حفظ الملف في مجلد التحميلات
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="border-2 shadow-lg bg-gradient-to-br from-background via-background to-blue-500/5">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-b">
          <CardTitle className="flex items-center gap-2 text-right">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Upload className="h-5 w-5 text-blue-500 flex-shrink-0" />
            </div>
            <span>استيراد البيانات</span>
          </CardTitle>
          <CardDescription className="text-right">
            استيراد بيانات من ملف JSON محفوظ مسبقاً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Import Mode Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block text-right">وضع الاستيراد:</label>
            <div className="flex gap-3">
              <Button
                variant={importMode === "merge" ? "default" : "outline"}
                onClick={() => setImportMode("merge")}
                className="flex-1"
              >
                <Package className="h-4 w-4 mr-2" />
                دمج مع البيانات الموجودة
              </Button>
              <Button
                variant={importMode === "replace" ? "default" : "outline"}
                onClick={() => setImportMode("replace")}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                استبدال البيانات
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="import-file"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("import-file")?.click()}
              disabled={isImporting}
              className="w-full"
              size="lg"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              <span>اختر ملف JSON للاستيراد</span>
            </Button>
          </div>

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{importStatus}</span>
                <span className="font-medium">{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          {/* Import Success */}
          <AnimatePresence>
            {importSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700 dark:text-green-300">تم الاستيراد بنجاح!</AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    جاري تحديث الصفحة لعرض البيانات الجديدة...
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs">
              <strong>ملاحظة:</strong> في وضع الدمج، سيتم تخطي السجلات الموجودة. في وضع الاستبدال، سيتم إنشاء سجلات جديدة فقط (لا يتم حذف البيانات الموجودة).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-b">
          <CardTitle className="flex items-center gap-2 text-right">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Database className="h-5 w-5 text-purple-500 flex-shrink-0" />
            </div>
            <span>ملخص البيانات المتاحة</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dataStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border-2 rounded-xl hover:border-primary/50 hover:shadow-md transition-all bg-gradient-to-br from-background to-muted/30"
              >
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-xl">{stat.icon}</span>
                  <span>{stat.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة البيانات قبل الاستيراد
            </DialogTitle>
            <DialogDescription>
              راجع البيانات أدناه قبل تأكيد الاستيراد
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-4">
              {previewData && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">{previewData.patients?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">مريض</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">{previewData.doctors?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">طبيب</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">{previewData.diaryEntries?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">يومية</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">{previewData.assessments?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">تقييم</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">{previewData.messages?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">رسالة</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">{previewData.appointments?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">موعد</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">{previewData.alerts?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">تنبيه</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>تاريخ التصدير: {previewData.exportDate ? new Date(previewData.exportDate).toLocaleString("ar-SA") : "غير محدد"}</p>
                    <p>إصدار التصدير: {previewData.exportVersion || "قديم"}</p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-3 justify-start mt-4">
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  تأكيد الاستيراد
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
