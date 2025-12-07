import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// قائمة الأماكن المشهورة في مصر (بدون تكرار)
const egyptianPlaces = [
  // المحافظات
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الدقهلية",
  "الشرقية",
  "المنوفية",
  "القليوبية",
  "كفر الشيخ",
  "الغربية",
  "البحيرة",
  "الإسماعيلية",
  "السويس",
  "بورسعيد",
  "شمال سيناء",
  "جنوب سيناء",
  "دمياط",
  "الفيوم",
  "بني سويف",
  
  // مناطق القاهرة
  "مصر الجديدة",
  "المعادي",
  "مدينة نصر",
  "الزمالك",
  "شبرا",
  "المقطم",
  "العباسية",
  "عين شمس",
  "حدائق القبة",
  "الدقي",
  "المهندسين",
  "المنيل",
  "روض الفرج",
  "السيدة زينب",
  "الفسطاط",
  "الوايلي",
  
  // مناطق الجيزة
  "العجوزة",
  "إمبابة",
  "فيصل",
  "السادس من أكتوبر",
  "الشيخ زايد",
  "الأهرامات",
  
  // مناطق الإسكندرية
  "المنتزه",
  "سيدي بشر",
  "سيدي جابر",
  "سان ستيفانو",
  "الإبراهيمية",
  "محطة الرمل",
  "الجمرك",
  "أبو قير",
  
  // مناطق أخرى
  "المنصورة",
  "طنطا",
  "الزقازيق",
  "بنها",
  "السادات",
  "العاشر من رمضان",
  "نجع حمادي",
];

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "أدخلي عنوانك",
  className,
  icon,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (!inputValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = inputValue.toLowerCase();
    const matched = egyptianPlaces.filter((place) =>
      place.toLowerCase().includes(query) || query.includes(place.toLowerCase())
    );

    setSuggestions(matched.slice(0, 8)); // عرض أول 8 نتائج
    setShowSuggestions(matched.length > 0);
    setFocusedIndex(-1);
  };

  const handleSelect = (place: string) => {
    onChange(place);
    setShowSuggestions(false);
    setFocusedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[focusedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        {icon || <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />}
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "pr-11 h-12 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all",
            showSuggestions && "rounded-b-none"
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setShowSuggestions(false);
              inputRef.current?.focus();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-background border-2 border-primary/20 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            <div className="p-2 space-y-1">
              {suggestions.map((place, index) => (
                <motion.button
                  key={`${place}-${index}`}
                  type="button"
                  onClick={() => handleSelect(place)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={cn(
                    "w-full text-right px-4 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2",
                    focusedIndex === index
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                  whileHover={{ x: -4 }}
                >
                  <MapPin className={cn(
                    "h-4 w-4",
                    focusedIndex === index ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="flex-1 text-right">{place}</span>
                </motion.button>
              ))}
            </div>
            <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
              اضغطي Enter للاختيار أو Esc للإلغاء
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

