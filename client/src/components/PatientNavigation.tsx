import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { 
  Heart, 
  Menu, 
  X, 
  Stethoscope, 
  UserCircle, 
  Home, 
  Shield, 
  BookOpen, 
  NotebookPen,
  MessageCircle,
  HelpCircle,
  Calendar,
  CalendarDays,
  Sparkles,
  ChevronDown,
  Building2
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { getRole } from "@/lib/authRole";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Heart;
  description?: string;
}

const mainNavItems: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/risk-assessment", label: "تقييم المخاطر", icon: Shield },
  { href: "/education", label: "مكتبة التوعية", icon: BookOpen },
  { href: "/diary", label: "يومياتي", icon: NotebookPen },
  { href: "/#medical-centers-map", label: "المراكز الطبية", icon: Building2 },
];

const secondaryNavItems: NavItem[] = [
  { href: "/appointments", label: "المواعيد", icon: Calendar, description: "إدارة مواعيدك" },
  { href: "/calendar", label: "التقويم", icon: CalendarDays, description: "عرض التقويم الشهري" },
  { href: "/chat", label: "المساعد الذكي", icon: MessageCircle, description: "محادثة مباشرة" },
  { href: "/support", label: "الدعم والمساعدة", icon: HelpCircle, description: "الأسئلة الشائعة" },
];

export function PatientNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Track hash changes
  useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash);
    };
    
    // Check hash on mount and location change
    updateHash();
    window.addEventListener('hashchange', updateHash);
    
    return () => {
      window.removeEventListener('hashchange', updateHash);
    };
  }, [location]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/">
            <motion.div 
              className="flex items-center gap-2.5 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Heart className="h-7 w-7 sm:h-8 sm:w-8 text-primary fill-primary group-hover:scale-110 transition-transform duration-200" />
                <motion.div
                  className="absolute inset-0 rounded-full bg-pink-500/20 blur-xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                رفيق الأمل
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isHashLink = item.href.includes('#');
              const hashFromHref = isHashLink ? item.href.split('#')[1] : null;
              const isActive = isHashLink 
                ? location === '/' && currentHash === `#${hashFromHref}`
                : location === item.href;
              const handleClick = (e: React.MouseEvent) => {
                if (isHashLink) {
                  e.preventDefault();
                  if (location === '/') {
                    // إذا كان المستخدم في الصفحة الرئيسية، انتقل مباشرة
                    const elementId = item.href.replace('/#', '');
                    const element = document.getElementById(elementId);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Update hash after scrolling
                      setTimeout(() => {
                        window.history.replaceState(null, '', `/#${elementId}`);
                        setCurrentHash(`#${elementId}`);
                      }, 100);
                    }
                  } else {
                    // إذا كان في صفحة أخرى، انتقل إلى الرئيسية ثم انتظر قليلاً ثم انتقل للقسم
                    window.location.href = item.href;
                  }
                }
              };
              return (
                <Link key={item.href} href={item.href} onClick={handleClick}>
                  <motion.div
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                      isActive
                        ? "text-primary bg-primary/10 shadow-sm"
                        : "text-foreground/80 hover:text-primary hover:bg-muted/50"
                    )}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`link-nav-${item.label}`}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                        layoutId="activeTab"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}

            {/* More Menu Dropdown */}
            <div className="relative">
              <motion.button
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  showMoreMenu
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-foreground/80 hover:text-primary hover:bg-muted/50"
                )}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">المزيد</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", showMoreMenu && "rotate-180")} />
              </motion.button>

              <AnimatePresence>
                {showMoreMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMoreMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 right-0 w-64 bg-background border rounded-xl shadow-xl p-2 z-20"
                    >
                      {secondaryNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link key={item.href} href={item.href}>
                            <motion.div
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-muted cursor-pointer",
                                location === item.href && "bg-primary/10 text-primary"
                              )}
                              onClick={() => setShowMoreMenu(false)}
                              whileHover={{ x: -4 }}
                            >
                              <Icon className="h-4 w-4" />
                              <div className="flex-1">
                                <div className="font-medium">{item.label}</div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground">{item.description}</div>
                                )}
                              </div>
                            </motion.div>
                          </Link>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {user && getRole() === 'patient' && (
              <Link href="/profile">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary ml-1.5 text-sm"
                    title="الحساب الشخصي"
                  >
                    <UserCircle className="h-4 w-4 text-primary shrink-0" />
                    <span className="hidden xl:inline whitespace-nowrap">الحساب الشخصي</span>
                    <span className="xl:hidden whitespace-nowrap">الحساب</span>
                  </Button>
                </motion.div>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Doctor Access Button - Only visible for logged-in doctors */}
            {user && getRole() === 'doctor' && (
              <Link href="/doctor">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary hidden sm:flex text-sm"
                    title="لوحة الأطباء"
                  >
                    <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                    <span className="hidden lg:inline whitespace-nowrap">لوحة التحكم</span>
                  </Button>
                </motion.div>
              </Link>
            )}
            <ThemeToggle />
            {user ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                className="hidden sm:flex text-sm whitespace-nowrap"
              >
                تسجيل الخروج
              </Button>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-sm whitespace-nowrap">دخول</Button>
                </Link>
                <Link href="/signup/choose">
                  <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-sm whitespace-nowrap">
                    تسجيل
                  </Button>
                </Link>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden border-t overflow-hidden"
            >
              <div className="py-4 space-y-1">
                {/* Main Navigation Items */}
                <div className="space-y-1 px-2">
                  {mainNavItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isHashLink = item.href.includes('#');
                    const hashFromHref = isHashLink ? item.href.split('#')[1] : null;
                    const isActive = isHashLink 
                      ? location === '/' && currentHash === `#${hashFromHref}`
                      : location === item.href;
                    const handleClick = (e: React.MouseEvent) => {
                      setMobileMenuOpen(false);
                      if (isHashLink) {
                        e.preventDefault();
                        if (location === '/') {
                          // إذا كان المستخدم في الصفحة الرئيسية، انتقل مباشرة
                          const elementId = item.href.replace('/#', '');
                          setTimeout(() => {
                            const element = document.getElementById(elementId);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              // Update hash after scrolling
                              setTimeout(() => {
                                window.history.replaceState(null, '', `/#${elementId}`);
                                setCurrentHash(`#${elementId}`);
                              }, 100);
                            }
                          }, 100);
                        } else {
                          // إذا كان في صفحة أخرى، انتقل إلى الرئيسية ثم انتظر قليلاً ثم انتقل للقسم
                          window.location.href = item.href;
                        }
                      }
                    };
                    return (
                      <Link key={item.href} href={item.href} onClick={handleClick}>
                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer",
                            isActive
                              ? "text-primary bg-primary/10 border-r-2 border-primary shadow-sm"
                              : "text-foreground/80 hover:text-primary hover:bg-muted/50"
                          )}
                          data-testid={`link-mobile-${item.label}`}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="border-t my-2" />

                {/* Secondary Navigation Items */}
                <div className="space-y-1 px-2">
                  {secondaryNavItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: (mainNavItems.length + idx) * 0.05 }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 cursor-pointer",
                            isActive
                              ? "text-primary bg-primary/10 border-r-2 border-primary shadow-sm"
                              : "text-foreground/80 hover:text-primary hover:bg-muted/50"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          <div className="flex-1">
                            <div className="font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>

                {/* User Actions */}
                <div className="border-t pt-2 mt-2 px-2 space-y-2">
                  {user && getRole() === 'patient' && (
                    <Link href="/profile">
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all cursor-pointer",
                          location === '/profile'
                            ? "text-primary bg-primary/10 border-r-2 border-primary"
                            : "text-foreground hover:text-primary hover:bg-muted"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <UserCircle className="h-5 w-5" />
                        الحساب الشخصي
                      </motion.div>
                    </Link>
                  )}
                  {/* Doctor Access */}
                  {user && getRole() === 'doctor' && (
                    <Link href="/doctor">
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all text-foreground hover:text-primary hover:bg-muted cursor-pointer"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Stethoscope className="h-5 w-5" />
                        لوحة التحكم
                      </motion.div>
                    </Link>
                  )}
                  {!user && (
                    <>
                      <Link href="/login">
                        <Button variant="outline" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          دخول
                        </Button>
                      </Link>
                      <Link href="/signup/choose">
                        <Button 
                          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          تسجيل حساب جديد
                        </Button>
                      </Link>
                    </>
                  )}
                  {user && (
                    <Button 
                      variant="outline" 
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      تسجيل الخروج
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
