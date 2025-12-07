import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, TrendingUp, AlertTriangle, Users, MessageSquare, Loader2, Zap, BarChart3, Target, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";

// Format AI response for better display
function formatAIResponse(text: string): string {
  if (!text) return "";
  
  // Escape HTML to prevent XSS
  const escapeHtml = (str: string) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };
  
  // First, escape the text
  let formatted = escapeHtml(text);
  
  // Convert numbered lists (1. 2. 3.) - Arabic numbers too
  formatted = formatted.replace(/^(\d+)[\.\u066B]\s+(.+)$/gm, '<li class="mb-2 pr-6">$2</li>');
  
  // Convert bullet points (- • * -)
  formatted = formatted.replace(/^[-•*ـ]\s+(.+)$/gm, '<li class="mb-2 pr-6 before:content-[\'•\'] before:mr-2">$1</li>');
  
  // Convert bold text (**text**)
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
  
  // Convert headings (# ## ###)
  formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-3 text-foreground border-b border-primary/20 pb-2">$1</h3>');
  formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-4 text-foreground border-b border-primary/30 pb-2">$1</h2>');
  formatted = formatted.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-foreground border-b-2 border-primary/40 pb-3">$1</h1>');
  
  // Split by double newlines to create paragraphs
  const paragraphs = formatted.split(/\n\s*\n/);
  
  const result = paragraphs.map(para => {
    const trimmed = para.trim();
    if (!trimmed) return '';
    
    // If paragraph contains list items, wrap in ul
    if (trimmed.includes('<li')) {
      return `<ul class="space-y-2 mb-4 list-none pr-6">${trimmed}</ul>`;
    }
    
    // Check if it's already a heading
    if (trimmed.startsWith('<h')) {
      return trimmed;
    }
    
    // Regular paragraph
    return `<p class="mb-4 leading-relaxed text-foreground/90">${trimmed}</p>`;
  }).filter(p => p).join('');
  
  return result;
}

interface AISuggestion {
  type: "insight" | "warning" | "recommendation";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface AdminAIProps {
  stats: {
    totalPatients: number;
    totalDoctors: number;
    totalDiaryEntries: number;
    totalAssessments: number;
    totalMessages: number;
    totalAppointments: number;
    totalAlerts: number;
    activeAlerts: number;
  };
  patients: any[];
  assessments: any[];
  alerts: any[];
}

export function AdminAI({ stats, patients, assessments, alerts }: AdminAIProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [aiSource, setAiSource] = useState<"openai" | "anthropic" | "gemini" | "fallback" | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Quick prompt suggestions
  const quickPrompts = [
    { text: "ما هو تحليل شامل للمرضى عاليي المخاطر؟", icon: AlertTriangle },
    { text: "كيف يمكن تحسين تجربة المستخدمين؟", icon: TrendingUp },
    { text: "ما هي الاتجاهات في التقييمات الأخيرة؟", icon: BarChart3 },
    { text: "ما هي التوصيات لتحسين النظام؟", icon: Target },
    { text: "تحليل شامل لجميع البيانات والإحصائيات", icon: Brain },
  ];

  // Generate AI suggestions based on data using real AI
  useEffect(() => {
    const generateAISuggestions = async () => {
      // Quick rule-based suggestions as fallback
      const quickSuggestions: AISuggestion[] = [];

    // High risk patients analysis
    const highRiskPatients = patients.filter((p: any) => p.riskLevel === "مرتفع");
    if (highRiskPatients.length > 0) {
        quickSuggestions.push({
        type: "warning",
        title: "مرضى عاليو المخاطر",
        description: `لديك ${highRiskPatients.length} مريض(ة) بمستوى مخاطر مرتفع. يُنصح بمتابعة حالة خاصة معهم.`,
        priority: "high",
      });
    }

    // Active alerts analysis
    if (stats.activeAlerts > 0) {
        quickSuggestions.push({
        type: "warning",
        title: "تنبيهات نشطة",
        description: `يوجد ${stats.activeAlerts} تنبيه نشط يحتاج إلى متابعة فورية.`,
        priority: stats.activeAlerts > 5 ? "high" : "medium",
      });
    }

      // Show quick suggestions immediately
      setSuggestions(quickSuggestions);

      // Try to get AI-powered suggestions
      if (!auth.currentUser) {
        return; // Can't use AI without auth
      }

      try {
        setSuggestionsLoading(true);
        const token = await auth.currentUser.getIdToken();
        
        // Create a concise summary instead of sending all data
        const highRiskCount = patients.filter((p: any) => p.riskLevel === "مرتفع").length;
        const mediumRiskCount = patients.filter((p: any) => p.riskLevel === "متوسط").length;
        const lowRiskCount = patients.filter((p: any) => p.riskLevel === "منخفض").length;
        
    const recentAssessments = assessments.filter((a: any) => {
      if (!a.createdAt) return false;
      const date = new Date(a.createdAt);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return date >= monthAgo;
    });
        const avgScore = recentAssessments.length > 0 
          ? recentAssessments.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / recentAssessments.length 
          : 0;
        
        const activeAlertsCount = alerts.filter((a: any) => a.status === "open" || a.status === "pending").length;
        const resolvedAlertsCount = alerts.filter((a: any) => a.status === "resolved" || a.status === "closed").length;
        
        const doctorPatientRatio = stats.totalDoctors > 0 ? (stats.totalPatients / stats.totalDoctors).toFixed(1) : 0;

        const context = {
          stats: {
            totalPatients: stats.totalPatients,
            totalDoctors: stats.totalDoctors,
            totalAssessments: stats.totalAssessments,
            totalAlerts: stats.totalAlerts,
            activeAlerts: stats.activeAlerts,
            totalAppointments: stats.totalAppointments,
            totalMessages: stats.totalMessages,
          },
          summary: {
            patientsByRisk: {
              high: highRiskCount,
              medium: mediumRiskCount,
              low: lowRiskCount,
            },
            recentAssessments: {
              count: recentAssessments.length,
              averageScore: avgScore.toFixed(1),
            },
            alerts: {
              active: activeAlertsCount,
              resolved: resolvedAlertsCount,
            },
            doctorPatientRatio: doctorPatientRatio,
          },
        };

        const response = await fetch("/api/admin/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            message: `بناءً على الإحصائيات الموجزة التالية، قدم 3-5 اقتراحات ذكية وعملية فقط. ركز على النقاط المهمة والمشاكل الواضحة.

استجب بتنسيق JSON فقط (بدون أي نص إضافي):
[
  {
    "type": "warning" | "insight" | "recommendation",
    "title": "عنوان مختصر",
    "description": "وصف مختصر (سطر واحد)",
    "priority": "high" | "medium" | "low"
  }
]`,
            context,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiReply = data.reply || "";
          
          // Try to parse JSON from AI response
          try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = aiReply.match(/```json\s*([\s\S]*?)\s*```/) || aiReply.match(/```\s*([\s\S]*?)\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : aiReply;
            const parsed = JSON.parse(jsonStr.trim());
            
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Merge AI suggestions with quick suggestions
              setSuggestions([...quickSuggestions, ...parsed]);
              return;
            }
          } catch (parseError) {
            // If JSON parsing fails, use quick suggestions
            console.log("Could not parse AI suggestions as JSON, using quick suggestions");
          }
        }
      } catch (error) {
        console.error("Error generating AI suggestions:", error);
        // Keep quick suggestions on error
      } finally {
        setSuggestionsLoading(false);
      }
    };

    generateAISuggestions();
  }, [stats, patients, assessments, alerts]);

  const handleAIAnalysis = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiPrompt.trim();
    if (!promptToUse) {
      alert("يرجى إدخال سؤال أو طلب");
      return;
    }

    // If custom prompt (from quick suggestions), set it in the input field first
    if (customPrompt) {
      setAiPrompt(customPrompt);
    }

    setIsLoading(true);
    setAiResponse(null);
    setAiSource(null);
    setLastPrompt(promptToUse);

    try {
      // Prepare comprehensive context
      const context = {
        stats,
        patients: patients.map((p: any) => ({
          id: p.id,
          riskLevel: p.riskLevel,
          age: p.age,
          assignedDoctor: p.assignedDoctor,
        })),
        assessments: assessments.map((a: any) => ({
          id: a.id,
          score: a.score,
          level: a.level,
          patientId: a.patientId,
          createdAt: a.createdAt,
        })),
        alerts: alerts.map((a: any) => ({
          id: a.id,
          type: a.type,
          status: a.status,
          patientId: a.patientId,
          createdAt: a.createdAt,
        })),
      };

      // Get authentication token
      if (!auth.currentUser) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }
      
      const token = await auth.currentUser.getIdToken();

      // Call the Admin AI API
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          message: promptToUse,
          context,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.reply);
        setAiSource(data.source || "fallback");
      } else {
        const errorText = await response.text();
        throw new Error(errorText || "فشل في الحصول على رد");
      }
    } catch (error: any) {
      console.error("AI Analysis error:", error);
      setAiResponse("حدث خطأ أثناء التحليل. يرجى التأكد من إعداد API Keys (OpenAI أو Anthropic) أو المحاولة مرة أخرى.");
      setAiSource("fallback");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* AI Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-primary/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              اقتراحات الذكاء الاصطناعي
            </CardTitle>
            <CardDescription>
              تحليل تلقائي للبيانات واقتراحات ذكية بناءً على البيانات الفعلية
              {suggestionsLoading && (
                <span className="mr-2 text-xs text-muted-foreground">
                  <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                  جاري تحليل البيانات بالذكاء الاصطناعي...
                </span>
              )}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Alert
                  className={
                    suggestion.type === "warning"
                      ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                      : suggestion.type === "recommendation"
                      ? "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                      : "border-green-200 bg-green-50 dark:bg-green-950/20"
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {suggestion.type === "warning" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {suggestion.type === "recommendation" && <TrendingUp className="h-4 w-4 text-blue-500" />}
                        {suggestion.type === "insight" && <Sparkles className="h-4 w-4 text-green-500" />}
                        <span className="font-semibold">{suggestion.title}</span>
                        <Badge
                          variant={
                            suggestion.priority === "high"
                              ? "destructive"
                              : suggestion.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {suggestion.priority === "high" ? "عالية" : suggestion.priority === "medium" ? "متوسطة" : "منخفضة"}
                        </Badge>
                      </div>
                      <AlertDescription>{suggestion.description}</AlertDescription>
                    </div>
                  </div>
                </Alert>
              </motion.div>
            ))}
            {suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد اقتراحات حالياً
              </p>
            )}
          </div>
        </CardContent>
        </Card>
      </motion.div>

      {/* Quick Prompts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              اقتراحات سريعة
            </CardTitle>
            <CardDescription>انقر على أي اقتراح لبدء التحليل فوراً</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickPrompts.map((quickPrompt, index) => {
                const IconComponent = quickPrompt.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-auto p-4 justify-start gap-3 hover:bg-primary/5 hover:border-primary/50 transition-all"
                      onClick={() => handleAIAnalysis(quickPrompt.text)}
                      disabled={isLoading}
                    >
                      <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-right flex-1">{quickPrompt.text}</span>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Chat */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Sparkles className="h-5 w-5 text-emerald-500" />
              </div>
              مساعد الذكاء الاصطناعي المتقدم
            </CardTitle>
            <CardDescription>اسأل عن أي شيء متعلق بالبيانات والإحصائيات - يستخدم AI حقيقي للتحليل المتقدم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder="مثال: ما هو تحليل شامل للمرضى عاليي المخاطر؟ أو كيف يمكن تحسين النظام بناءً على البيانات المتاحة؟"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !isLoading) {
                    handleAIAnalysis();
                  }
                }}
                className="min-h-[120px] pr-12"
                disabled={isLoading}
              />
              <div className="absolute bottom-3 left-3 text-xs text-muted-foreground">
                Ctrl+Enter لإرسال
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handleAIAnalysis()} 
                disabled={isLoading || !aiPrompt.trim()} 
                className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-5 w-5" />
                    تحليل البيانات المتقدم
                  </>
                )}
              </Button>
              {lastPrompt && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleAIAnalysis(lastPrompt)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة
                </Button>
              )}
            </div>

            <AnimatePresence>
              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-br from-background via-muted/30 to-background rounded-xl border-2 border-primary/20 shadow-xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 px-6 py-4">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                          <h3 className="font-bold text-lg text-foreground">نتائج التحليل</h3>
                        {aiSource && (
                            <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                                className="text-xs border-primary/30 bg-primary/5"
                          >
                            {aiSource === "openai" && (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                                OpenAI GPT-4o-mini
                              </>
                            )}
                            {aiSource === "anthropic" && (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1 text-purple-500" />
                                Claude 3.5 Sonnet
                              </>
                            )}
                            {aiSource === "gemini" && (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1 text-blue-500" />
                                    Gemini 2.5 Flash
                              </>
                            )}
                            {aiSource === "fallback" && (
                              <>
                                <Clock className="h-3 w-3 mr-1 text-yellow-500" />
                                Fallback
                              </>
                            )}
                          </Badge>
                            </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAiResponse(null);
                        setAiSource(null);
                      }}
                        className="text-muted-foreground hover:text-foreground hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4 prose-ul:list-disc prose-ul:mr-6 prose-ol:list-decimal prose-ol:mr-6 prose-li:mb-2 prose-strong:text-foreground prose-strong:font-semibold">
                      <div 
                        className="text-foreground/90 leading-relaxed space-y-4"
                        dangerouslySetInnerHTML={{
                          __html: formatAIResponse(aiResponse)
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!aiResponse && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">ادخل سؤالك أو اختر أحد الاقتراحات السريعة أعلاه</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

