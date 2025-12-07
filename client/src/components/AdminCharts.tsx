import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Activity, Users, Stethoscope, BookOpen, Shield, AlertTriangle, MessageSquare, Calendar, ArrowUpRight, ArrowDownRight, Clock, Filter, CalendarDays, BarChart3, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ChartData {
  patients: any[];
  doctors: any[];
  assessments: any[];
  diaryEntries: any[];
  appointments: any[];
  alerts: any[];
  messages: any[];
}

type TimeRange = "day" | "week" | "month" | "year" | "all";

export function AdminCharts({ data }: { data: ChartData }) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [viewMode, setViewMode] = useState<"detailed" | "overview">("overview");

  // Calculate date ranges
  const now = new Date();
  const getStartDate = (range: TimeRange): Date => {
    const start = new Date();
    switch (range) {
      case "day":
        start.setDate(start.getDate() - 1);
        break;
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "all":
        return new Date(0); // All time
    }
    return start;
  };

  const startDate = getStartDate(timeRange);

  // Filter data by date range
  const filterByDate = (items: any[], dateField: string = "createdAt") => {
    if (timeRange === "all") return items;
    return items.filter(item => {
      if (!item[dateField]) return false;
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= now;
    });
  };

  const filteredData = useMemo(() => ({
    patients: data.patients,
    doctors: data.doctors,
    assessments: filterByDate(data.assessments),
    diaryEntries: filterByDate(data.diaryEntries),
    appointments: filterByDate(data.appointments, "at"),
    alerts: filterByDate(data.alerts),
    messages: filterByDate(data.messages),
  }), [data, timeRange, startDate]);

  // Calculate KPIs
  const totalPatients = filteredData.patients.length;
  const totalDoctors = filteredData.doctors.length;
  const totalAssessments = filteredData.assessments.length;
  const totalDiaryEntries = filteredData.diaryEntries.length;
  const totalMessages = filteredData.messages.length;
  const activeAlerts = filteredData.alerts.filter(a => a.status === "open").length;
  const totalAppointments = filteredData.appointments.length;
  const upcomingAppointments = filteredData.appointments.filter(a => {
    if (!a.at) return false;
    const date = new Date(a.at);
    return date >= new Date() && (a.status === "upcoming" || !a.status);
  }).length;

  // Calculate previous period for comparison
  const getPreviousPeriodStart = (range: TimeRange): { start: Date; end: Date } => {
    const prevStart = new Date();
    switch (range) {
      case "day":
        prevStart.setDate(prevStart.getDate() - 2);
        const prevDayEnd = new Date();
        prevDayEnd.setDate(prevDayEnd.getDate() - 1);
        return { start: prevStart, end: prevDayEnd };
      case "week":
        prevStart.setDate(prevStart.getDate() - 14);
        const prevWeekEnd = new Date();
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
        return { start: prevStart, end: prevWeekEnd };
      case "month":
        prevStart.setMonth(prevStart.getMonth() - 2);
        const prevMonthEnd = new Date();
        prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1);
        return { start: prevStart, end: prevMonthEnd };
      case "year":
        prevStart.setFullYear(prevStart.getFullYear() - 2);
        const prevYearEnd = new Date();
        prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
        return { start: prevStart, end: prevYearEnd };
      default:
        return { start: new Date(0), end: new Date() };
    }
  };

  const prevPeriod = getPreviousPeriodStart(timeRange);

  // Calculate previous period data for comparison
  const prevPeriodAssessments = useMemo(() => {
    if (timeRange === "all") return 0;
    return data.assessments.filter(item => {
      if (!item.createdAt) return false;
      const itemDate = new Date(item.createdAt);
      return itemDate >= prevPeriod.start && itemDate <= prevPeriod.end;
    }).length;
  }, [data.assessments, timeRange, prevPeriod]);

  const prevPeriodDiaryEntries = useMemo(() => {
    if (timeRange === "all") return 0;
    return data.diaryEntries.filter(item => {
      if (!item.createdAt) return false;
      const itemDate = new Date(item.createdAt);
      return itemDate >= prevPeriod.start && itemDate <= prevPeriod.end;
    }).length;
  }, [data.diaryEntries, timeRange, prevPeriod]);

  const prevPeriodMessages = useMemo(() => {
    if (timeRange === "all") return 0;
    return data.messages.filter(item => {
      if (!item.createdAt) return false;
      const itemDate = new Date(item.createdAt);
      return itemDate >= prevPeriod.start && itemDate <= prevPeriod.end;
    }).length;
  }, [data.messages, timeRange, prevPeriod]);

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const growth = ((current - previous) / previous) * 100;
    return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  };

  const assessmentGrowth = timeRange !== "all" ? calculateGrowth(totalAssessments, prevPeriodAssessments) : "—";
  const diaryGrowth = timeRange !== "all" ? calculateGrowth(totalDiaryEntries, prevPeriodDiaryEntries) : "—";
  const messageGrowth = timeRange !== "all" ? calculateGrowth(totalMessages, prevPeriodMessages) : "—";

  // Prepare data for charts
  const riskLevelData = filteredData.assessments.reduce((acc: any, assessment: any) => {
    const level = assessment.level || "غير محدد";
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const riskChartData = Object.entries(riskLevelData).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const patientStatusData = filteredData.patients.reduce((acc: any, patient: any) => {
    const status = patient.status || "متابعة";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(patientStatusData).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  // Generate time-based data based on range
  const generateTimeSeries = (range: TimeRange, items: any[]) => {
    const groups: { [key: string]: number } = {};
    
    items.forEach(item => {
      if (!item.createdAt) return;
      const date = new Date(item.createdAt);
      let key = "";
      
      switch (range) {
        case "day":
          key = date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric" });
          break;
        case "week":
          key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          break;
        case "month":
          key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          break;
        case "year":
          key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          break;
        default:
          key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      }
      
      groups[key] = (groups[key] || 0) + 1;
    });

    return Object.entries(groups).map(([name, value]) => ({
      name,
      count: value as number,
    })).sort((a, b) => {
      return new Date(a.name).getTime() - new Date(b.name).getTime();
    });
  };

  // Monthly diary entries (or based on range)
  const diaryChartData = useMemo(() => {
    if (timeRange === "day" || timeRange === "week") {
      return generateTimeSeries(timeRange, filteredData.diaryEntries);
    }
    const monthlyDiary = filteredData.diaryEntries.reduce((acc: any, entry: any) => {
      if (!entry.createdAt) return acc;
      const date = new Date(entry.createdAt);
      const month = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(monthlyDiary).map(([name, value]) => ({
      name,
      entries: value as number,
    })).sort((a, b) => {
      return new Date(a.name).getTime() - new Date(b.name).getTime();
    });
  }, [filteredData.diaryEntries, timeRange]);

  // Monthly assessments (or based on range)
  const assessmentChartData = useMemo(() => {
    if (timeRange === "day" || timeRange === "week") {
      return generateTimeSeries(timeRange, filteredData.assessments);
    }
    const monthlyAssessments = filteredData.assessments.reduce((acc: any, assessment: any) => {
      if (!assessment.createdAt) return acc;
      const date = new Date(assessment.createdAt);
      const month = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(monthlyAssessments).map(([name, value]) => ({
      name,
      assessments: value as number,
    })).sort((a, b) => {
      return new Date(a.name).getTime() - new Date(b.name).getTime();
    });
  }, [filteredData.assessments, timeRange]);

  // Alerts by type
  const alertsByType = filteredData.alerts.reduce((acc: any, alert: any) => {
    const type = alert.type || "غير محدد";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const alertsChartData = Object.entries(alertsByType).map(([name, value]) => ({
    name,
    count: value as number,
  }));

  // Messages by source
  const messagesBySource = filteredData.messages.reduce((acc: any, message: any) => {
    const source = message.from === "patient" ? "مرضى" : "أطباء";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const messagesChartData = Object.entries(messagesBySource).map(([name, value]) => ({
    name,
    count: value as number,
  }));

  // Appointments by status
  const appointmentsByStatus = filteredData.appointments.reduce((acc: any, appt: any) => {
    const status = appt.status || "upcoming";
    const statusLabel = status === "upcoming" ? "قادمة" : status === "completed" ? "مكتملة" : "ملغاة";
    acc[statusLabel] = (acc[statusLabel] || 0) + 1;
    return acc;
  }, {});

  const appointmentsChartData = Object.entries(appointmentsByStatus).map(([name, value]) => ({
    name,
    count: value as number,
  }));

  // Daily activity (last 7 days or based on range)
  const dailyActivity = useMemo(() => {
    let daysToShow = 7;
    if (timeRange === "day") daysToShow = 24; // Hours
    else if (timeRange === "week") daysToShow = 7;
    else if (timeRange === "month") daysToShow = 30;
    else if (timeRange === "year") daysToShow = 12; // Months

    const dates = Array.from({ length: daysToShow }, (_, i) => {
      const date = new Date();
      if (timeRange === "day") {
        date.setHours(date.getHours() - (daysToShow - 1 - i));
        return date.toLocaleTimeString("en-US", { hour: "numeric" });
      } else if (timeRange === "year") {
        date.setMonth(date.getMonth() - (daysToShow - 1 - i));
        return date.toLocaleDateString("en-US", { month: "short" });
      } else {
        date.setDate(date.getDate() - (daysToShow - 1 - i));
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    });

    return dates.map(day => {
      let dayStart: Date, dayEnd: Date;
      
      if (timeRange === "day") {
        const hour = parseInt(day.split(":")[0]);
        dayStart = new Date();
        dayStart.setHours(hour, 0, 0, 0);
        dayEnd = new Date();
        dayEnd.setHours(hour + 1, 0, 0, -1);
      } else if (timeRange === "year") {
        const monthIndex = new Date(day + " 1, 2024").getMonth();
        dayStart = new Date();
        dayStart.setMonth(monthIndex, 1);
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date();
        dayEnd.setMonth(monthIndex + 1, 0);
        dayEnd.setHours(23, 59, 59, 999);
      } else {
        dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
      }

      const diaryCount = filteredData.diaryEntries.filter(entry => {
        if (!entry.createdAt) return false;
        const entryDate = new Date(entry.createdAt);
        return entryDate >= dayStart && entryDate <= dayEnd;
      }).length;

      const messageCount = filteredData.messages.filter(msg => {
        if (!msg.createdAt) return false;
        const msgDate = new Date(msg.createdAt);
        return msgDate >= dayStart && msgDate <= dayEnd;
      }).length;

      return {
        name: day,
        "منشورات": diaryCount,
        "رسائل": messageCount,
      };
    });
  }, [filteredData, timeRange]);

  // Overview Analytics - Compare different periods
  const overviewAnalytics = useMemo(() => {
    const now = new Date();
    
    // Today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayData = {
      assessments: data.assessments.filter(a => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt) >= todayStart;
      }).length,
      diaryEntries: data.diaryEntries.filter(e => {
        if (!e.createdAt) return false;
        return new Date(e.createdAt) >= todayStart;
      }).length,
      messages: data.messages.filter(m => {
        if (!m.createdAt) return false;
        return new Date(m.createdAt) >= todayStart;
      }).length,
      appointments: data.appointments.filter(a => {
        if (!a.at) return false;
        return new Date(a.at) >= todayStart;
      }).length,
    };

    // This week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekData = {
      assessments: data.assessments.filter(a => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt) >= weekStart;
      }).length,
      diaryEntries: data.diaryEntries.filter(e => {
        if (!e.createdAt) return false;
        return new Date(e.createdAt) >= weekStart;
      }).length,
      messages: data.messages.filter(m => {
        if (!m.createdAt) return false;
        return new Date(m.createdAt) >= weekStart;
      }).length,
      appointments: data.appointments.filter(a => {
        if (!a.at) return false;
        return new Date(a.at) >= weekStart;
      }).length,
    };

    // This month
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    const monthData = {
      assessments: data.assessments.filter(a => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt) >= monthStart;
      }).length,
      diaryEntries: data.diaryEntries.filter(e => {
        if (!e.createdAt) return false;
        return new Date(e.createdAt) >= monthStart;
      }).length,
      messages: data.messages.filter(m => {
        if (!m.createdAt) return false;
        return new Date(m.createdAt) >= monthStart;
      }).length,
      appointments: data.appointments.filter(a => {
        if (!a.at) return false;
        return new Date(a.at) >= monthStart;
      }).length,
    };

    // This year
    const yearStart = new Date();
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    const yearData = {
      assessments: data.assessments.filter(a => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt) >= yearStart;
      }).length,
      diaryEntries: data.diaryEntries.filter(e => {
        if (!e.createdAt) return false;
        return new Date(e.createdAt) >= yearStart;
      }).length,
      messages: data.messages.filter(m => {
        if (!m.createdAt) return false;
        return new Date(m.createdAt) >= yearStart;
      }).length,
      appointments: data.appointments.filter(a => {
        if (!a.at) return false;
        return new Date(a.at) >= yearStart;
      }).length,
    };

    return {
      today: todayData,
      week: weekData,
      month: monthData,
      year: yearData,
    };
  }, [data]);

  const COLORS = [
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#84cc16',
  ];

  const chartConfig = {
    value: { label: "القيمة", color: "hsl(var(--chart-1))" },
    entries: { label: "عدد المنشورات", color: "hsl(var(--chart-2))" },
    assessments: { label: "عدد التقييمات", color: "hsl(var(--chart-3))" },
    count: { label: "العدد", color: "hsl(var(--chart-4))" },
    "منشورات": { label: "منشورات", color: "hsl(var(--chart-1))" },
    "رسائل": { label: "رسائل", color: "hsl(var(--chart-2))" },
  };

  const kpiCards = [
    {
      title: "إجمالي المرضى",
      value: totalPatients,
      change: totalPatients > 0 ? "+12%" : "0%",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: "up" as const,
    },
    {
      title: "إجمالي الأطباء",
      value: totalDoctors,
      change: "مستقر",
      icon: Stethoscope,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: "neutral" as const,
    },
    {
      title: "التقييمات",
      value: totalAssessments,
      change: assessmentGrowth,
      icon: Shield,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      trend: timeRange !== "all" && parseFloat(assessmentGrowth) >= 0 ? "up" : "down",
    },
    {
      title: "منشورات اليوميات",
      value: totalDiaryEntries,
      change: diaryGrowth,
      icon: BookOpen,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      trend: timeRange !== "all" && parseFloat(diaryGrowth) >= 0 ? "up" : "down",
    },
    {
      title: "الرسائل",
      value: totalMessages,
      change: messageGrowth,
      icon: MessageSquare,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      trend: timeRange !== "all" && parseFloat(messageGrowth) >= 0 ? "up" : "down",
    },
    {
      title: "التنبيهات النشطة",
      value: activeAlerts,
      change: activeAlerts > 0 ? "+5%" : "0%",
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      trend: activeAlerts > 0 ? "up" : "down",
    },
    {
      title: "المواعيد القادمة",
      value: upcomingAppointments,
      change: `${totalAppointments} إجمالي`,
      icon: Calendar,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      trend: "neutral" as const,
    },
    {
      title: "إجمالي المواعيد",
      value: totalAppointments,
      change: "—",
      icon: Clock,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      trend: "neutral" as const,
    },
  ];

  const timeRangeLabels: Record<TimeRange, string> = {
    day: "آخر 24 ساعة",
    week: "آخر أسبوع",
    month: "آخر شهر",
    year: "آخر سنة",
    all: "الكل",
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Controls - Redesigned */}
      <Card className="border-2 shadow-xl bg-gradient-to-br from-background via-background to-primary/5">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Filter className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-base">الفترة الزمنية:</span>
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                  <SelectTrigger className="w-[160px] h-10 border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">آخر 24 ساعة</SelectItem>
                    <SelectItem value="week">آخر أسبوع</SelectItem>
                    <SelectItem value="month">آخر شهر</SelectItem>
                    <SelectItem value="year">آخر سنة</SelectItem>
                    <SelectItem value="all">الكل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl">
              <Button
                variant={viewMode === "overview" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("overview")}
                className="flex items-center gap-2 h-9 px-4"
              >
                <CalendarDays className="h-4 w-4" />
                <span>نظرة عامة</span>
              </Button>
              <Button
                variant={viewMode === "detailed" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("detailed")}
                className="flex items-center gap-2 h-9 px-4"
              >
                <BarChart3 className="h-4 w-4" />
                <span>تفاصيل</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Analytics - Redesigned */}
      {viewMode === "overview" && (
        <div className="space-y-6">
          {/* Period Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "اليوم", data: overviewAnalytics.today, color: "from-blue-500/20 to-blue-600/10", icon: Clock },
              { label: "هذا الأسبوع", data: overviewAnalytics.week, color: "from-green-500/20 to-green-600/10", icon: CalendarDays },
              { label: "هذا الشهر", data: overviewAnalytics.month, color: "from-purple-500/20 to-purple-600/10", icon: Calendar },
              { label: "هذه السنة", data: overviewAnalytics.year, color: "from-orange-500/20 to-orange-600/10", icon: TrendingUp },
            ].map((period, index) => {
              const Icon = period.icon;
              return (
                <motion.div
                  key={period.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-background via-background to-primary/5 hover:scale-[1.02]">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${period.color}`}>
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg">{period.label}</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                          <span className="text-sm font-medium text-muted-foreground">التقييمات</span>
                          <Badge variant="outline" className="font-bold text-base px-3 py-1">{period.data.assessments}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                          <span className="text-sm font-medium text-muted-foreground">منشورات</span>
                          <Badge variant="outline" className="font-bold text-base px-3 py-1">{period.data.diaryEntries}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                          <span className="text-sm font-medium text-muted-foreground">رسائل</span>
                          <Badge variant="outline" className="font-bold text-base px-3 py-1">{period.data.messages}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                          <span className="text-sm font-medium text-muted-foreground">مواعيد</span>
                          <Badge variant="outline" className="font-bold text-base px-3 py-1">{period.data.appointments}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Comparison Chart - Improved */}
          <Card className="border-2 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="h-6 w-6 text-primary flex-shrink-0" />
                </motion.div>
                <span>مقارنة الفترات الزمنية</span>
              </CardTitle>
              <CardDescription className="text-right text-base mt-2">
                مقارنة شاملة بين الفترات المختلفة
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ChartContainer config={chartConfig} className="h-[500px] w-full" dir="rtl">
                <BarChart
                  data={[
                    { name: "اليوم", تقييمات: overviewAnalytics.today.assessments, منشورات: overviewAnalytics.today.diaryEntries, رسائل: overviewAnalytics.today.messages },
                    { name: "أسبوع", تقييمات: overviewAnalytics.week.assessments, منشورات: overviewAnalytics.week.diaryEntries, رسائل: overviewAnalytics.week.messages },
                    { name: "شهر", تقييمات: overviewAnalytics.month.assessments, منشورات: overviewAnalytics.month.diaryEntries, رسائل: overviewAnalytics.month.messages },
                    { name: "سنة", تقييمات: overviewAnalytics.year.assessments, منشورات: overviewAnalytics.year.diaryEntries, رسائل: overviewAnalytics.year.messages },
                  ]}
                  margin={{ top: 30, right: 50, left: 80, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="currentColor" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'currentColor', fontSize: 13, fontWeight: 600 }}
                    label={{ value: 'الفترة', position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                    angle={0}
                    height={80}
                    dy={10}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                    label={{ value: 'العدد', angle: -90, position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                    width={75}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '30px', fontSize: '14px', fontWeight: 600 }}
                    iconType="circle"
                    iconSize={12}
                    formatter={(value) => <span style={{ fontSize: '14px', fontWeight: 600 }}>{value}</span>}
                  />
                  <Bar dataKey="تقييمات" fill="#8b5cf6" radius={[10, 10, 0, 0]} name="تقييمات" />
                  <Bar dataKey="منشورات" fill="#ec4899" radius={[10, 10, 0, 0]} name="منشورات" />
                  <Bar dataKey="رسائل" fill="#10b981" radius={[10, 10, 0, 0]} name="رسائل" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics - Redesigned */}
      {viewMode === "detailed" && (
        <>
          {/* KPI Cards - Enhanced */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden group bg-gradient-to-br from-background via-background to-primary/5 hover:scale-[1.02] hover:-translate-y-1">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="text-right flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 truncate">
                            {kpi.title}
                          </p>
                          <p className="text-3xl sm:text-4xl font-extrabold leading-tight bg-gradient-to-r from-primary via-primary/80 to-foreground bg-clip-text text-transparent mb-1">{kpi.value}</p>
                          <div className="flex items-center gap-1 justify-end">
                            {kpi.trend === "up" && (
                              <>
                                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-bold">{kpi.change}</span>
                              </>
                            )}
                            {kpi.trend === "down" && (
                              <>
                                <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-bold">{kpi.change}</span>
                              </>
                            )}
                            {kpi.trend === "neutral" && (
                              <span className="text-xs sm:text-sm text-muted-foreground font-medium">{kpi.change}</span>
                            )}
                          </div>
                        </div>
                        <div className={`p-3 sm:p-4 rounded-xl ${kpi.bgColor} mr-2 sm:mr-4 flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-2xl`}>
                          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${kpi.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Main Charts Grid - Improved Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Levels Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="hover:shadow-2xl transition-all border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 rounded-xl bg-purple-500/15">
                      <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    </div>
                    <span>توزيع مستويات المخاطر</span>
                  </CardTitle>
                  <CardDescription className="text-right text-base mt-2">{timeRangeLabels[timeRange]}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {riskChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[450px] w-full" dir="rtl">
                      <PieChart>
                        <Pie
                          data={riskChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          animationDuration={800}
                          paddingAngle={3}
                        >
                          {riskChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          height={60}
                          iconType="circle"
                          iconSize={12}
                          formatter={(value) => <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>}
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <Shield className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-semibold">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Patient Status Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="hover:shadow-2xl transition-all border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 rounded-xl bg-blue-500/15">
                      <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    </div>
                    <span>حالات المرضى</span>
                  </CardTitle>
                  <CardDescription className="text-right text-base mt-2">{timeRangeLabels[timeRange]}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {statusChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[450px] w-full" dir="rtl">
                      <BarChart 
                        data={statusChartData}
                        margin={{ top: 30, right: 50, left: 80, bottom: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="currentColor" />
                        <XAxis 
                          dataKey="name" 
                          angle={-30} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 600 }}
                          interval={0}
                          label={{ value: 'حالة المريضة', position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          dy={10}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                          label={{ value: 'عدد المرضى', angle: -90, position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          width={75}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#8b5cf6" 
                          radius={[12, 12, 0, 0]}
                          animationDuration={800}
                          name="عدد المرضى"
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-semibold">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Activity Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="hover:shadow-2xl transition-all border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-pink-500/10 to-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 rounded-xl bg-pink-500/15">
                      <Activity className="h-6 w-6 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                    </div>
                    <span>النشاط اليومي</span>
                  </CardTitle>
                  <CardDescription className="text-right text-base mt-2">مقارنة المنشورات والرسائل ({timeRangeLabels[timeRange]})</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {dailyActivity.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[450px] w-full" dir="rtl">
                      <AreaChart 
                        data={dailyActivity}
                        margin={{ top: 30, right: 50, left: 80, bottom: 120 }}
                      >
                        <defs>
                          <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="currentColor" />
                        <XAxis 
                          dataKey="name" 
                          angle={-30} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                          interval={timeRange === "week" ? 0 : "preserveStartEnd"}
                          label={{ value: 'التاريخ / الوقت', position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          dy={10}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                          label={{ value: 'العدد', angle: -90, position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          width={75}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Legend 
                          verticalAlign="top"
                          height={50}
                          iconType="square"
                          iconSize={12}
                          formatter={(value) => <span style={{ fontSize: '14px', fontWeight: 600 }}>{value}</span>}
                          wrapperStyle={{ paddingBottom: '10px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="منشورات" 
                          stroke="#8b5cf6" 
                          fill="url(#colorPosts)" 
                          strokeWidth={3}
                          animationDuration={800}
                          name="منشورات"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="رسائل" 
                          stroke="#ec4899" 
                          fill="url(#colorMessages)" 
                          strokeWidth={3}
                          animationDuration={800}
                          name="رسائل"
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <Activity className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-semibold">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Diary Entries */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="hover:shadow-2xl transition-all border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 rounded-xl bg-purple-500/15">
                      <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    </div>
                    <span>منشورات اليوميات</span>
                  </CardTitle>
                  <CardDescription className="text-right text-base mt-2">اتجاه المنشورات ({timeRangeLabels[timeRange]})</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {diaryChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[450px] w-full" dir="rtl">
                      <AreaChart 
                        data={diaryChartData}
                        margin={{ top: 30, right: 50, left: 80, bottom: 120 }}
                      >
                        <defs>
                          <linearGradient id="colorDiary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="currentColor" />
                        <XAxis 
                          dataKey="name" 
                          angle={-30} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                          interval={timeRange === "week" || timeRange === "day" ? 0 : "preserveStartEnd"}
                          label={{ value: 'التاريخ', position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          dy={10}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                          label={{ value: 'عدد المنشورات', angle: -90, position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          width={85}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={timeRange === "day" || timeRange === "week" ? "count" : "entries"} 
                          stroke="#ec4899" 
                          fill="url(#colorDiary)" 
                          strokeWidth={3}
                          animationDuration={800}
                          name="عدد المنشورات"
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <BookOpen className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-semibold">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Assessments & Appointments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assessments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="hover:shadow-2xl transition-all border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-500/10 to-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 rounded-xl bg-green-500/15">
                      <Shield className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                    </div>
                    <span>التقييمات</span>
                  </CardTitle>
                  <CardDescription className="text-right text-base mt-2">اتجاه التقييمات ({timeRangeLabels[timeRange]})</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {assessmentChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[450px] w-full" dir="rtl">
                      <LineChart 
                        data={assessmentChartData}
                        margin={{ top: 30, right: 50, left: 80, bottom: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="currentColor" />
                        <XAxis 
                          dataKey="name" 
                          angle={-30} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                          interval={timeRange === "week" || timeRange === "day" ? 0 : "preserveStartEnd"}
                          label={{ value: 'التاريخ', position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          dy={10}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                          label={{ value: 'عدد التقييمات', angle: -90, position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          width={85}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={timeRange === "day" || timeRange === "week" ? "count" : "assessments"} 
                          stroke="#10b981" 
                          strokeWidth={4}
                          dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 9, strokeWidth: 2, stroke: '#10b981' }}
                          animationDuration={800}
                          name="عدد التقييمات"
                        />
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <Shield className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-semibold">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Appointments by Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="hover:shadow-2xl transition-all border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-500/10 to-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 rounded-xl bg-orange-500/15">
                      <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    </div>
                    <span>المواعيد حسب الحالة</span>
                  </CardTitle>
                  <CardDescription className="text-right text-base mt-2">{timeRangeLabels[timeRange]}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {appointmentsChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[450px] w-full" dir="rtl">
                      <BarChart 
                        data={appointmentsChartData}
                        margin={{ top: 30, right: 50, left: 80, bottom: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="currentColor" />
                        <XAxis 
                          dataKey="name" 
                          angle={-30} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 600 }}
                          interval={0}
                          label={{ value: 'حالة الموعد', position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          dy={10}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                          label={{ value: 'عدد المواعيد', angle: -90, position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          width={85}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#f59e0b" 
                          radius={[12, 12, 0, 0]}
                          animationDuration={800}
                          name="عدد المواعيد"
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <Calendar className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-semibold">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Alerts & Messages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alerts by Type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="hover:shadow-2xl transition-all border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-red-500/10 to-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 rounded-xl bg-red-500/15">
                      <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                    </div>
                    <span>التنبيهات حسب النوع</span>
                  </CardTitle>
                  <CardDescription className="text-right text-base mt-2">{timeRangeLabels[timeRange]}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {alertsChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[450px] w-full" dir="rtl">
                      <BarChart 
                        data={alertsChartData}
                        margin={{ top: 30, right: 50, left: 80, bottom: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="currentColor" />
                        <XAxis 
                          dataKey="name" 
                          angle={-30} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 600 }}
                          interval={0}
                          label={{ value: 'نوع التنبيه', position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          dy={10}
                        />
                        <YAxis 
                          tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                          label={{ value: 'عدد التنبيهات', angle: -90, position: 'outside', offset: 20, style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 15, fontWeight: 700 } }}
                          width={85}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#ef4444" 
                          radius={[12, 12, 0, 0]}
                          animationDuration={800}
                          name="عدد التنبيهات"
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <AlertTriangle className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-semibold">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Messages by Source */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Card className="hover:shadow-2xl transition-all border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 rounded-xl bg-cyan-500/15">
                      <MessageSquare className="h-6 w-6 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    </div>
                    <span>الرسائل حسب المصدر</span>
                  </CardTitle>
                  <CardDescription className="text-right text-base mt-2">{timeRangeLabels[timeRange]}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {messagesChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[450px] w-full" dir="rtl">
                      <PieChart>
                        <Pie
                          data={messagesChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="count"
                          animationDuration={800}
                          paddingAngle={3}
                        >
                          {messagesChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          height={60}
                          iconType="circle"
                          iconSize={12}
                          formatter={(value) => <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>}
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-semibold">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
