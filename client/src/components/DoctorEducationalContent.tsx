import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { firestoreDb, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Plus, Edit, Trash2, BookOpen, Video, Search, Filter, TrendingUp, FileText, Clock, ArrowLeft, Save, X, Download } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { breastCancerEducationContent } from "@/data/breastCancerEducationContent";

interface ContentItem {
  id: string;
  type: "article" | "video";
  title: string;
  description: string;
  category: string;
  duration: string;
  url?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

const defaultCategories = ["الوقاية", "العلاج", "التغذية", "الرياضة", "الدعم النفسي", "الفحوصات", "الجراحة"];

export function DoctorEducationalContent() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [formData, setFormData] = useState<Partial<ContentItem>>({
    type: "article",
    title: "",
    description: "",
    category: defaultCategories[0],
    duration: "",
    url: "",
    content: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestoreDb, "educationalContent"),
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        // Sort client-side by createdAt descending
        items.sort((a: any, b: any) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setContent(items as ContentItem[]);
      },
      (error) => {
        console.error("Error fetching educational content:", error);
      }
    );
    return () => unsub();
  }, []);

  const filteredContent = content.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const stats = {
    total: content.length,
    articles: content.filter((c) => c.type === "article").length,
    videos: content.filter((c) => c.type === "video").length,
    categories: new Set(content.map((c) => c.category)).size,
  };

  const categories = ["all", ...Array.from(new Set(content.map((item) => item.category)))];

  const handleAdd = async () => {
    if (!formData.title || !formData.description || !formData.category) return;
    await addDoc(collection(firestoreDb, "educationalContent"), {
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedContent || !formData.title || !formData.description) return;
    await updateDoc(doc(firestoreDb, "educationalContent", selectedContent.id), {
      ...formData,
      updatedAt: new Date().toISOString(),
    });
    setEditDialogOpen(false);
    setSelectedContent(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedContent) return;
    await deleteDoc(doc(firestoreDb, "educationalContent", selectedContent.id));
    setDeleteDialogOpen(false);
    setSelectedContent(null);
  };

  const resetForm = () => {
    setFormData({
      type: "article",
      title: "",
      description: "",
      category: defaultCategories[0],
      duration: "",
      url: "",
      content: "",
    });
  };

  const openEditDialog = (item: ContentItem) => {
    setSelectedContent(item);
    setFormData({
      type: item.type,
      title: item.title,
      description: item.description,
      category: item.category,
      duration: item.duration,
      url: item.url || "",
      content: item.content || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (item: ContentItem) => {
    setSelectedContent(item);
    setDeleteDialogOpen(true);
  };

  const [loadingDefaultContent, setLoadingDefaultContent] = useState(false);

  const handleAddDefaultContent = async () => {
    setLoadingDefaultContent(true);
    try {
      // Check which content items already exist
      const existingTitles = new Set(content.map(item => item.title));
      
      // Add only items that don't exist yet
      const itemsToAdd = breastCancerEducationContent.filter(
        item => !existingTitles.has(item.title)
      );

      if (itemsToAdd.length === 0) {
        alert("جميع المحتويات موجودة بالفعل!");
        setLoadingDefaultContent(false);
        return;
      }

      // Add all items
      for (const item of itemsToAdd) {
        await addDoc(collection(firestoreDb, "educationalContent"), {
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      alert(`تم إضافة ${itemsToAdd.length} محتوى بنجاح!`);
    } catch (error: any) {
      console.error("Error adding default content:", error);
      const errorMessage = error?.message || "خطأ غير معروف";
      const errorCode = error?.code || "";
      console.error("Error details:", { errorCode, errorMessage, error });
      
      // Show more specific error message
      let userMessage = "حدث خطأ أثناء إضافة المحتوى. يرجى المحاولة مرة أخرى.";
      if (errorCode === "permission-denied") {
        userMessage = "ليس لديك صلاحيات لإضافة المحتوى. يجب أن تكون طبيباً أو مديراً.";
      } else if (errorCode === "failed-precondition") {
        userMessage = "حدث خطأ في قاعدة البيانات. يرجى التحقق من الإعدادات.";
      }
      
      alert(userMessage);
    } finally {
      setLoadingDefaultContent(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              إدارة المحتوى التعليمي
            </h1>
            <p className="text-muted-foreground mt-1">
              إضافة وتعديل وإدارة المحتوى التعليمي للمرضى
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/doctor">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              العودة للوحة التحكم
            </Button>
          </Link>
          <Button 
            onClick={handleAddDefaultContent} 
            disabled={loadingDefaultContent}
            variant="outline" 
            className="gap-2 border-primary/50 hover:bg-primary/10"
          >
            <Download className="h-4 w-4" />
            {loadingDefaultContent ? "جاري الإضافة..." : "إضافة محتوى افتراضي"}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/90">
            <Plus className="h-4 w-4" />
            إضافة محتوى جديد
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">إجمالي المحتوى</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-2 hover:border-purple-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">المقالات</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.articles}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-2 hover:border-blue-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الفيديوهات</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.videos}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-2 hover:border-emerald-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الفئات</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.categories}</p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
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
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحثي عن محتوى..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {categories.filter((c) => c !== "all").map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="article">مقالات</SelectItem>
                <SelectItem value="video">فيديوهات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>المحتوى ({filteredContent.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContent.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">لا يوجد محتوى بعد</p>
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة أول محتوى
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredContent.map((item, index) => {
                  const isVideo = item.type === "video";
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card className={`border-2 h-full flex flex-col ${
                        isVideo ? "border-blue-300 dark:border-blue-700" : "border-purple-300 dark:border-purple-700"
                      }`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {isVideo ? (
                                  <Video className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <BookOpen className="h-5 w-5 text-purple-600 flex-shrink-0" />
                                )}
                                <Badge className={isVideo ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                                  {isVideo ? "فيديو" : "مقال"}
                                </Badge>
                              </div>
                              <CardTitle className="text-lg mb-1 line-clamp-2">{item.title}</CardTitle>
                              <CardDescription className="line-clamp-2 text-sm">{item.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <Badge variant="outline">{item.category}</Badge>
                            {item.duration && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{item.duration}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                              تعديل
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => openDeleteDialog(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة محتوى جديد</DialogTitle>
            <DialogDescription>أضيفي محتوى تعليمي جديد للمرضى</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">نوع المحتوى</Label>
                <Select value={formData.type} onValueChange={(value: "article" | "video") => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">مقال</SelectItem>
                    <SelectItem value="video">فيديو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">الفئة</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="title">العنوان *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-2"
                placeholder="أدخلي عنوان المحتوى"
              />
            </div>
            <div>
              <Label htmlFor="description">الوصف *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2 min-h-24"
                placeholder="أدخلي وصف المحتوى"
              />
            </div>
            <div>
              <Label htmlFor="duration">المدة</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="mt-2"
                placeholder="مثال: 5 دقائق"
              />
            </div>
            {formData.type === "video" ? (
              <div>
                <Label htmlFor="url">رابط الفيديو (YouTube, Vimeo, etc.)</Label>
                <Input
                  id="url"
                  value={formData.url || ""}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="mt-2"
                  placeholder="https://..."
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="content">محتوى المقال</Label>
                <Textarea
                  id="content"
                  value={formData.content || ""}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="mt-2 min-h-32"
                  placeholder="أدخلي محتوى المقال الكامل"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleAdd} className="gap-2 bg-gradient-to-r from-primary to-primary/90">
              <Save className="h-4 w-4" />
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المحتوى</DialogTitle>
            <DialogDescription>عدّلي معلومات المحتوى التعليمي</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">نوع المحتوى</Label>
                <Select value={formData.type} onValueChange={(value: "article" | "video") => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">مقال</SelectItem>
                    <SelectItem value="video">فيديو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-category">الفئة</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-title">العنوان *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">الوصف *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2 min-h-24"
              />
            </div>
            <div>
              <Label htmlFor="edit-duration">المدة</Label>
              <Input
                id="edit-duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="mt-2"
              />
            </div>
            {formData.type === "video" ? (
              <div>
                <Label htmlFor="edit-url">رابط الفيديو</Label>
                <Input
                  id="edit-url"
                  value={formData.url || ""}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="mt-2"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="edit-content">محتوى المقال</Label>
                <Textarea
                  id="edit-content"
                  value={formData.content || ""}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="mt-2 min-h-32"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); resetForm(); setSelectedContent(null); }}>
              إلغاء
            </Button>
            <Button onClick={handleEdit} className="gap-2 bg-gradient-to-r from-primary to-primary/90">
              <Save className="h-4 w-4" />
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنتِ متأكدة من حذف هذا المحتوى؟ سيتم حذفه بشكل نهائي.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

