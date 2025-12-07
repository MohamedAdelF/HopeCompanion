import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, X, Bot, Loader2, Sparkles, Trash2, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/AuthProvider";
import { firestoreDb, collection, addDoc, getDocs, auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export function ChatbotWidget() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "مرحباً بك! أنا مساعدك الذكي في رفيق الأمل. كيف يمكنني مساعدتك اليوم؟",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // find patientId for logged-in user
  useEffect(() => {
    (async () => {
      if (!user) return setPatientId(null);
      const fs = await import("@/lib/firebase");
      const snap = await fs.getDocs(fs.query(fs.collection(fs.firestoreDb, "patients"), fs.where("uid", "==", user.uid)));
      const first = snap.docs[0];
      setPatientId(first ? first.id : null);
    })();
  }, [user]);

  // Keep helper bubble until the user dismisses it manually

  // auto-scroll to latest message when open or list updates (only inside chatbot, not page)
  useEffect(() => {
    if (!isOpen) return;
    // Use setTimeout to ensure the scroll happens after the widget is rendered
    const timeoutId = setTimeout(() => {
      if (endRef.current) {
        // Find the ScrollArea container and scroll within it
        const scrollArea = document.getElementById('chatbot-scroll-area');
        if (scrollArea) {
          const scrollContainer = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer && endRef.current) {
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth'
            });
          }
        } else {
          // Fallback: use scrollIntoView with block: "nearest" to prevent page scroll
          endRef.current.scrollIntoView({ 
            behavior: "smooth", 
            block: "nearest",
            inline: "nearest"
          });
        }
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isOpen]);

  // Hide widget on chat page
  if (location === "/chat") {
    return null;
  }

  const quickSuggestions = [
    "أشعر بالقلق، ماذا أفعل؟",
    "ما هو الفحص الذاتي الشهري؟",
    "هل أحتاج موعد متابعة قريب؟",
  ];

  const detectIntent = (text: string): "emergency" | "other" => {
    const t = text.toLowerCase();
    const danger = ["ألم", "كتلة", "نز", "نزيف", "افراز", "خدر", "تورم", "أحمر", "حرارة", "مستمر", "يزداد"];
    if (danger.some((k) => text.includes(k))) return "emergency";
    if (/(pain|lump|bleeding|discharge|numb|swelling|red|fever|persistent)/i.test(t)) return "emergency";
    return "other";
  };

  const handleSendMessage = async (content?: string) => {
    const textToSend = (content ?? message).trim();
    if (!textToSend || isSending) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setMessage("");
    setIsSending(true);
    setIsTyping(true);

    try {
      // Simulate thinking time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Provide rich canned responses for quick suggestions; fallback to API
      const suggestionMap: Record<string, string> = {
        "أشعر بالقلق، ماذا أفعل؟": "جرّبي تمرين تنفّس: شهيق 4 ثوانٍ، حبس 4، زفير 6. كرّري لدقيقتين. إن استمر القلق، احجزي موعد متابعة." ,
        "ما هو الفحص الذاتي الشهري؟": "الفحص الذاتي يتم بعد انتهاء الدورة بـ 3-5 أيام: أمام المرآة وتحت الدش مع تحسّس دائري لطيف. إن لاحظتِ أي تغيّر راجعي الطبيب." ,
        "هل أحتاج موعد متابعة قريب؟": "إن كان لديك نتيجة تقييم مرتفعة أو أعراض جديدة (ألم مستمر/كتلة/إفراز)، ينصح بحجز موعد خلال أسبوع." ,
      };
      const canned = suggestionMap[textToSend];
      let replyText = canned;
      if (!replyText) {
        const intent = detectIntent(textToSend);
        if (intent === "emergency") {
          replyText = "بما أنكِ ذكرتِ عرضاً مقلقاً، يُنصح بحجز موعد متابعة قريب. إن كان الألم شديداً أو ظهرت تغيّرات واضحة، تواصلي مع الطبيب فوراً.";
          if (patientId) {
            await addDoc(collection(firestoreDb, "alerts"), {
              patientId,
              type: "symptom",
              message: "ذُكرت أعراض مقلقة في المحادثة — يُنصح بالمتابعة.",
              status: "open",
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          // Get authentication token
          if (!auth.currentUser) {
            replyText = "يجب تسجيل الدخول أولاً لاستخدام المساعد الذكي.";
          } else {
            try {
              const token = await auth.currentUser.getIdToken();
              const res = await fetch("/api/coach", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                },
                credentials: "include",
                body: JSON.stringify({ message: textToSend }),
              });
              
              if (res.ok) {
          const data = (await res.json()) as { reply: string };
          replyText = data.reply;
              } else {
                replyText = "حدث خطأ أثناء التواصل مع المساعد الذكي. يرجى المحاولة مرة أخرى.";
              }
            } catch (error) {
              console.error("Error calling coach API:", error);
              replyText = "حدث خطأ أثناء التواصل مع المساعد الذكي. يرجى المحاولة مرة أخرى.";
            }
          }
        }
      }
      
      // Additional delay for typing effect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        sender: "bot",
        timestamp: new Date(),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botResponse]);
      
      // persist conversation snippet for doctor if user is mapped to patient
      // فقط حفظ رسالة المريض، رد الـ bot لا يُحفظ كرسالة من طبيب لأنه ليس طبيب حقيقي
      if (patientId) {
        try {
          await addDoc(collection(firestoreDb, "messages"), {
            patientId,
            text: textToSend,
            from: "patient",
            status: "unread",
            createdAt: new Date().toISOString(),
            type: "chat",
          });
          // لا نحفظ رد الـ bot كرسالة من طبيب لأنه لا يمر بقواعد Firebase
          // الـ bot ليس طبيب حقيقي والرسالة لا يمكن أن تمر بقواعد isPatientAssignedToDoctor
        } catch (error) {
          console.error("Error saving chat message:", error);
          // لا نمنع المحادثة إذا فشل حفظ الرسالة
        }
      }
    } catch {
      setIsTyping(false);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "تعذر الاتصال الآن. حاولي مرة أخرى لاحقاً.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "1",
        text: "مرحباً بك! أنا مساعدك الذكي في رفيق الأمل. كيف يمكنني مساعدتك اليوم؟",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {!isOpen && (
        <>
          <AnimatePresence>
            {showNudge && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="fixed bottom-24 right-6 z-50"
              >
                <div className="relative bg-gradient-to-r from-pink-500 to-purple-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium backdrop-blur-sm border border-white/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>هل تحتاجين مساعدة؟</span>
                  </div>
                  <button 
                    aria-label="إخفاء" 
                    className="absolute -top-2 -left-2 bg-white/20 hover:bg-white/30 rounded-full w-6 h-6 flex items-center justify-center transition-colors backdrop-blur-sm" 
                    onClick={() => setShowNudge(false)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="w-0 h-0 border-l-8 border-l-transparent border-t-8 border-t-purple-600 border-r-8 border-r-transparent ml-auto mr-6" />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 18 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
          >
            <motion.div 
              animate={{ y: [0, -8, 0] }} 
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                aria-label="فتح المساعد الذكي"
                size="icon"
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 hover:from-pink-600 hover:via-purple-600 hover:to-pink-700 text-white border-2 border-white/20 backdrop-blur-sm transition-all duration-300"
                onClick={() => { setIsOpen(true); setShowNudge(false); }}
                data-testid="button-chatbot-open"
              >
                <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
              </Button>
            </motion.div>
          </motion.div>
        </>
      )}

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Card className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-[calc(100vw-2rem)] sm:max-w-96 h-[calc(100vh-8rem)] sm:h-auto max-h-[650px] shadow-2xl z-50 flex flex-col overflow-hidden border-2 border-purple-200/50 dark:border-purple-900/50 bg-background/95 backdrop-blur-sm" data-testid="card-chatbot" dir="rtl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-b border-purple-200/50 dark:border-purple-800/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-purple-200 dark:ring-purple-800">
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    مساعدك الذكي
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">أنا هنا لمساعدتك</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearChat}
                  className="h-8 w-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20"
                  title="مسح المحادثة"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full"
                  data-testid="button-chatbot-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-3 p-4 pt-3 overflow-hidden">
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {quickSuggestions.map((q, idx) => (
                    <motion.div
                      key={q}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Button 
                        key={q} 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleSendMessage(q)}
                        className="rounded-full text-xs h-auto py-2 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 transition-all"
                        disabled={isSending}
                      >
                        {q}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            
            <ScrollArea className="flex-1 pr-2 overflow-y-auto min-h-[200px]" id="chatbot-scroll-area">
              <div className="space-y-3 py-2">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx === messages.length - 1 ? 0.1 : 0 }}
                      className={cn("flex gap-3", msg.sender === "user" ? "flex-row-reverse" : "")}
                    >
                      {msg.sender === "bot" && (
                        <Avatar className="h-8 w-8 flex-shrink-0 mt-1 ring-2 ring-purple-200/50 dark:ring-purple-800/50">
                          <AvatarFallback className="bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-purple-600 dark:text-purple-400">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <motion.div
                        initial={{ opacity: 0, x: msg.sender === "user" ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={cn(
                          "rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-lg backdrop-blur-sm",
                          msg.sender === "user"
                            ? "bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 text-white rounded-tr-sm border border-white/20"
                            : "bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-950/40 dark:via-pink-950/30 dark:to-purple-950/50 text-foreground border-2 border-purple-200/60 dark:border-purple-800/60 rounded-tl-sm shadow-purple-200/50 dark:shadow-purple-900/20"
                        )}
                        data-testid={`message-${msg.sender}-${msg.id}`}
                      >
                        <div className="whitespace-pre-wrap break-words text-right font-medium" dir="rtl" lang="ar">
                        {msg.text}
                        </div>
                        <div className={cn(
                          "text-xs mt-2 opacity-60 flex items-center gap-1",
                          msg.sender === "user" ? "text-white/70" : "text-muted-foreground"
                        )}>
                          <Clock className="h-3 w-3" />
                          {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                  
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 items-start"
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-purple-200/50 dark:ring-purple-800/50">
                        <AvatarFallback className="bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-purple-600 dark:text-purple-400">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl rounded-tl-sm px-4 py-3 border border-purple-200/50 dark:border-purple-800/50">
                        <div className="flex gap-1.5">
                          <motion.div
                            className="w-2 h-2 bg-purple-500 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-pink-500 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-purple-500 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="flex gap-2 items-center pt-2 border-t border-purple-200/50 dark:border-purple-800/50">
              <Input
                placeholder="اكتبي سؤالك هنا..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                className="rounded-full font-body flex-1 bg-background border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-right"
                data-testid="input-chatbot-message"
                disabled={isSending}
                dir="rtl"
                lang="ar"
              />
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                className="rounded-full flex-shrink-0 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg transition-all disabled:opacity-50"
                data-testid="button-chatbot-send"
                disabled={!message.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="flex gap-2 justify-center pt-2">
              <Link href="/risk-assessment">
                <Button variant="ghost" size="sm" className="text-xs rounded-full h-8 px-3 hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  <Sparkles className="h-3 w-3 ml-1" />
                  تقييم المخاطر
                </Button>
              </Link>
              <Link href="/doctor">
                <Button variant="ghost" size="sm" className="text-xs rounded-full h-8 px-3 hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  <Clock className="h-3 w-3 ml-1" />
                  التواصل مع الطبيب
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}
    </>
  );
}
