import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Video, FileText, Clock, GraduationCap, Sparkles, Play, Filter, Search, X, LayoutGrid, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { firestoreDb, collection, onSnapshot } from "@/lib/firebase";

interface ContentItem {
  id: string;
  type: "article" | "video";
  title: string;
  description: string;
  category: string;
  duration: string;
  url?: string;
  content?: string;
}

export function EducationalContent() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    console.log("🔍 Setting up educational content listener...");
    const unsub = onSnapshot(
      collection(firestoreDb, "educationalContent"),
      (snap) => {
        console.log("📚 Received educational content snapshot:", snap.docs.length, "items");
        if (snap.empty) {
          console.warn("⚠️ No educational content found in Firestore");
          setContent([]);
          return;
        }
        const items = snap.docs.map((d) => {
          const data = d.data();
          console.log("📄 Content item:", { id: d.id, title: data.title, category: data.category, type: data.type });
          return {
            id: d.id,
            type: data.type || "article",
            title: data.title || "بدون عنوان",
            description: data.description || "",
            category: data.category || "عام",
            duration: data.duration || "",
            url: data.url || "",
            content: data.content || "",
            createdAt: data.createdAt || new Date().toISOString(),
            ...data,
          };
        });
        // Sort client-side by createdAt descending
        items.sort((a: any, b: any) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        console.log("✅ Setting content:", items.length, "items");
        setContent(items as ContentItem[]);
      },
      (error: any) => {
        console.error("❌ Error fetching educational content:", error);
        console.error("Error code:", error?.code);
        console.error("Error message:", error?.message);
        // Set empty array on error to prevent UI issues
        setContent([]);
        if (error?.code === "permission-denied") {
          console.error("🚫 Permission denied - check Firestore rules");
        }
      }
    );
    return () => {
      console.log("🛑 Cleaning up educational content listener");
      unsub();
    };
  }, []);

  const categories = ["all", ...Array.from(new Set(content.map((item) => item.category)))];
  
  const filteredContent = useMemo(() => {
    // Start with all content
    let filtered = content;
    
    // Filter by category (only if not "all")
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }
    
    // Filter by type (only if not "all")
    if (selectedType && selectedType !== "all") {
      filtered = filtered.filter((item) => item.type === selectedType);
    }
    
    // Filter by search query (only if not empty)
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [content, selectedCategory, selectedType, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 pb-6 sm:pb-12">
      {/* Header Section with Enhanced Design */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-xl border-2 bg-gradient-to-br from-primary/10 via-background to-primary/5 relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -ml-24 -mb-24" />
          
          <CardHeader className="pb-6 relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <motion.div 
                  className="p-5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <GraduationCap className="h-10 w-10 text-primary" />
                </motion.div>
                <div>
                  <CardTitle className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-2">
                    مكتبة التوعية
                  </CardTitle>
                  <CardDescription className="font-body text-lg md:text-xl mt-2 flex items-center gap-2 text-foreground/80">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span>محتوى تعليمي شامل وموثوق لمساعدتك في رحلتك الصحية</span>
                  </CardDescription>
                </div>
              </div>
              {content.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden lg:flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20"
                >
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">{content.length} محتوى متاح</span>
                </motion.div>
              )}
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Search and Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card className="shadow-lg border-2 bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-sm">
          <CardContent className="pt-6 pb-6 space-y-5">
            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="ابحثي عن محتوى تعليمي (مثال: فحص، علاج، تغذية)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-11 pl-4 h-14 text-base border-2 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 bg-background/50 backdrop-blur-sm transition-all"
              />
              {searchQuery && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 hover:bg-primary/10 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <span className="text-base font-bold text-foreground">تصفية المحتوى</span>
              </div>
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[200px] h-11 border-2 hover:border-primary/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder="جميع الفئات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        <span className="font-semibold">جميع الفئات</span>
                      </div>
                    </SelectItem>
                    {categories.filter((cat) => cat !== "all").map((category) => (
                      <SelectItem key={category} value={category}>
                        <span className="font-medium">{category}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 hover:border-primary/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        <span className="font-semibold">الكل</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="article">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-medium">مقالات</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">فيديوهات</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Count and Active Filters */}
            {(selectedCategory !== "all" || selectedType !== "all" || searchQuery || content.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-sm font-semibold text-foreground">
                    النتائج:
                  </span>
                  <span className="text-primary font-bold text-base">
                    {filteredContent.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    من {content.length}
                  </span>
                </div>
                {(selectedCategory !== "all" || selectedType !== "all" || searchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedType("all");
                      setSearchQuery("");
                    }}
                    className="h-9 gap-2 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    إلغاء الفلاتر
                  </Button>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Content Grid */}
      <AnimatePresence mode="wait">
        {content.length === 0 ? (
          <motion.div
            key="no-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="col-span-full"
          >
            <Card className="shadow-2xl border-2 bg-gradient-to-br from-primary/10 via-background to-primary/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -ml-36 -mb-36" />
              <CardContent className="py-20 space-y-6 relative z-10">
                <motion.div 
                  className="flex justify-center"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="p-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl shadow-2xl">
                    <BookOpen className="h-20 w-20 text-primary" />
                  </div>
                </motion.div>
                <div className="space-y-3 text-center">
                  <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    لا يوجد محتوى تعليمي متاح حالياً
                  </h3>
                  <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                    سيتم إضافة محتوى تعليمي شامل عن سرطان الثدي قريباً
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">نعمل على إضافة محتوى مفيد وموثوق</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredContent.length > 0 ? (
          <motion.div
            key="content-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {filteredContent.map((item, index) => {
          const Icon = item.type === "video" ? Video : FileText;
              const isVideo = item.type === "video";
              
          return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  whileHover={{ y: -8, scale: 1.03 }}
                  className="group cursor-pointer"
                >
                  <Card 
                    className={`relative shadow-xl hover:shadow-2xl transition-all duration-500 border-2 group-hover:border-primary/60 bg-gradient-to-br from-background via-background/95 to-muted/20 overflow-hidden h-full flex flex-col backdrop-blur-sm ${
                      isVideo 
                        ? "border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700" 
                        : "border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700"
                    }`}
                    data-testid={`card-content-${item.id}`}
                  >
                    {/* Animated Background Gradient */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${
                      isVideo 
                        ? "bg-gradient-to-br from-blue-500/10 via-transparent to-blue-400/5" 
                        : "bg-gradient-to-br from-purple-500/10 via-transparent to-purple-400/5"
                    }`} />
                    
                    {/* Shine Effect on Hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>
                    
                    {/* Category Badge at Top */}
                    <motion.div
                      whileHover={{ scale: 1.08, y: -2 }}
                      className={`absolute top-4 left-4 z-10 ${isVideo ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-gradient-to-r from-purple-500 to-purple-600"} text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-1.5 backdrop-blur-sm`}
                    >
                      <span>{item.category}</span>
                    </motion.div>
                    
                    {/* Type Badge at Top Right */}
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 8 }}
                      className={`absolute top-4 right-4 z-10 p-3 rounded-2xl backdrop-blur-md shadow-2xl border ${
                        isVideo 
                          ? "bg-gradient-to-br from-blue-500/40 to-blue-600/30 border-blue-400/40" 
                          : "bg-gradient-to-br from-purple-500/40 to-purple-600/30 border-purple-400/40"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isVideo ? "text-white" : "text-white"}`} />
                    </motion.div>

                    <CardHeader className="pt-24 pb-6 relative z-0">
                      <CardTitle className="text-xl md:text-2xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2 min-h-[3.5rem]">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="font-body text-sm md:text-base leading-relaxed text-foreground/70 line-clamp-3 min-h-[4.5rem]">
                        {item.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5 mt-auto relative z-0 pb-6">
                      {/* Duration with enhanced design */}
                      <div className={`flex items-center gap-2.5 text-sm px-5 py-3 rounded-2xl border backdrop-blur-sm transition-all duration-300 group-hover:scale-105 ${
                        isVideo 
                          ? "bg-gradient-to-r from-blue-50/80 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 shadow-lg" 
                          : "bg-gradient-to-r from-purple-50/80 to-purple-100/60 dark:from-purple-950/40 dark:to-purple-900/30 border-purple-200 dark:border-purple-800 shadow-lg"
                      }`}>
                        <Clock className={`h-4 w-4 ${isVideo ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"}`} />
                        <span className={`font-bold ${isVideo ? "text-blue-700 dark:text-blue-300" : "text-purple-700 dark:text-purple-300"}`}>
                          {item.duration}
                        </span>
                      </div>

                      {/* Action Button */}
                      <motion.div 
                        whileHover={{ scale: 1.05, y: -2 }} 
                        whileTap={{ scale: 0.98 }}
                        className="w-full"
                      >
                        <Button 
                          onClick={() => {
                            setSelectedItem(item);
                            setDialogOpen(true);
                          }}
                          className={`w-full h-13 shadow-2xl hover:shadow-3xl transition-all duration-300 text-white font-bold text-base ${
                            isVideo 
                              ? "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 hover:shadow-blue-500/50" 
                              : "bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 hover:from-purple-700 hover:via-purple-600 hover:to-purple-700 hover:shadow-purple-500/50"
                          }`}
                          data-testid={`button-view-${item.id}`}
                          size="lg"
                        >
                          {isVideo ? (
                            <>
                              <Play className="ml-2 h-5 w-5" />
                              مشاهدة الفيديو
                            </>
                          ) : (
                            <>
                              <BookOpen className="ml-2 h-5 w-5" />
                              قراءة المقال
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </CardContent>

                    {/* Animated Gradient Border Bottom */}
                    <div className={`absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r ${
                      isVideo 
                        ? "from-blue-500 via-blue-400 to-blue-500" 
                        : "from-purple-500 via-purple-400 to-purple-500"
                    } opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-x-100 scale-x-0 origin-center shadow-2xl`} />
                    
                    {/* Corner accent */}
                    <div className={`absolute top-0 right-0 w-20 h-20 ${
                      isVideo ? "bg-blue-500/10" : "bg-purple-500/10"
                    } rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="col-span-full"
          >
            <Card className="shadow-xl border-2 bg-gradient-to-br from-muted/30 via-background to-muted/20">
              <CardContent className="py-20 space-y-6">
                <motion.div 
                  className="flex justify-center"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="p-6 bg-primary/10 rounded-full">
                    <Search className="h-16 w-16 text-primary" />
                  </div>
                </motion.div>
                <div className="space-y-3 text-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                    لا يوجد محتوى مطابق للبحث
                  </h3>
                  <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                    جربي تغيير معايير البحث أو إلغاء بعض الفلاتر للعثور على ما تبحثين عنه
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedType("all");
                      setSearchQuery("");
                    }}
                    className="h-12 px-8 gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
                  >
                    <X className="h-5 w-5" />
                    إلغاء جميع الفلاتر
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${selectedItem?.type === "video" ? "bg-blue-500/10" : "bg-purple-500/10"}`}>
                {selectedItem?.type === "video" ? (
                  <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                ) : (
                  <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl md:text-3xl font-bold mb-2">
                  {selectedItem?.title}
                </DialogTitle>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${selectedItem?.type === "video" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200" : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200"}`}>
                    {selectedItem?.category}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{selectedItem?.duration}</span>
                  </div>
                </div>
                <DialogDescription className="text-base mt-3 text-foreground/80">
                  {selectedItem?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6 py-6">
            {selectedItem?.type === "video" && selectedItem?.url ? (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <a 
                    href={selectedItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-5 w-5" />
                    <span className="text-lg font-semibold">افتح الفيديو</span>
                  </a>
                </div>
                {selectedItem.content && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-foreground font-body leading-relaxed">
                      {selectedItem.content}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedItem?.content ? (
              <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-p:leading-relaxed prose-ul:space-y-2 prose-ol:space-y-2">
                <div className="whitespace-pre-wrap text-foreground font-body leading-relaxed text-base md:text-lg p-4 bg-muted/30 rounded-xl border border-border/50">
                  {selectedItem.content.split('\n').map((line, idx) => {
                    // Helper function to render markdown in text
                    const renderMarkdown = (text: string) => {
                      const parts: (string | JSX.Element)[] = [];
                      let lastIndex = 0;
                      let key = 0;
                      
                      // Match **bold** or __bold__
                      const boldRegex = /(\*\*|__)(.*?)\1/g;
                      let match;
                      let matchIndex = 0;
                      
                      while ((match = boldRegex.exec(text)) !== null) {
                        // Add text before match
                        if (match.index > lastIndex) {
                          parts.push(text.substring(lastIndex, match.index));
                        }
                        
                        // Add bold text
                        parts.push(
                          <strong key={key++} className="font-bold text-foreground">
                            {renderMarkdown(match[2])}
                          </strong>
                        );
                        
                        lastIndex = match.index + match[0].length;
                        matchIndex++;
                      }
                      
                      // Add remaining text
                      if (lastIndex < text.length) {
                        parts.push(text.substring(lastIndex));
                      }
                      
                      // If no matches, return original text
                      if (matchIndex === 0) {
                        return text;
                      }
                      
                      return <>{parts}</>;
                    };
                    
                    if (line.startsWith('#')) {
                      const level = line.match(/^#+/)?.[0].length || 0;
                      const text = line.replace(/^#+\s*/, '');
                      const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
                      return (
                        <HeadingTag key={idx} className={`font-bold mb-4 mt-6 text-primary ${level === 1 ? 'text-3xl' : level === 2 ? 'text-2xl' : 'text-xl'}`}>
                          {renderMarkdown(text)}
                        </HeadingTag>
                      );
                    }
                    if (line.trim() === '') return <br key={idx} />;
                    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                      const listText = line.replace(/^[-*]\s*/, '');
                      return (
                        <li key={idx} className="list-disc list-inside mb-2 text-foreground/90 ml-4">
                          {renderMarkdown(listText)}
                        </li>
                      );
                    }
                    return (
                      <p key={idx} className="mb-4 text-foreground/90">
                        {renderMarkdown(line)}
                      </p>
                    );
                  })}
                </div>
              </div>
            ) : selectedItem?.url ? (
              <div className="text-center py-8">
                <a 
                  href={selectedItem.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline text-lg font-semibold"
                >
                  <ExternalLink className="h-5 w-5" />
                  <span>افتح الرابط</span>
                </a>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                لا يوجد محتوى متاح
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
