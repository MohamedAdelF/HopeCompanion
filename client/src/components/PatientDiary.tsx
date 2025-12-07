import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Smile, Frown, Meh, Lock, Globe, User, EyeOff, Heart, Clock, TrendingUp, MessageCircle, ArrowUpDown, Trash2, BookOpen, Sparkles, Send, Stethoscope, ShieldCheck, Briefcase, GraduationCap, X, Award, FileText } from "lucide-react";
import { collection, addDoc, onSnapshot, query, where, orderBy, firestoreDb, getDocs, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDoc, setDoc } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { getRole } from "@/lib/authRole";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSpecialization } from "@/lib/formatUtils";

interface DiaryEntry {
  id: string;
  patientId?: string;
  date: string;
  content: string;
  mood: "happy" | "neutral" | "sad";
  sentimentScore?: number;
  authorUid?: string;
  authorName?: string;
  authorEmail?: string;
  authorRole?: "patient" | "doctor";
  isPublic?: boolean;
  showAsAnonymous?: boolean;
  likedBy?: string[];
  likesCount?: number;
}

type FilterType = "all" | "public" | "my" | "doctors";
type SortType = "newest" | "oldest" | "mostLiked" | "mostCommented";

export function PatientDiary() {
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const [mood, setMood] = useState<DiaryEntry["mood"]>("neutral");
  const [isPublic, setIsPublic] = useState(true);
  const [showAsAnonymous, setShowAsAnonymous] = useState(false);
  const [allEntries, setAllEntries] = useState<DiaryEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("newest");
  const [commentsCount, setCommentsCount] = useState<Record<string, number>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [doctorInfoDialogOpen, setDoctorInfoDialogOpen] = useState(false);
  const [selectedDoctorUid, setSelectedDoctorUid] = useState<string | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const { user } = useAuth();

  // Load user's default diary settings from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setIsPublic(true);
      setShowAsAnonymous(false);
      return;
    }
    const loadSettings = async () => {
      try {
        const profDoc = await getDoc(doc(firestoreDb, "userProfiles", user.uid));
        const data = profDoc.data();
        if (data?.diarySettings) {
          setIsPublic(data.diarySettings.isPublic ?? true);
          setShowAsAnonymous(data.diarySettings.showAsAnonymous ?? false);
        }
      } catch (error) {
        console.error("Error loading diary settings:", error);
      }
    };
    loadSettings();
  }, [user?.uid]);

  // Get patientId for logged-in user
  const { data: patientId } = useQuery<string | null>({
    queryKey: ["patientId:first", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      const snap = await (await import("@/lib/firebase")).getDocs((await import("@/lib/firebase")).query((await import("@/lib/firebase")).collection((await import("@/lib/firebase")).firestoreDb, "patients"), (await import("@/lib/firebase")).where("uid", "==", user.uid)));
      const first = snap.docs[0];
      return first ? first.id : null;
    },
    enabled: !!user?.uid,
  });
  // Check if user is doctor
  const [isDoctor, setIsDoctor] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsDoctor(false);
      return;
    }
    const checkDoctor = async () => {
      try {
        const prof = await getDoc(doc(firestoreDb, "userProfiles", user.uid));
        const data = prof.data();
        setIsDoctor(data?.role === "doctor" || getRole() === "doctor");
      } catch {
        setIsDoctor(getRole() === "doctor");
      }
    };
    checkDoctor();
  }, [user]);

  const canWrite = useMemo(() => !!user && (!!patientId || isDoctor), [user, patientId, isDoctor]);

  // Fetch all diary entries
  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestoreDb, "diary"),
      (snap) => {
        const entries: DiaryEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data };
        });
        setAllEntries(entries);
      },
      (error) => {
        console.error("Error fetching diary entries:", error);
        // Try to fetch directly if snapshot fails
        getDocs(collection(firestoreDb, "diary")).then((snap) => {
          const entries: DiaryEntry[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setAllEntries(entries);
        }).catch((err) => {
          console.error("Error with getDocs:", err);
        });
      }
    );
    return () => unsub();
  }, []);

  // Fetch comments count for each entry
  useEffect(() => {
    const counts: Record<string, number> = {};
    const unsubs: (() => void)[] = [];
    
    allEntries.forEach((entry) => {
      const q = query(collection(firestoreDb, "diaryComments"), where("entryId", "==", entry.id));
      const unsub = onSnapshot(q, (snap) => {
        counts[entry.id] = snap.docs.length;
        setCommentsCount({ ...counts });
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((unsub) => unsub());
  }, [allEntries.map(e => e.id).join(',')]);

  // Filter and sort entries
  const entries = useMemo(() => {
    let filtered = allEntries.filter((e) => {
      // Default to public if isPublic is undefined or null (backward compatibility)
      const isPublicEntry = e.isPublic !== false;
      
      // Apply filters
      if (filter === "doctors") {
        // Show only doctor entries that are public
        return e.authorRole === "doctor" && isPublicEntry;
      } else if (filter === "public") {
        return isPublicEntry;
      } else if (filter === "my") {
        // Only for logged-in users
        if (!user?.uid) return false;
        return e.authorUid === user.uid;
      } else {
        // "all": For non-logged-in users, show all entries (blurred)
        if (!user?.uid) {
          return true; // Show all entries for guests (with blur effect)
        }
        // For logged-in users: show public entries OR private entries belonging to current user
        if (isPublicEntry) return true;
        return e.authorUid === user.uid;
      }
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      } else if (sortBy === "mostLiked") {
        const aLikes = a.likesCount || a.likedBy?.length || 0;
        const bLikes = b.likesCount || b.likedBy?.length || 0;
        return bLikes - aLikes;
      } else if (sortBy === "mostCommented") {
        const aComments = commentsCount[a.id] || 0;
        const bComments = commentsCount[b.id] || 0;
        return bComments - aComments;
      }
      return 0;
    });

    return filtered;
  }, [allEntries, filter, sortBy, commentsCount, user?.uid]);

  const moodIcons = {
    happy: { icon: Smile, color: "text-green-600", label: "سعيدة" },
    neutral: { icon: Meh, color: "text-yellow-600", label: "عادية" },
    sad: { icon: Frown, color: "text-red-600", label: "متعبة" },
  };

  const simpleSentiment = (text: string) => {
    const positives = ["جيد", "تحسن", "سعيد", "ممتاز", "أفضل", "قوي", "أمل"];
    const negatives = ["تعب", "ألم", "حزين", "سيء", "قلق", "خوف", "إرهاق"];
    const tokens = text.split(/\s+/);
    let score = 0;
    for (const t of tokens) {
      if (positives.some((p) => t.includes(p))) score += 1;
      if (negatives.some((n) => t.includes(n))) score -= 1;
    }
    return Math.max(-1, Math.min(1, score / Math.max(1, tokens.length / 10)));
  };

  const handleSave = async () => {
    if (!newEntry.trim() || !user) return;
    if (!isDoctor && !patientId) return; // Patients need patientId, doctors don't
    
    const userRole = isDoctor ? "doctor" : "patient";
    
    // Get doctor name
    let doctorName = null;
    if (isDoctor) {
      try {
        const doctorDoc = await getDoc(doc(firestoreDb, "doctors", user.uid));
        if (doctorDoc.exists()) {
          doctorName = doctorDoc.data()?.name;
        }
      } catch (error) {
        console.error("Error fetching doctor name:", error);
      }
    }
    
    // Get patient name
    let patientName = null;
    if (!isDoctor && user.uid) {
      try {
        const patientSnap = await getDocs(query(collection(firestoreDb, "patients"), where("uid", "==", user.uid)));
        if (!patientSnap.empty) {
          patientName = patientSnap.docs[0].data()?.name;
        }
      } catch (error) {
        console.error("Error fetching patient name:", error);
      }
    }
    
    const entry: any = {
      content: newEntry,
      mood,
      date: new Date().toISOString(),
      sentimentScore: simpleSentiment(newEntry),
      authorUid: user.uid,
      authorRole: userRole,
      isPublic: isPublic,
      showAsAnonymous: isPublic ? (isDoctor ? false : showAsAnonymous) : false, // Doctors always show name
      likedBy: [],
      likesCount: 0,
    };
    
    // Add patientId only for patients
    if (!isDoctor && patientId) {
      entry.patientId = patientId;
    }
    
    // Set author name
    if (!entry.showAsAnonymous) {
      if (isDoctor && doctorName) {
        entry.authorName = `د. ${doctorName}`;
      } else if (!isDoctor && patientName) {
        entry.authorName = patientName;
      } else {
        entry.authorName = user.displayName || user.email || "مجهول";
      }
      if (user.email) entry.authorEmail = user.email;
    }
    
    await addDoc(collection(firestoreDb, "diary"), entry);
    
    // Save user's default diary settings to Firestore
    try {
      await updateDoc(doc(firestoreDb, "userProfiles", user.uid), {
        diarySettings: {
          isPublic: isPublic,
          showAsAnonymous: showAsAnonymous,
        },
      });
    } catch (error) {
      // If userProfiles doesn't exist, create it
      try {
        await setDoc(doc(firestoreDb, "userProfiles", user.uid), {
          uid: user.uid,
          role: "patient",
          diarySettings: {
            isPublic: isPublic,
            showAsAnonymous: showAsAnonymous,
          },
        });
      } catch (err) {
        console.error("Error saving diary settings:", err);
      }
    }
    
    // Create alert only if patient has patientId
    if ((entry.sentimentScore < -0.2 || entry.mood === "sad") && !isDoctor && patientId) {
      try {
        await addDoc(collection(firestoreDb, "alerts"), {
          patientId,
          type: "sentiment",
          message: "مؤشر نفسي منخفض في اليوميات — يُنصح بالمتابعة.",
          status: "open",
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error creating sentiment alert:", error);
        // Don't block diary entry creation if alert fails
      }
    }
    setNewEntry("");
    setMood("neutral");
    // Keep the settings (don't reset to defaults) so they persist
    setIsAdding(false);
  };

  const toggleLike = async (entryId: string, currentLikedBy: string[] = []) => {
    if (!user?.uid) return;
    const entryRef = doc(firestoreDb, "diary", entryId);
    const entry = allEntries.find(e => e.id === entryId);
    const currentLikesCount = entry?.likesCount || currentLikedBy.length || 0;
    const isLiked = currentLikedBy.includes(user.uid);
    
    try {
      if (isLiked) {
        await updateDoc(entryRef, {
          likedBy: arrayRemove(user.uid),
          likesCount: Math.max(0, currentLikesCount - 1),
        });
      } else {
        await updateDoc(entryRef, {
          likedBy: arrayUnion(user.uid),
          likesCount: currentLikesCount + 1,
        });
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);
      if (error?.code === "permission-denied") {
        alert("ليس لديك صلاحيات لإضافة إعجاب. يرجى تسجيل الدخول.");
      } else {
        alert("حدث خطأ أثناء تحديث الإعجاب. يرجى المحاولة مرة أخرى.");
      }
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete || !user?.uid) return;
    const entry = allEntries.find(e => e.id === entryToDelete);
    if (!entry || entry.authorUid !== user.uid) return;
    
    // Delete the entry
    await deleteDoc(doc(firestoreDb, "diary", entryToDelete));
    
    // Also delete associated comments
    const commentsQuery = query(collection(firestoreDb, "diaryComments"), where("entryId", "==", entryToDelete));
    const commentsSnap = await getDocs(commentsQuery);
    const deleteComments = commentsSnap.docs.map(d => deleteDoc(doc(firestoreDb, "diaryComments", d.id)));
    await Promise.all(deleteComments);
    
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const displayName = (entry: DiaryEntry) => {
    if (entry.showAsAnonymous) return "مجهول";
    // If entry has authorName with "د." prefix, it's already formatted
    if (entry.authorName?.startsWith("د.")) return entry.authorName;
    // Otherwise, format based on role
    if (entry.authorRole === "doctor" && entry.authorName) {
      return entry.authorName.startsWith("د.") ? entry.authorName : `د. ${entry.authorName}`;
    }
    return entry.authorName || entry.authorEmail || "مجهول";
  };

  const isDoctorEntry = (entry: DiaryEntry) => entry.authorRole === "doctor";

  // جلب معلومات الطبيب
  useEffect(() => {
    if (!selectedDoctorUid || !doctorInfoDialogOpen) return;
    const loadDoctorInfo = async () => {
      try {
        const docSnap = await getDoc(doc(firestoreDb, "doctors", selectedDoctorUid));
        if (docSnap.exists()) {
          setDoctorInfo(docSnap.data());
        } else {
          setDoctorInfo(null);
        }
      } catch (error) {
        console.error("Error loading doctor info:", error);
        setDoctorInfo(null);
      }
    };
    loadDoctorInfo();
  }, [selectedDoctorUid, doctorInfoDialogOpen]);

  // قائمة التخصصات (نفس القائمة في DoctorProfile)
  const breastCancerSpecializations = [
    { value: "general_medicine", label: "الطب العام", description: "متابعة أولية وتوجيه المرضى" },
    { value: "breast_surgery", label: "جراحة الثدي", description: "تخصص في جراحات الثدي (استئصال الأورام، إعادة البناء)" },
    { value: "oncology", label: "طب الأورام", description: "تخصص في علاج الأورام الخبيثة (كيميائي، مناعي)" },
    { value: "radiology", label: "الأشعة التشخيصية", description: "تخصص في فحوصات الثدي (ماموجرام، سونار، MRI)" },
    { value: "pathology", label: "علم الأمراض (الباثولوجيا)", description: "تخصص في تحليل العينات والأنسجة" },
    { value: "radiation_oncology", label: "العلاج الإشعاعي", description: "تخصص في العلاج بالإشعاع" },
    { value: "psycho_oncology", label: "الطب النفسي للأورام", description: "دعم نفسي وعلاجي للمريضات" },
    { value: "reconstructive_surgery", label: "جراحة التجميل والإعادة", description: "إعادة بناء الثدي بعد الجراحة" },
    { value: "clinical_oncology", label: "الأورام السريرية", description: "متابعة وعلاج حالات السرطان" },
  ];

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const isBlurred = !user;

  return (
    <div className="max-w-3xl mx-auto space-y-3 px-4 sm:px-6 pb-4">
      {/* Header - Simplified */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">يومياتي</h1>
                </div>
        {!isAdding && canWrite && (
                    <Button 
                      onClick={() => setIsAdding(true)} 
                      data-testid="button-add-entry" 
            size="sm"
            className="gap-2"
                    >
            <Plus className="h-4 w-4" />
            إضافة منشور
                    </Button>
        )}
        {!isAdding && !canWrite && (
                  <Link href="/login">
            <Button variant="outline" size="sm">
              تسجيل الدخول
              </Button>
                  </Link>
            )}
          </div>

      {/* Add Entry Form - Simplified */}
          <AnimatePresence>
        {isAdding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
              >
            <Card className="border mb-3">
              <CardContent className="pt-4 space-y-4">
                {/* Mood Selection - Simplified */}
                <div>
                  <label className="text-sm font-medium mb-2 block">المزاج</label>
                  <div className="flex gap-2">
                {(Object.keys(moodIcons) as Array<DiaryEntry["mood"]>).map((m) => {
                  const MoodIcon = moodIcons[m].icon;
                        const isSelected = mood === m;
                  return (
                    <Button
                          key={m}
                              variant={isSelected ? "default" : "outline"}
                          size="sm"
                      onClick={() => setMood(m)}
                      data-testid={`button-mood-${m}`}
                          className="gap-2"
                    >
                          <MoodIcon className={`h-4 w-4 ${isSelected ? "" : moodIcons[m].color}`} />
                          {moodIcons[m].label}
                    </Button>
                  );
                })}
              </div>
            </div>

                {/* Textarea - Simplified */}
                <div>
            <Textarea
                    placeholder="اكتبي ما تشعرين به اليوم..."
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
                    className="min-h-24"
              data-testid="textarea-diary-entry"
            />
                  </div>

                {/* Privacy Settings - Simplified */}
                <div className="flex items-center gap-4 text-sm">
                  <RadioGroup value={isPublic ? "public" : "private"} onValueChange={(v) => setIsPublic(v === "public")} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="flex items-center gap-1 cursor-pointer">
                        <Globe className="h-4 w-4" />
                        عامة
                            </Label>
                                  </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="flex items-center gap-1 cursor-pointer">
                        <Lock className="h-4 w-4" />
                        خاصة
                            </Label>
                        </div>
                      </RadioGroup>

                    {isPublic && !isDoctor && (
                    <div className="flex items-center gap-2 mr-auto">
                      <input
                        type="checkbox"
                        id="anonymous"
                        checked={showAsAnonymous}
                        onChange={(e) => setShowAsAnonymous(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="anonymous" className="flex items-center gap-1 cursor-pointer text-xs">
                        <EyeOff className="h-3 w-3" />
                        مجهول
                              </Label>
                                    </div>
                    )}
                  </div>

                {/* Action Buttons - Simplified */}
                <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={handleSave} 
                        data-testid="button-save-entry" 
                    size="sm"
                        disabled={!newEntry.trim()}
                    className="flex-1"
                      >
                    <Send className="ml-2 h-4 w-4" />
                    نشر
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewEntry("");
                  setMood("neutral");
                        setIsPublic(true);
                        setShowAsAnonymous(false);
                }}
                data-testid="button-cancel-entry"
                    size="sm"
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
            </Card>
              </motion.div>
            )}
          </AnimatePresence>

      {/* Filters and Sort - Simplified */}
      <div className="flex flex-wrap gap-2 items-center justify-between pb-2">
              <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filter === "all" ? "default" : "outline"}
            size="sm"
                    onClick={() => setFilter("all")}
            className="gap-1"
                  >
            <Globe className="h-3 w-3" />
                    الكل
                  </Button>
          {user && (
            <>
                  <Button
                    variant={filter === "public" ? "default" : "outline"}
                size="sm"
                    onClick={() => setFilter("public")}
                className="gap-1"
                  >
                <Globe className="h-3 w-3" />
                عامة
                  </Button>
                    <Button
                      variant={filter === "my" ? "default" : "outline"}
                size="sm"
                      onClick={() => setFilter("my")}
                className="gap-1"
                    >
                <User className="h-3 w-3" />
                      منشوراتي
                    </Button>
              {isDoctor && (
                <Button
                  variant={filter === "doctors" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("doctors")}
                  className="gap-1"
                >
                  <Stethoscope className="h-3 w-3" />
                  الأطباء
                </Button>
              )}
            </>
                )}
              </div>
        <Select value={sortBy} onValueChange={(v: SortType) => setSortBy(v)}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
                </SelectTrigger>
                <SelectContent>
            <SelectItem value="newest">الأحدث</SelectItem>
            <SelectItem value="oldest">الأقدم</SelectItem>
            <SelectItem value="mostLiked">الأكثر إعجاباً</SelectItem>
            <SelectItem value="mostCommented">الأكثر تعليقاً</SelectItem>
                </SelectContent>
              </Select>
            </div>

      <div className="space-y-3 relative">
        {/* Blur overlay for non-logged-in users */}
        {isBlurred && entries.length > 0 && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center flex-col p-8 pointer-events-auto">
            <div className="text-center space-y-3">
              <Lock className="h-12 w-12 text-primary mx-auto opacity-50" />
              <h3 className="text-lg font-bold">حصري للأعضاء فقط</h3>
              <p className="text-sm text-muted-foreground">
                سجّلي دخولك لقراءة المنشورات والتفاعل مع المجتمع
                </p>
              <div className="flex gap-2 justify-center pt-2">
                <Link href="/login">
                  <Button size="sm">تسجيل الدخول</Button>
                </Link>
                <Link href="/signup/choose">
                  <Button size="sm" variant="outline">إنشاء حساب</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Entries container with blur effect for non-logged-in users */}
        <div className={isBlurred && entries.length > 0 ? "blur-md select-none pointer-events-none" : ""}>
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
            {(entries ?? []).map((entry, index) => {
          const MoodIcon = moodIcons[entry.mood].icon;
              const name = displayName(entry);
              const { date: dateStr, time: timeStr } = formatDateTime(entry.date);
              const likedBy = entry.likedBy || [];
              const isLiked = user?.uid ? likedBy.includes(user.uid) : false;
              const likesCount = entry.likesCount || likedBy.length || 0;
              const commentsCountForEntry = commentsCount[entry.id] || 0;

          return (
                  <Card 
                  key={entry.id}
                  className="border mb-3"
                    data-testid={`card-entry-${entry.id}`}
                  >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {name && (
                          <div 
                            className={`flex items-center gap-2 text-sm ${
                              isDoctorEntry(entry) ? "cursor-pointer" : ""
                            }`}
                            onClick={() => {
                              if (isDoctorEntry(entry) && entry.authorUid) {
                                setSelectedDoctorUid(entry.authorUid);
                                setDoctorInfoDialogOpen(true);
                              }
                            }}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {name.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{name}</span>
                        </div>
                        )}
                        <Badge variant="outline" className="gap-1 text-xs">
                          <MoodIcon className={`h-3 w-3 ${moodIcons[entry.mood].color}`} />
                          {moodIcons[entry.mood].label}
                        </Badge>
                        {isDoctorEntry(entry) && (
                          <Badge variant="default" className="text-xs gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            طبيب
                          </Badge>
                        )}
                        {!entry.isPublic && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Lock className="h-3 w-3" />
                            خاصة
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>{timeStr}</span>
                        {user?.uid === entry.authorUid && !isBlurred && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEntryToDelete(entry.id);
                                setDeleteDialogOpen(true);
                              }}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                            <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                      </div>
                      </div>
                    </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      {!isBlurred && (
                      <div className="flex items-center gap-4 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLike(entry.id, likedBy)}
                          className={`gap-2 h-8 ${
                            isLiked ? "text-red-600" : ""
                              }`}
                              disabled={!user}
                            >
                          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                          <span className="text-xs">{likesCount}</span>
                            </Button>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MessageCircle className="h-4 w-4" />
                          <span>{commentsCountForEntry} تعليق</span>
                        </div>
                        </div>
                      )}
                      {!isBlurred && <DiaryComments entryId={entry.id} />}
                    </CardContent>
                  </Card>
              );
            })}
            </div>
          </AnimatePresence>
        </div>
        
        {(!entries || entries.length === 0) && (
          <div className="text-center py-8">
            <Card className="border">
              <CardContent className="py-8 space-y-3">
                <BookOpen className="h-12 w-12 text-primary mx-auto opacity-50" />
                <h3 className="text-lg font-bold">
                  {user ? "لا توجد منشورات بعد" : "سجّلي دخولك للبدء"}
                  </h3>
                <p className="text-sm text-muted-foreground">
                    {user 
                    ? "ابدأي بإضافة أول منشور" 
                    : "سجّلي دخولك لإضافة منشور والانضمام للمجتمع"}
                  </p>
                {user && (
                  <Button 
                    onClick={() => setIsAdding(true)} 
                    size="sm"
                    className="mt-2"
                  >
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة منشور
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنتِ متأكدة من حذف هذه اليومية؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setEntryToDelete(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doctor Info Dialog */}
      <Dialog open={doctorInfoDialogOpen} onOpenChange={setDoctorInfoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">
                    {doctorInfo?.name ? `د. ${doctorInfo.name}` : "معلومات الطبيب"}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    معلومات الطبيب والتخصص
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          {doctorInfo ? (
            <div className="space-y-6 py-4">
              {/* Years of Experience */}
              {doctorInfo.experienceYears && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="p-2 bg-blue-200/60 dark:bg-blue-900/50 rounded-lg">
                    <Briefcase className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">سنوات الخبرة</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{doctorInfo.experienceYears} سنة</p>
                  </div>
                </motion.div>
              )}

              {/* Education */}
              {doctorInfo.education && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                >
                  <div className="p-2 bg-purple-200/60 dark:bg-purple-900/50 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-purple-700 dark:text-purple-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">مكان الدراسة</p>
                    <p className="text-base text-purple-700 dark:text-purple-300">{doctorInfo.education}</p>
                  </div>
                </motion.div>
              )}

              {/* Specialization */}
              {doctorInfo.specialization && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
                >
                  <div className="p-2 bg-emerald-200/60 dark:bg-emerald-900/50 rounded-lg">
                    <Award className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">التخصص</p>
                    <p className="text-base font-medium text-emerald-700 dark:text-emerald-300">
                      {formatSpecialization(doctorInfo.specialization)}
                    </p>
                    {breastCancerSpecializations.find(s => s.value === doctorInfo.specialization)?.description && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        {breastCancerSpecializations.find(s => s.value === doctorInfo.specialization)?.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Bio */}
              {doctorInfo.bio && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">نبذة عن الطبيب</p>
                  </div>
                  <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                    {doctorInfo.bio}
                  </p>
                </motion.div>
              )}

              {!doctorInfo.experienceYears && !doctorInfo.education && !doctorInfo.specialization && !doctorInfo.bio && (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">لا توجد معلومات إضافية متاحة</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">جاري تحميل معلومات الطبيب...</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDoctorInfoDialogOpen(false);
              setSelectedDoctorUid(null);
              setDoctorInfo(null);
            }}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiaryComments({ entryId }: { entryId: string }) {
  const [comments, setComments] = useState<{ id: string; text: string; authorName?: string; showAsAnonymous?: boolean; createdAt: string }[]>([]);
  const [text, setText] = useState("");
  const [showAsAnonymous, setShowAsAnonymous] = useState(false);
  const { user } = useAuth();
  const isDoctor = getRole() === "doctor";
  
  useEffect(() => {
    const q = query(collection(firestoreDb, "diaryComments"), where("entryId", "==", entryId));
    const unsub = onSnapshot(q, (snap) => {
      const commentsData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      // Sort client-side by createdAt ascending
      commentsData.sort((a: any, b: any) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return aDate - bDate;
      });
      setComments(commentsData);
    }, (error) => {
      console.error("Error fetching comments:", error);
    });
    return () => unsub();
  }, [entryId]);

  const addComment = async () => {
    if (!text.trim() || !user) return;
    
    // Get author name from patients or doctors collection
    let authorName = "مجهول";
    try {
      if (isDoctor) {
        const doctorDoc = await getDoc(doc(firestoreDb, "doctors", user.uid));
        if (doctorDoc.exists()) {
          const doctorData = doctorDoc.data();
          authorName = `د. ${doctorData.name || user.displayName || user.email || "مجهول"}`;
        } else {
          authorName = user.displayName || user.email || "مجهول";
        }
      } else {
        const patientSnap = await getDocs(query(collection(firestoreDb, "patients"), where("uid", "==", user.uid)));
        if (!patientSnap.empty) {
          const patientData = patientSnap.docs[0].data();
          authorName = patientData.name || user.displayName || user.email || "مجهول";
        } else {
          authorName = user.displayName || user.email || "مجهول";
        }
      }
    } catch (error) {
      console.error("Error fetching author name:", error);
      authorName = user.displayName || user.email || "مجهول";
    }
    
    await addDoc(collection(firestoreDb, "diaryComments"), {
      entryId,
      text,
      authorUid: user.uid,
      authorName: showAsAnonymous ? "مجهول" : authorName,
      showAsAnonymous: showAsAnonymous || false,
      createdAt: new Date().toISOString(),
    });
    setText("");
    setShowAsAnonymous(false);
  };

  return (
    <div className="mt-4 space-y-4 pt-5 border-t border-border/50 bg-gradient-to-br from-muted/10 via-background/50 to-muted/10 rounded-xl p-5 -mx-6 relative">
      {/* Decorative border on hover */}
      <div className="absolute inset-0 rounded-xl border border-primary/0 hover:border-primary/20 transition-all duration-300 pointer-events-none" />
      
      <div className="flex items-center gap-2.5 text-sm font-bold text-foreground mb-3 px-2">
        <div className="p-1.5 bg-primary/10 rounded-lg">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          التعليقات ({comments.length})
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {comments.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -12, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.95 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className="group relative bg-gradient-to-br from-background to-background/80 p-4 rounded-xl border border-primary/10 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-300"
            >
              {/* Left accent bar */}
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/0 via-primary/40 to-primary/0 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center gap-3 mb-2.5">
                <Avatar className="h-8 w-8 border-2 border-primary/30 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <AvatarFallback className={`bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-bold ${c.showAsAnonymous ? "opacity-60" : ""}`}>
                    {(c.authorName || "م").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2.5 flex-1">
                  <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                    {c.authorName || "مجهول"}
                  </span>
                  {c.showAsAnonymous && (
                    <Badge variant="outline" className="h-5 px-2.5 text-xs border-muted-foreground/30 text-muted-foreground bg-muted/30">
                      <EyeOff className="h-3 w-3 ml-1" />
                      مجهول
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-medium bg-muted/30 px-2.5 py-1 rounded-full">
                  {new Date(c.createdAt).toLocaleDateString("ar-EG", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed pr-3 group-hover:text-foreground transition-colors duration-200">
                {c.text}
              </p>
            </motion.div>
          ))}
          {comments.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/30 to-background rounded-xl border-2 border-dashed border-primary/20"
            >
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary/40" />
              <p className="font-medium">لا توجد تعليقات بعد</p>
              <p className="text-xs mt-1">كن أول من يعلق! 💬</p>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
      {user && (
        <motion.div 
          className="space-y-4 pt-4 border-t border-border/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Input 
                placeholder="اكتبي تعليقاً مشجعاً ومحفزاً..." 
                value={text} 
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addComment();
                  }
                }}
                className="h-12 border-2 focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-all duration-200 bg-background/80 backdrop-blur-sm" 
              />
            </div>
            <motion.div whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.92 }}>
              <Button 
                size="default" 
                onClick={addComment} 
                disabled={!text.trim()}
                className="h-12 px-6 bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 ml-2" />
                <span className="font-semibold">إرسال</span>
              </Button>
            </motion.div>
          </div>
          <motion.div 
            className="flex items-center gap-3 bg-muted/30 hover:bg-muted/50 p-3 rounded-lg border border-border/50 transition-all duration-200 cursor-pointer"
            whileHover={{ x: -2 }}
            onClick={() => setShowAsAnonymous(!showAsAnonymous)}
          >
            <input
              type="checkbox"
              id={`anonymous-${entryId}`}
              checked={showAsAnonymous}
              onChange={(e) => setShowAsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-primary/40 text-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 cursor-pointer transition-all duration-200"
            />
            <Label 
              htmlFor={`anonymous-${entryId}`}
              className="text-sm text-foreground cursor-pointer flex items-center gap-2.5 font-medium"
            >
              <EyeOff className={`h-4 w-4 transition-colors duration-200 ${showAsAnonymous ? "text-primary" : "text-muted-foreground"}`} />
              <span>إرسال كـ مجهول</span>
            </Label>
          </motion.div>
        </motion.div>
      )}
      {!user && (
        <div className="text-center py-2">
          <Link href="/login">
            <Button variant="outline" size="sm" className="h-9">
              سجّلي الدخول للتعليق
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
