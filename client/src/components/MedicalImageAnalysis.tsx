import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon, X, Loader2, FileText, CheckCircle2, AlertCircle, Trash2, Edit2, Save, History, Eye } from "lucide-react";
import { auth, firestoreDb, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, where, orderBy } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Function to extract final diagnosis/result (direct answer: infected or not, stage, etc.)
// IMPORTANT: Extract from the END of the text, not the beginning
function extractSummary(text: string): string {
  if (!text) return "";
  
  // Keep markdown formatting - don't remove **
  const cleanText = text.replace(/#{1,6}\s*/g, "").trim();
  
  // Keywords that indicate diagnosis/result in Arabic
  const diagnosisKeywords = [
    "التشخيص",
    "النتيجة",
    "الحالة",
    "الخلاصة",
    "الاستنتاج",
    "التشخيص النهائي",
    "النتيجة النهائية",
    "الحالة النهائية",
    "الخلاصة النهائية",
    "التشخيص:",
    "النتيجة:",
    "الحالة:",
    "الخلاصة:",
    "التشخيص هو",
    "النتيجة هي",
    "الحالة هي",
    "الخلاصة هي",
    "التشخيص أن",
    "النتيجة أن",
    "الحالة أن"
  ];
  
  // Keywords that indicate health status
  const statusKeywords = [
    "مصاب",
    "غير مصاب",
    "طبيعي",
    "غير طبيعي",
    "سليم",
    "غير سليم",
    "إيجابي",
    "سلبي",
    "موجود",
    "غير موجود",
    "ظاهر",
    "غير ظاهر",
    "مرحلة",
    "درجة",
    "stage",
    "grade",
    "positive",
    "negative",
    "normal",
    "abnormal"
  ];
  
  // Split into sentences - keep original text with markdown
  const sentences = cleanText.split(/[.!?]\s+/).filter(s => s.trim() && s.length > 10);
  
  if (sentences.length === 0) {
    // Fallback: return last 300 characters
    return cleanText.length > 300 ? cleanText.substring(cleanText.length - 300).trim() : cleanText;
  }
  
  // FIRST PRIORITY: Search from the END backwards for diagnosis keywords
  for (let i = sentences.length - 1; i >= Math.max(0, sentences.length - 5); i--) {
    const sentence = sentences[i];
    for (const keyword of diagnosisKeywords) {
      if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
        // Found diagnosis keyword near the end, take this sentence and next 1-2 sentences
        const result = sentences.slice(i, Math.min(i + 3, sentences.length)).join(". ") + ".";
        return result.length > 400 ? result.substring(0, 400).trim() + "..." : result;
      }
    }
  }
  
  // SECOND PRIORITY: Search from the END backwards for sentences with both status and stage
  for (let i = sentences.length - 1; i >= Math.max(0, sentences.length - 5); i--) {
    const sentence = sentences[i];
    const hasStatus = /مصاب|غير مصاب|طبيعي|غير طبيعي|إيجابي|سلبي|positive|negative|normal|abnormal/i.test(sentence);
    const hasStage = /مرحلة|درجة|stage|grade/i.test(sentence);
    
    if (hasStatus && hasStage) {
      // This is likely the diagnosis! Take this and next sentence
      const result = sentences.slice(i, Math.min(i + 2, sentences.length)).join(". ") + ".";
      return result.length > 400 ? result.substring(0, 400).trim() + "..." : result;
    }
  }
  
  // THIRD PRIORITY: Search from the END backwards for status keywords
  for (let i = sentences.length - 1; i >= Math.max(0, sentences.length - 5); i--) {
    const sentence = sentences[i];
    for (const keyword of statusKeywords) {
      if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
        const hasStageInfo = /مرحلة|درجة|stage|grade/i.test(sentence);
        const hasStatusInfo = /مصاب|غير مصاب|طبيعي|غير طبيعي|إيجابي|سلبي|positive|negative|normal|abnormal/i.test(sentence);
        
        if (hasStatusInfo || hasStageInfo) {
          // Take this sentence and next 1-2 sentences
          const result = sentences.slice(i, Math.min(i + 3, sentences.length)).join(". ") + ".";
          return result.length > 400 ? result.substring(0, 400).trim() + "..." : result;
        }
      }
    }
  }
  
  // FOURTH PRIORITY: Take last 2-3 sentences (usually contains conclusion)
  if (sentences.length >= 2) {
    const lastSentences = sentences.slice(-2);
    const result = lastSentences.join(". ") + ".";
    return result.length > 400 ? result.substring(0, 400).trim() + "..." : result;
  }
  
  // Fallback: return last sentence
  if (sentences.length > 0) {
    return sentences[sentences.length - 1] + ".";
  }
  
  // Last fallback: return last 300 characters
  return cleanText.length > 300 ? cleanText.substring(cleanText.length - 300).trim() + "..." : cleanText;
}

// Function to get the detailed text (everything except the final conclusion)
function getDetailedText(text: string): string {
  if (!text) return "";
  
  const summary = extractSummary(text);
  if (!summary || summary.length === 0) return text;
  
  // Keep markdown formatting
  const cleanText = text.replace(/#{1,6}\s*/g, "").trim();
  
  // Try to find where the summary/conclusion starts (search from the end)
  const summaryClean = summary.replace("...", "").trim().replace(/\*\*/g, "");
  const cleanTextNoMarkdown = cleanText.replace(/\*\*/g, "");
  
  // Find the summary in the original text (search from the end)
  const summaryIndex = cleanTextNoMarkdown.toLowerCase().lastIndexOf(summaryClean.toLowerCase());
  
  if (summaryIndex !== -1 && summaryIndex > cleanTextNoMarkdown.length * 0.3) {
    // Summary found near the end, return everything before it (with markdown)
    return cleanText.substring(0, summaryIndex).trim();
  }
  
  // If summary is at the end (last sentences), remove them
  const sentences = cleanText.split(/[.!?]\s+/).filter(s => s.trim() && s.length > 15);
  if (sentences.length > 2) {
    // Remove last 2 sentences (the conclusion)
    return sentences.slice(0, -2).join(". ") + ".";
  }
  
  // Fallback: return original text if we can't separate
  return cleanText.length > summary.length ? cleanText : "";
}

// Function to remove duplicate sections and clean up text
function removeDuplicatesAndClean(text: string): string {
  if (!text) return "";
  
  // Remove duplicate "النتيجة النهائية" sections (keep only the last one)
  const lines = text.split('\n');
  const seenSections = new Set<string>();
  const cleanedLines: string[] = [];
  let lastSection = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      cleanedLines.push("");
      continue;
    }
    
    // Check if this is a section heading
    const isSectionHeading = /^(الموجودات|التحليل|التوصيات|النتيجة النهائية|الخلاصة|وصف الصورة|الملاحظات السريرية|الملاحظات غير الطبيعية|ماذا يظهر في الصورة)/i.test(line) ||
                            /^\*\*(الموجودات|التحليل|التوصيات|النتيجة النهائية|الخلاصة|وصف الصورة|الملاحظات السريرية|الملاحظات غير الطبيعية|ماذا يظهر في الصورة)/i.test(line);
    
    if (isSectionHeading) {
      const sectionKey = line.toLowerCase().replace(/\*\*/g, "").replace(/[:\s]/g, "");
      
      // If we've seen this section before and it's "النتيجة النهائية", skip duplicates
      if (sectionKey.includes("النتيجة") || sectionKey.includes("الخلاصة")) {
        if (seenSections.has("النتيجة النهائية")) {
          // Skip this duplicate, but keep track that we're in this section
          lastSection = "النتيجة النهائية";
          continue;
        }
        seenSections.add("النتيجة النهائية");
        lastSection = "النتيجة النهائية";
      } else if (seenSections.has(sectionKey)) {
        // Skip duplicate section
        continue;
      } else {
        seenSections.add(sectionKey);
        lastSection = sectionKey;
      }
    }
    
    cleanedLines.push(lines[i]);
  }
  
  // Remove duplicate sentences (especially conclusion sentences)
  let result = cleanedLines.join('\n');
  const sentences = result.split(/[.!?]\s+/);
  const uniqueSentences: string[] = [];
  const seenSentences = new Set<string>();
  
  for (const sentence of sentences) {
    const cleanSentence = sentence.trim().toLowerCase().replace(/\s+/g, ' ');
    if (cleanSentence.length > 20 && !seenSentences.has(cleanSentence)) {
      seenSentences.add(cleanSentence);
      uniqueSentences.push(sentence.trim());
    }
  }
  
  // Only use unique sentences if we removed duplicates
  if (uniqueSentences.length < sentences.length * 0.8) {
    result = uniqueSentences.join('. ') + '.';
  }
  
  return result;
}

// Function to format analysis text and convert Markdown to proper formatting
function formatAnalysisText(text: string): React.ReactNode[] {
  // Clean up duplicates first
  const cleanedText = removeDuplicatesAndClean(text);
  const lines = cleanedText.split('\n').filter(line => line.trim());
  const elements: React.ReactNode[] = [];
  let lastWasHeading = false;
  const seenHeadings = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }
    
    // Process line first - remove standalone * that are not part of **bold**
    let processedLine = line;
    if (processedLine.includes(' * ') && !processedLine.includes('**')) {
      // Remove standalone * that are surrounded by spaces
      processedLine = processedLine.replace(/\s+\*\s+/g, ' ');
    }
    
    // Check if it's a numbered list item (1., 2., etc.)
    const numberedMatch = processedLine.match(/^(\d+)\.\s*(.+)$/);
    if (numberedMatch) {
      const [, number, content] = numberedMatch;
      elements.push(
        <div key={`numbered-${i}`} className="flex gap-4 mb-4" dir="rtl" lang="ar">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
            {number}
          </span>
          <div className="flex-1 text-right">
            <p className="text-base leading-7 text-foreground/90" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
              {formatInlineMarkdown(content)}
            </p>
          </div>
        </div>
      );
      continue;
    }
    
    // Check if it's a bullet point (-, •, *, etc.) - but NOT ** (bold markdown)
    // First check if line starts with * but NOT **
    if (processedLine.startsWith('*') && !processedLine.startsWith('**')) {
      // Remove the leading * and clean up any extra * in the middle
      let content = processedLine.substring(1).trim();
      // Remove standalone * that are not part of **bold**
      content = content.replace(/\s+\*\s+/g, ' ').replace(/\s+\*$/g, '').replace(/^\*\s+/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex gap-4 mb-4" dir="rtl" lang="ar">
          <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary mt-2.5" />
          <div className="flex-1 text-right">
            <p className="text-base leading-7 text-foreground/90" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
              {formatInlineMarkdown(content)}
            </p>
          </div>
        </div>
      );
      continue;
    }
    
    // Check for other bullet points (-, •, etc.)
    const bulletMatch = processedLine.match(/^[-•]\s*(.+)$/);
    if (bulletMatch) {
      const [, content] = bulletMatch;
      elements.push(
        <div key={`bullet-${i}`} className="flex gap-4 mb-4" dir="rtl" lang="ar">
          <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary mt-2.5" />
          <div className="flex-1 text-right">
            <p className="text-base leading-7 text-foreground/90" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
              {formatInlineMarkdown(content)}
            </p>
          </div>
        </div>
      );
      continue;
    }
    
    // Check if it's a heading (starts with # or contains :)
    // Improved: Better detection of section headings
    const hasColon = processedLine.includes(':');
    const colonIndex = hasColon ? processedLine.indexOf(':') : -1;
    
    // Check if it's a heading: starts with #, or has : in first 60 chars, or line is short (< 80 chars) with :
    const isHeading = processedLine.startsWith('#') || 
                     (hasColon && colonIndex !== -1 && colonIndex < 60 && colonIndex > 0);
    
    if (isHeading) {
      // Split heading and content if both exist in same line
      let headingText = processedLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
      let contentAfterColon = '';
      
      if (hasColon && colonIndex !== -1) {
        headingText = processedLine.substring(0, colonIndex).replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        contentAfterColon = processedLine.substring(colonIndex + 1).trim();
      } else {
        headingText = headingText.replace(/:/g, '').trim();
      }
      
      // Remove common duplicates like "(Conclusion)" or "(Findings)"
      headingText = headingText.replace(/\s*\([^)]+\)\s*$/g, '').trim();
      
      // Check for duplicate headings
      const headingKey = headingText.toLowerCase().replace(/\s+/g, '');
      if (seenHeadings.has(headingKey) && (headingKey.includes('النتيجة') || headingKey.includes('الخلاصة'))) {
        // Skip duplicate conclusion headings
        continue;
      }
      seenHeadings.add(headingKey);
      
      // Add heading with better styling
      elements.push(
        <h3 key={`heading-${i}`} className="text-lg font-bold text-primary mb-2 mt-6 first:mt-0 text-right" dir="auto" style={{ wordSpacing: '0.1em' }}>
          {formatInlineMarkdown(headingText)}
        </h3>
      );
      
      lastWasHeading = true;
      
      // If there's content after the colon, add it as a paragraph
      if (contentAfterColon && contentAfterColon.length > 5) {
        // Clean up content
        let cleanContent = contentAfterColon;
        if (cleanContent.includes(' * ') && !cleanContent.includes('**')) {
          cleanContent = cleanContent.replace(/\s+\*\s+/g, ' ').replace(/\s+\*$/g, '').replace(/^\*\s+/, '');
        }
        elements.push(
          <p key={`heading-content-${i}`} className="text-base leading-7 text-foreground/90 mb-4 text-right pl-4 border-r-2 border-primary/20" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
            {formatInlineMarkdown(cleanContent)}
          </p>
        );
        lastWasHeading = false;
      }
      continue;
    }
    
    // Regular paragraph - improved spacing
    // Clean up any standalone * that are not part of **bold**
    let cleanLine = processedLine;
    if (cleanLine.includes(' * ') && !cleanLine.includes('**')) {
      cleanLine = cleanLine.replace(/\s+\*\s+/g, ' ').replace(/\s+\*$/g, '').replace(/^\*\s+/, '');
    }
    
    // Remove incomplete sentences (lines ending with "..." or "-" or ":" without content)
    if (cleanLine.match(/^[:\-\.\s]+$/) || cleanLine.match(/^\.\.\.\s*$/) || cleanLine.match(/^-\s*$/)) {
      continue; // Skip incomplete lines
    }
    
    // Skip lines that are just punctuation or very short fragments
    if (cleanLine.length < 5 && /^[:\-\.\s،،]+$/.test(cleanLine)) {
      continue;
    }
    
    // If previous line was a heading, reduce top margin for better grouping
    const topMargin = lastWasHeading ? 'mt-2' : '';
    lastWasHeading = false;
    
    // Check if line contains multiple sections separated by colons (like "Title: content. Title2: content2")
    // Split by pattern: word(s) followed by colon, then content until next word(s) colon
    if (cleanLine.includes(':') && cleanLine.length > 80) {
      // Count how many colons are in the line
      const colonCount = (cleanLine.match(/:/g) || []).length;
      
      // If there are multiple colons, try to split into sections
      if (colonCount > 1) {
        // Pattern: "Label: content" where content ends before next "Label:" or end of string
        // Look for pattern: text ending with : followed by content, then another text ending with :
        const sectionPattern = /([^:]+?):\s*([^:]+?)(?=\s+[^:]+?:|$)/g;
        const sections: Array<{label: string, content: string}> = [];
        let lastIndex = 0;
        let match;
        let foundSections = 0;
        
        while ((match = sectionPattern.exec(cleanLine)) !== null) {
          if (match.index > lastIndex) {
            // Add text before first match
            const beforeText = cleanLine.substring(lastIndex, match.index).trim();
            if (beforeText && beforeText.length > 3) {
              sections.push({ label: '', content: beforeText });
            }
          }
          
          const label = match[1].trim();
          const content = match[2].trim();
          
          // Only add if label is reasonable length (not too long) and content exists
          if (label.length < 50 && content.length > 3) {
            sections.push({ label, content });
            foundSections++;
          }
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text after last match
        if (lastIndex < cleanLine.length) {
          const remainingText = cleanLine.substring(lastIndex).trim();
          if (remainingText && remainingText.length > 3) {
            sections.push({ label: '', content: remainingText });
          }
        }
        
        // If we found multiple sections, render them separately
        if (foundSections > 1) {
          sections.forEach((section, sectionIdx) => {
            if (section.label) {
              // This is a labeled section
              elements.push(
                <div key={`section-${i}-${sectionIdx}`} className={`mb-4 ${sectionIdx === 0 ? topMargin : ''}`}>
                  <h4 className="text-base font-bold text-primary mb-2 text-right" dir="auto">
                    {formatInlineMarkdown(section.label)}:
                  </h4>
                  <p className="text-base leading-7 text-foreground/90 mb-4 text-right pl-4 border-r-2 border-primary/20" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
                    {formatInlineMarkdown(section.content)}
                  </p>
                </div>
              );
            } else if (section.content) {
              // Regular content
              elements.push(
                <p key={`section-content-${i}-${sectionIdx}`} className="text-base leading-7 text-foreground/90 mb-4 text-right" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
                  {formatInlineMarkdown(section.content)}
                </p>
              );
            }
          });
          continue;
        }
      }
    }
    
    // Check if line contains : in the middle (not a heading, but has colon)
    // Split into parts if needed for better formatting
    if (cleanLine.includes(':') && cleanLine.length > 50) {
      const colonPos = cleanLine.indexOf(':');
      // If colon is in the middle (not at start/end), consider splitting
      if (colonPos > 10 && colonPos < cleanLine.length - 10) {
        const beforeColon = cleanLine.substring(0, colonPos).trim();
        const afterColon = cleanLine.substring(colonPos + 1).trim();
        
        // If before colon is short (likely a label), format it as bold
        if (beforeColon.length < 40 && afterColon.length > 5) {
          elements.push(
            <div key={`para-${i}`} className={`mb-4 ${topMargin}`}>
              <h4 className="text-base font-bold text-primary mb-2 text-right" dir="auto">
                {formatInlineMarkdown(beforeColon)}:
              </h4>
              <p className="text-base leading-7 text-foreground/90 mb-4 text-right pl-4 border-r-2 border-primary/20" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
                {formatInlineMarkdown(afterColon)}
              </p>
            </div>
          );
          continue;
        }
      }
    }
    
    elements.push(
      <p key={`para-${i}`} className={`text-base leading-7 text-foreground/90 mb-4 ${topMargin} text-right`} dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
        {formatInlineMarkdown(cleanLine)}
      </p>
    );
  }
  
  return elements;
}

// Function to format inline Markdown (bold, italic, etc.) with proper RTL/LTR handling
function formatInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  
  // Clean up standalone * that are not part of **bold** markdown
  // First, protect ** patterns, then remove standalone *, then restore **
  let cleanText = text;
  // Temporarily replace ** with a placeholder
  const boldPlaceholder = '___BOLD_PLACEHOLDER___';
  cleanText = cleanText.replace(/\*\*/g, boldPlaceholder);
  // Remove standalone * (surrounded by spaces or at word boundaries)
  cleanText = cleanText.replace(/\s+\*\s+/g, ' ').replace(/\s+\*$/g, '').replace(/^\*\s+/, '');
  // Restore ** patterns
  cleanText = cleanText.replace(new RegExp(boldPlaceholder, 'g'), '**');
  // Clean up multiple spaces
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let lastIndex = 0;
  
  // Pattern for **bold** text (non-greedy to handle multiple instances)
  const boldPattern = /\*\*([^*]+?)\*\*/g;
  let match;
  
  // Find all bold matches
  const matches: Array<{ start: number; end: number; content: string }> = [];
  while ((match = boldPattern.exec(cleanText)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1]
    });
  }
  
  // If no matches, return original text with proper direction and spacing
  if (matches.length === 0) {
    return [<span key="text-0" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>{text}</span>];
  }
  
  // Build parts array
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    
    // Add text before the match
    if (currentMatch.start > lastIndex) {
      const beforeText = cleanText.substring(lastIndex, currentMatch.start);
      if (beforeText) {
        parts.push(
          <span key={`text-${currentIndex++}`} dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
            {beforeText}
          </span>
        );
      }
    }
    
    // Add bold text
    parts.push(
      <strong key={`bold-${currentIndex++}`} className="font-bold text-foreground" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
        {currentMatch.content}
      </strong>
    );
    
    lastIndex = currentMatch.end;
  }
  
  // Add remaining text after last match
  if (lastIndex < cleanText.length) {
    const remainingText = cleanText.substring(lastIndex);
    if (remainingText) {
      parts.push(
        <span key={`text-${currentIndex++}`} dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>
          {remainingText}
        </span>
      );
    }
  }
  
  return parts.length > 0 ? parts : [<span key="text-0" dir="auto" style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}>{cleanText}</span>];
}

// Structured JSON response from AI
interface AnalysisResponse {
  finalResult: string;
  biRads: string;
  findings: {
    breastDensity: string;
    masses: string;
    calcifications: string;
    asymmetry: string;
  };
  detailedAnalysis: string;
  recommendations: string[];
}

interface AnalysisResult {
  id?: string;
  imageUrl: string;
  analysis: string; // Can be JSON string or plain text
  timestamp: Date;
  imageType: string;
  customName?: string;
  doctorId: string;
  createdAt?: string;
}

// Helper function to parse JSON analysis result
const parseAnalysisResult = (resultString: string): AnalysisResponse | null => {
  if (!resultString || !resultString.trim()) return null;
  
  try {
    // Remove markdown code blocks if present
    let cleanText = resultString.replace(/```json|```/g, '').trim();
    
    // Try to find JSON object in the text (might have text before/after)
    // Look for the first { and last } to extract JSON
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      // Extract JSON part
      const jsonPart = cleanText.substring(firstBrace, lastBrace + 1);
      
      // Try to parse
      const parsed = JSON.parse(jsonPart);
      
      // Validate structure
      if (parsed.finalResult && parsed.biRads !== undefined && parsed.findings && parsed.detailedAnalysis && parsed.recommendations) {
        console.log("✅ Successfully parsed JSON analysis");
        return parsed as AnalysisResponse;
      } else {
        console.warn("⚠️ JSON structure incomplete:", Object.keys(parsed));
      }
    } else {
      // Try parsing the whole string as JSON
      const parsed = JSON.parse(cleanText);
      if (parsed.finalResult && parsed.biRads !== undefined && parsed.findings && parsed.detailedAnalysis && parsed.recommendations) {
        console.log("✅ Successfully parsed JSON analysis (full string)");
        return parsed as AnalysisResponse;
      }
    }
    
    return null;
  } catch (e) {
    console.error("❌ Failed to parse JSON analysis:", e);
    console.error("Raw text preview:", resultString.substring(0, 200));
    return null;
  }
};

export function MedicalImageAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageType, setImageType] = useState<"mammogram" | "xray" | "other">("mammogram");
  const [savedAnalyses, setSavedAnalyses] = useState<AnalysisResult[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = auth.currentUser;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPG, PNG أو WEBP");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Load saved analyses from Firestore - Real-time listener
  useEffect(() => {
    if (!user?.uid) {
      setSavedAnalyses([]);
      return;
    }

    console.log("📥 Loading saved analyses from Firestore for doctor:", user.uid);

    // Try with orderBy first, fallback to without orderBy if it fails
    let q = query(
      collection(firestoreDb, "medicalImageAnalyses"),
      where("doctorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("✅ Received", snapshot.docs.length, "analyses from Firestore");
        const analyses = snapshot.docs.map((doc) => {
          const data = doc.data();
          const analysis: AnalysisResult = {
            id: doc.id,
            imageUrl: data.imageUrl || "",
            analysis: data.analysis || "",
            imageType: data.imageType || "other",
            doctorId: data.doctorId || user.uid,
            customName: data.customName || null,
            timestamp: data.createdAt ? new Date(data.createdAt) : new Date(),
            createdAt: data.createdAt || new Date().toISOString(),
          };
          console.log("📋 Loaded analysis:", {
            id: analysis.id,
            imageType: analysis.imageType,
            hasAnalysis: !!analysis.analysis,
            hasImageUrl: !!analysis.imageUrl,
            createdAt: analysis.createdAt,
          });
          return analysis;
        });
        
        // Sort by createdAt descending (in case orderBy fails)
        analyses.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.timestamp).getTime();
          const dateB = new Date(b.createdAt || b.timestamp).getTime();
          return dateB - dateA;
        });
        
        setSavedAnalyses(analyses);
        console.log("✅ Saved analyses updated:", analyses.length, "items");
      },
      (error: any) => {
        console.error("❌ Error loading saved analyses:", error);
        console.error("Error code:", error?.code);
        console.error("Error message:", error?.message);
        
        // If orderBy fails, try without it
        if (error?.code === "failed-precondition") {
          console.log("⚠️ OrderBy failed, trying without orderBy...");
          const qWithoutOrder = query(
            collection(firestoreDb, "medicalImageAnalyses"),
            where("doctorId", "==", user.uid)
          );
          
          const unsubscribe2 = onSnapshot(
            qWithoutOrder,
            (snapshot) => {
              console.log("✅ Received", snapshot.docs.length, "analyses (without orderBy)");
              const analyses = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  imageUrl: data.imageUrl || "",
                  analysis: data.analysis || "",
                  imageType: data.imageType || "other",
                  doctorId: data.doctorId || user.uid,
                  customName: data.customName || null,
                  timestamp: data.createdAt ? new Date(data.createdAt) : new Date(),
                  createdAt: data.createdAt || new Date().toISOString(),
                } as AnalysisResult;
              });
              
              // Sort manually
              analyses.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.timestamp).getTime();
                const dateB = new Date(b.createdAt || b.timestamp).getTime();
                return dateB - dateA;
              });
              
              setSavedAnalyses(analyses);
            },
            (err) => {
              console.error("❌ Error loading without orderBy:", err);
              setSavedAnalyses([]);
            }
          );
          
          return () => unsubscribe2();
        } else {
          setSavedAnalyses([]);
        }
      }
    );

    return () => {
      console.log("🔄 Unsubscribing from Firestore listener");
      unsubscribe();
    };
  }, [user?.uid]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      const token = await user.getIdToken();

      // Create FormData
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("imageType", imageType);

      // Send to backend
      const response = await fetch("/api/analyze-medical-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "خطأ في الخادم" }));
        throw new Error(errorData.error || "فشل تحليل الصورة");
      }

      const data = await response.json();

      console.log("📥 Received analysis response:", {
        hasImageUrl: !!data.imageUrl,
        hasAnalysis: !!data.analysis,
        imageType: data.imageType,
        success: data.success,
      });

      const result: AnalysisResult = {
        imageUrl: data.imageUrl || "",
        analysis: data.analysis || "",
        timestamp: new Date(),
        imageType: imageType,
        doctorId: user.uid,
      };

      console.log("📋 Prepared result for display:", {
        hasImageUrl: !!result.imageUrl,
        hasAnalysis: !!result.analysis,
        imageType: result.imageType,
        doctorId: result.doctorId,
      });

      setAnalysisResult(result);

      // Save to Firestore automatically - CRITICAL: Must save for history
      try {
        // Ensure we have all required fields
        if (!data.analysis || !data.analysis.trim()) {
          console.warn("⚠️ No analysis text to save");
        }
        
        const analysisData = {
          imageUrl: data.imageUrl || "",
          analysis: data.analysis || "",
          imageType: imageType,
          doctorId: user.uid,
          createdAt: new Date().toISOString(),
          customName: null,
        };

        console.log("💾 Saving analysis to Firestore...", {
          doctorId: user.uid,
          imageType,
          analysisLength: data.analysis?.length || 0,
          hasImageUrl: !!data.imageUrl,
          hasAnalysis: !!data.analysis,
          createdAt: analysisData.createdAt,
          fullData: analysisData,
        });

        const docRef = await addDoc(collection(firestoreDb, "medicalImageAnalyses"), analysisData);
        
        console.log("✅ Analysis saved successfully to Firestore!");
        console.log("📋 Document ID:", docRef.id);
        console.log("📋 Saved data:", {
          id: docRef.id,
          doctorId: analysisData.doctorId,
          imageType: analysisData.imageType,
          createdAt: analysisData.createdAt,
          hasImageUrl: !!analysisData.imageUrl,
          analysisLength: analysisData.analysis.length,
        });
        
        // The onSnapshot listener will automatically update savedAnalyses
        // Wait a moment and check if it appears
        setTimeout(() => {
          console.log("🔍 Checking if analysis appears in savedAnalyses...");
          // This will be logged by the onSnapshot listener
        }, 1000);
      } catch (saveError: any) {
        console.error("❌ Error saving analysis to Firestore:", saveError);
        console.error("Error details:", {
          code: saveError?.code,
          message: saveError?.message,
          stack: saveError?.stack,
        });
        
        // Check if it's a permissions error
        if (saveError?.code === "permission-denied") {
          console.error("⚠️ Permission denied - check Firestore rules for medicalImageAnalyses");
          alert("تم التحليل بنجاح، لكن لا توجد صلاحيات لحفظ السجل. يرجى التحقق من إعدادات الصلاحيات.\n\nError: " + saveError.message);
        } else if (saveError?.code === "failed-precondition") {
          console.error("⚠️ Index missing - need to create Firestore index");
          alert("تم التحليل بنجاح، لكن يحتاج Firestore إلى إنشاء index. يرجى التحقق من console للحصول على رابط إنشاء الـ index.");
        } else {
          // Show user-friendly error but don't block the analysis result
          alert("تم التحليل بنجاح، لكن حدث خطأ في حفظ السجل.\n\nError: " + (saveError?.message || "خطأ غير معروف") + "\n\nيمكنك رؤية النتيجة الآن.");
        }
      }
    } catch (err: any) {
      console.error("Error analyzing image:", err);
      setError(err.message || "حدث خطأ أثناء تحليل الصورة");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (analysisId: string) => {
    if (!analysisId) return;

    try {
      await deleteDoc(doc(firestoreDb, "medicalImageAnalyses", analysisId));
      setDeleteDialogOpen(false);
      setAnalysisToDelete(null);
      if (selectedAnalysis?.id === analysisId) {
        setSelectedAnalysis(null);
      }
    } catch (error) {
      console.error("Error deleting analysis:", error);
      alert("حدث خطأ أثناء حذف التحليل");
    }
  };

  const handleRename = async (analysisId: string, newName: string) => {
    if (!analysisId || !newName.trim()) return;

    try {
      await updateDoc(doc(firestoreDb, "medicalImageAnalyses", analysisId), {
        customName: newName.trim(),
      });
      setRenameDialogOpen(false);
      setEditingName(null);
      setNewName("");
      if (selectedAnalysis?.id === analysisId) {
        setSelectedAnalysis({ ...selectedAnalysis, customName: newName.trim() });
      }
    } catch (error) {
      console.error("Error renaming analysis:", error);
      alert("حدث خطأ أثناء إعادة التسمية");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6" dir="rtl" lang="ar">
      {/* Main Analysis Card */}
      <Card className="border-2 border-primary/20 shadow-lg" dir="rtl" lang="ar">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <CardTitle className="flex items-center gap-3 text-2xl text-right">
            <div className="p-2 bg-primary/20 rounded-lg">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <span>تحليل الصور الطبية بالذكاء الاصطناعي</span>
          </CardTitle>
          <CardDescription className="text-base mt-2 text-right">
            قم برفع صورة أشعة أو ماموجرام للحصول على تحليل مبدئي باستخدام الذكاء الاصطناعي المتقدم
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-4 w-4" />
              <span>السجل</span>
              {savedAnalyses.length > 0 && (
                <Badge variant="secondary" className="mr-1 bg-primary/20 text-primary">
                  {savedAnalyses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>تحليل جديد</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-6 mt-6">
        {/* Image Type Selection */}
        <div className="space-y-3" dir="rtl" lang="ar">
          <Label className="text-base font-semibold flex items-center gap-2 text-right">
            <span>نوع الصورة الطبية</span>
          </Label>
          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              variant={imageType === "mammogram" ? "default" : "outline"}
              size="lg"
              onClick={() => setImageType("mammogram")}
              className={`gap-2 flex-1 min-w-[120px] ${
                imageType === "mammogram" 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-primary/10"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              ماموجرام
            </Button>
            <Button
              variant={imageType === "xray" ? "default" : "outline"}
              size="lg"
              onClick={() => setImageType("xray")}
              className={`gap-2 flex-1 min-w-[120px] ${
                imageType === "xray" 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-primary/10"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              أشعة X-Ray
            </Button>
            <Button
              variant={imageType === "other" ? "default" : "outline"}
              size="lg"
              onClick={() => setImageType("other")}
              className={`gap-2 flex-1 min-w-[120px] ${
                imageType === "other" 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-primary/10"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              أخرى
            </Button>
          </div>
        </div>

        {/* File Upload - Enhanced */}
        <div className="space-y-3" dir="rtl" lang="ar">
          <Label className="text-base font-semibold flex items-center gap-2 text-right">
            <span>رفع الصورة</span>
          </Label>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          {!selectedFile ? (
            <Label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center gap-4 p-8 border-3 border-dashed border-primary/40 rounded-xl cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 bg-gradient-to-br from-primary/5 to-transparent"
            >
              <div className="p-4 bg-primary/20 rounded-full">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center" dir="rtl" lang="ar">
                <p className="text-lg font-semibold text-foreground mb-1">
                  اضغط لاختيار الصورة أو اسحبها هنا
                </p>
                <p className="text-sm text-muted-foreground">
                  الصيغ المدعومة: JPG, PNG, WEBP (حد أقصى 10 ميجابايت)
                </p>
              </div>
            </Label>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border-2 border-primary/20"
            >
              <div className="p-2 bg-primary/20 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} ميجابايت
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Preview - Enhanced */}
        {preview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative border-3 border-primary/30 rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-muted/50 to-muted"
          >
            <div className="relative">
              <img
                src={preview}
                alt="معاينة الصورة"
                className="w-full h-auto max-h-[400px] object-contain"
              />
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/20 to-transparent p-3">
                <Badge className="bg-primary/90 text-primary-foreground">
                  {imageType === "mammogram" && "ماموجرام"}
                  {imageType === "xray" && "أشعة X-Ray"}
                  {imageType === "other" && "صورة طبية"}
                </Badge>
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute bottom-3 left-3 bg-background/90 hover:bg-background shadow-lg"
                onClick={handleReset}
                title="إزالة الصورة"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Analyze Button - Enhanced */}
        {selectedFile && !analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full gap-3 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جاري تحليل الصورة...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5" />
                  <span>بدء التحليل بالذكاء الاصطناعي</span>
                </>
              )}
            </Button>
            {isAnalyzing && (
              <p className="text-center text-sm text-muted-foreground mt-3" dir="rtl" lang="ar">
                قد يستغرق التحليل بضع ثوانٍ...
              </p>
            )}
          </motion.div>
        )}

        {/* Analysis Result */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 mt-6"
            >
              {/* Success Header - Enhanced */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-4 p-5 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-950/40 dark:via-emerald-950/40 dark:to-green-950/40 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-md"
                dir="rtl"
                lang="ar"
              >
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full shadow-lg flex-shrink-0">
                  <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-xl text-green-900 dark:text-green-100 mb-1">
                    ✅ تم التحليل بنجاح
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2 flex-wrap justify-end">
                    <Badge variant="outline" className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700" dir="rtl">
                      {imageType === "mammogram" && "ماموجرام"}
                      {imageType === "xray" && "أشعة X-Ray"}
                      {imageType === "other" && "صورة طبية"}
                    </Badge>
                    <span>•</span>
                    <span>
                      {analysisResult.timestamp.toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}{" "}
                      {analysisResult.timestamp.toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </p>
                </div>
              </motion.div>

              {/* Analysis Result Card - Enhanced */}
              <Card className="bg-gradient-to-br from-background via-primary/5 to-background border-2 border-primary/30 shadow-2xl" dir="rtl" lang="ar">
                <CardHeader className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-b-2">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/30 rounded-xl shadow-md flex-shrink-0">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 text-right">
                      <CardTitle className="text-2xl font-bold text-foreground">نتيجة التحليل</CardTitle>
                      <CardDescription className="mt-2 text-base text-right">
                        تحليل مبدئي باستخدام الذكاء الاصطناعي المتقدم
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6" dir="rtl" lang="ar">
                  {(() => {
                    // Try to parse as JSON first
                    const parsedData = parseAnalysisResult(analysisResult.analysis);
                    
                    if (parsedData) {
                      // Display structured JSON data
                      return (
                        <div className="space-y-6">
                          {/* Final Result & BI-RADS */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-50 dark:from-blue-950/40 dark:via-blue-950/30 dark:to-blue-950/40 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-md"
                          >
                            <div className="flex items-start gap-3 mb-4">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 text-right">
                                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">النتيجة النهائية</h3>
                                <p className="text-base leading-7 text-gray-800 dark:text-gray-200 mb-3" dir="auto">
                                  {formatInlineMarkdown(parsedData.finalResult)}
                                </p>
                                <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                  BI-RADS: {parsedData.biRads}
                                </div>
                              </div>
                            </div>
                          </motion.div>

                          {/* Findings Grid */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <Card className="border-2 border-primary/20">
                              <CardHeader className="font-bold text-gray-700 dark:text-gray-300 text-right pb-2">
                                كثافة الثدي
                              </CardHeader>
                              <CardContent className="text-right text-sm leading-6" dir="auto">
                                {formatInlineMarkdown(parsedData.findings.breastDensity)}
                              </CardContent>
                            </Card>
                            <Card className="border-2 border-primary/20">
                              <CardHeader className="font-bold text-gray-700 dark:text-gray-300 text-right pb-2">
                                الكتل
                              </CardHeader>
                              <CardContent className="text-right text-sm leading-6" dir="auto">
                                {formatInlineMarkdown(parsedData.findings.masses)}
                              </CardContent>
                            </Card>
                            <Card className="border-2 border-primary/20">
                              <CardHeader className="font-bold text-gray-700 dark:text-gray-300 text-right pb-2">
                                التكلسات
                              </CardHeader>
                              <CardContent className="text-right text-sm leading-6" dir="auto">
                                {formatInlineMarkdown(parsedData.findings.calcifications)}
                              </CardContent>
                            </Card>
                            <Card className="border-2 border-primary/20">
                              <CardHeader className="font-bold text-gray-700 dark:text-gray-300 text-right pb-2">
                                التشوه المعماري
                              </CardHeader>
                              <CardContent className="text-right text-sm leading-6" dir="auto">
                                {formatInlineMarkdown(parsedData.findings.asymmetry)}
                              </CardContent>
                            </Card>
                          </motion.div>

                          {/* Detailed Analysis Accordion */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <Accordion type="single" collapsible className="w-full" dir="rtl">
                              <AccordionItem value="details" className="border-2 border-primary/20 rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-bold text-right hover:no-underline">
                                  التحليل التفصيلي الكامل
                                </AccordionTrigger>
                                <AccordionContent className="text-right text-base leading-7 text-gray-600 dark:text-gray-300 pt-4" dir="auto">
                                  {formatInlineMarkdown(parsedData.detailedAnalysis)}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </motion.div>

                          {/* Recommendations */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-gradient-to-br from-green-50 via-green-50/80 to-green-50 dark:from-green-950/40 dark:via-green-950/30 dark:to-green-950/40 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-md"
                            dir="rtl"
                            lang="ar"
                          >
                            <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-4 text-right">التوصيات الطبية</h3>
                            <ul className="space-y-3 text-right" dir="rtl" style={{ listStyle: 'none', paddingRight: '0' }}>
                              {parsedData.recommendations.map((rec, index) => (
                                <li key={index} className="text-base leading-7 text-gray-800 dark:text-gray-200 flex items-start gap-3" dir="rtl">
                                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mt-2.5" />
                                  <span className="flex-1 text-right" dir="auto">
                                    {formatInlineMarkdown(rec)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        </div>
                      );
                    } else {
                      // Fallback to old text-based display
                      return (
                        <>
                          {/* Final Result/Conclusion Section */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="mb-6"
                          >
                            <div className="bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 p-6 rounded-xl border-2 border-primary/30 shadow-md">
                              <div className="flex items-start gap-3 mb-4">
                                <div className="p-2 bg-primary/30 rounded-lg flex-shrink-0">
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground text-right flex-1">النتيجة النهائية</h3>
                              </div>
                              <div className="space-y-3 text-right" dir="rtl" lang="ar">
                                {extractSummary(analysisResult.analysis)
                                  .split(/[.!?]\s+/)
                                  .filter(s => s.trim() && s.length > 5)
                                  .map((sentence, idx) => (
                                    <p 
                                      key={idx} 
                                      className="text-base leading-7 text-foreground/95 font-medium mb-3 last:mb-0" 
                                      dir="auto"
                                      style={{ wordSpacing: '0.1em', letterSpacing: '0.01em' }}
                                    >
                                      {formatInlineMarkdown(sentence.trim() + (sentence.trim().match(/[.!?]$/) ? '' : '.'))}
                                    </p>
                                  ))}
                              </div>
                            </div>
                          </motion.div>

                          {/* Detailed Analysis Section */}
                          {getDetailedText(analysisResult.analysis) && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <div className="bg-gradient-to-br from-muted/60 via-muted/50 to-muted/40 p-6 rounded-xl border-2 border-primary/20 shadow-inner">
                                <div className="flex items-start gap-3 mb-5">
                                  <div className="p-2 bg-muted/50 rounded-lg flex-shrink-0">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <h3 className="text-xl font-bold text-foreground text-right flex-1">التفاصيل الكاملة</h3>
                                </div>
                                <div className="space-y-4" dir="rtl" lang="ar">
                                  {formatAnalysisText(getDetailedText(analysisResult.analysis)).map((element, index) => (
                                    <motion.div
                                      key={index}
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.03, duration: 0.3 }}
                                      className="mb-4 last:mb-0"
                                    >
                                      {element}
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </>
                      );
                    }
                  })()}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3" dir="rtl">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 gap-2 border-2 hover:bg-primary/10"
                  dir="rtl"
                >
                  <ImageIcon className="h-4 w-4" />
                  تحليل صورة جديدة
                </Button>
                {analysisResult.imageUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(analysisResult.imageUrl, "_blank")}
                    className="flex-1 gap-2 border-2 hover:bg-primary/10"
                    dir="rtl"
                  >
                    <ImageIcon className="h-4 w-4" />
                    عرض الصورة الأصلية
                  </Button>
                )}
              </div>

              {/* Important Notice */}
              <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" dir="rtl" lang="ar">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <AlertDescription className="text-sm font-medium text-amber-900 dark:text-amber-100 text-right">
                  <strong className="block mb-1">⚠️ ملاحظة مهمة:</strong>
                  <span className="block">
                    هذا التحليل مبدئي ولا يُغني عن مراجعة الطبيب المختص. 
                    يجب مراجعة النتائج مع طبيب متخصص قبل اتخاذ أي قرارات طبية.
                  </span>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
          </TabsContent>

          <TabsContent value="history" className="mt-6" dir="rtl" lang="ar">
            {savedAnalyses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
                dir="rtl"
                lang="ar"
              >
                <div className="p-6 bg-muted/50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <History className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2 text-right">لا توجد تحليلات محفوظة</h3>
                <p className="text-muted-foreground text-right">سيتم حفظ التحليلات تلقائياً بعد إجرائها</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {savedAnalyses.map((analysis, index) => (
                  <motion.div
                    key={analysis.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-2 border-primary/20 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-200 bg-card"
                    dir="rtl"
                    lang="ar"
                  >
                    <Card className="border-0">
                      <CardHeader className="pb-4 bg-gradient-to-r from-muted/50 to-transparent" dir="rtl" lang="ar">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAnalysis(analysis);
                                setRenameDialogOpen(true);
                                setNewName(analysis.customName || "");
                              }}
                              className="h-9 w-9 hover:bg-primary/10"
                              title="إعادة تسمية"
                              dir="rtl"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAnalysisToDelete(analysis.id!);
                                setDeleteDialogOpen(true);
                              }}
                              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="حذف"
                              dir="rtl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={selectedAnalysis?.id === analysis.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedAnalysis(selectedAnalysis?.id === analysis.id ? null : analysis)}
                              className="gap-2"
                              dir="rtl"
                            >
                              <Eye className="h-4 w-4" />
                              {selectedAnalysis?.id === analysis.id ? "إخفاء" : "عرض"}
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <CardTitle className="text-lg flex items-center gap-3 flex-wrap mb-2 justify-end">
                              <span className="font-bold text-foreground">
                                {analysis.customName || (
                                  <>
                                    {analysis.imageType === "mammogram" && "ماموجرام"}
                                    {analysis.imageType === "xray" && "أشعة X-Ray"}
                                    {analysis.imageType === "other" && "صورة طبية"}
                                  </>
                                )}
                              </span>
                              <Badge variant="outline" className="bg-primary/10 border-primary/30" dir="rtl">
                                {analysis.imageType === "mammogram" && "ماموجرام"}
                                {analysis.imageType === "xray" && "أشعة X-Ray"}
                                {analysis.imageType === "other" && "أخرى"}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 text-sm justify-end">
                              <span>📅</span>
                              <span>
                                {analysis.timestamp.toLocaleDateString("ar-EG", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric"
                                })}{" "}
                                {analysis.timestamp.toLocaleTimeString("ar-EG", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      {selectedAnalysis?.id === analysis.id && (
                        <CardContent className="pt-0 border-t bg-muted/20" dir="rtl" lang="ar">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 space-y-4"
                          >
                            {analysis.imageUrl && (
                              <div className="rounded-xl overflow-hidden border-2 border-primary/30 shadow-md">
                                <img
                                  src={analysis.imageUrl}
                                  alt="صورة التحليل"
                                  className="w-full h-auto max-h-80 object-contain bg-muted"
                                />
                              </div>
                            )}
                            <div className="bg-gradient-to-br from-muted/60 via-muted/50 to-muted/40 p-6 rounded-xl border-2 border-primary/20" dir="rtl" lang="ar">
                              {(() => {
                                // Try to parse as JSON first (same as new analysis)
                                const parsedData = parseAnalysisResult(analysis.analysis);
                                
                                if (parsedData) {
                                  // Display structured JSON data (same format as new analysis)
                                  return (
                                    <div className="space-y-6">
                                      {/* Final Result & BI-RADS */}
                                      <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-50 dark:from-blue-950/40 dark:via-blue-950/30 dark:to-blue-950/40 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-md"
                                      >
                                        <div className="flex items-start gap-3 mb-4">
                                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
                                            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                          </div>
                                          <div className="flex-1 text-right">
                                            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">النتيجة النهائية</h3>
                                            <p className="text-base leading-7 text-gray-800 dark:text-gray-200 mb-3" dir="auto">
                                              {formatInlineMarkdown(parsedData.finalResult)}
                                            </p>
                                            <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                              BI-RADS: {parsedData.biRads}
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>

                                      {/* Findings Grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className="border-2 border-primary/20">
                                          <CardHeader className="font-bold text-gray-700 dark:text-gray-300 text-right pb-2">
                                            كثافة الثدي
                                          </CardHeader>
                                          <CardContent className="text-right text-sm leading-6" dir="auto">
                                            {formatInlineMarkdown(parsedData.findings.breastDensity)}
                                          </CardContent>
                                        </Card>
                                        <Card className="border-2 border-primary/20">
                                          <CardHeader className="font-bold text-gray-700 dark:text-gray-300 text-right pb-2">
                                            الكتل
                                          </CardHeader>
                                          <CardContent className="text-right text-sm leading-6" dir="auto">
                                            {formatInlineMarkdown(parsedData.findings.masses)}
                                          </CardContent>
                                        </Card>
                                        <Card className="border-2 border-primary/20">
                                          <CardHeader className="font-bold text-gray-700 dark:text-gray-300 text-right pb-2">
                                            التكلسات
                                          </CardHeader>
                                          <CardContent className="text-right text-sm leading-6" dir="auto">
                                            {formatInlineMarkdown(parsedData.findings.calcifications)}
                                          </CardContent>
                                        </Card>
                                        <Card className="border-2 border-primary/20">
                                          <CardHeader className="font-bold text-gray-700 dark:text-gray-300 text-right pb-2">
                                            التشوه المعماري
                                          </CardHeader>
                                          <CardContent className="text-right text-sm leading-6" dir="auto">
                                            {formatInlineMarkdown(parsedData.findings.asymmetry)}
                                          </CardContent>
                                        </Card>
                                      </div>

                                      {/* Detailed Analysis Accordion */}
                                      <div>
                                        <Accordion type="single" collapsible className="w-full" dir="rtl">
                                          <AccordionItem value="details" className="border-2 border-primary/20 rounded-lg px-4">
                                            <AccordionTrigger className="text-lg font-bold text-right hover:no-underline">
                                              التحليل التفصيلي الكامل
                                            </AccordionTrigger>
                                            <AccordionContent className="text-right text-base leading-7 text-gray-600 dark:text-gray-300 pt-4" dir="auto">
                                              {formatInlineMarkdown(parsedData.detailedAnalysis)}
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      </div>

                                      {/* Recommendations */}
                                      <div className="bg-gradient-to-br from-green-50 via-green-50/80 to-green-50 dark:from-green-950/40 dark:via-green-950/30 dark:to-green-950/40 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-md" dir="rtl" lang="ar">
                                        <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-4 text-right">التوصيات الطبية</h3>
                                        <ul className="space-y-3 text-right" dir="rtl" style={{ listStyle: 'none', paddingRight: '0' }}>
                                          {parsedData.recommendations.map((rec, index) => (
                                            <li key={index} className="text-base leading-7 text-gray-800 dark:text-gray-200 flex items-start gap-3" dir="rtl">
                                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mt-2.5" />
                                              <span className="flex-1 text-right" dir="auto">
                                                {formatInlineMarkdown(rec)}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Fallback to old text-based display
                                  return (
                                    <div className="space-y-4">
                                      {formatAnalysisText(analysis.analysis).map((element, index) => (
                                        <div key={index} className="mb-4 last:mb-0 text-right">
                                          {element}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          </motion.div>
                        </CardContent>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog - Enhanced */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent dir="rtl" lang="ar" className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-destructive/20 rounded-full">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl">تأكيد الحذف</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base">
                هل أنت متأكد من حذف هذا التحليل؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setAnalysisToDelete(null);
              }} className="gap-2">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (analysisToDelete) {
                    handleDelete(analysisToDelete);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rename Dialog - Enhanced */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent dir="rtl" lang="ar" className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Edit2 className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-xl">إعادة تسمية التحليل</DialogTitle>
              </div>
              <DialogDescription className="text-base">
                أدخل اسماً مخصصاً لهذا التحليل (مثلاً: اسم المريض)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">الاسم الجديد</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: مريضة - سارة أحمد"
                  className="text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim() && selectedAnalysis?.id) {
                      handleRename(selectedAnalysis.id, newName);
                    }
                  }}
                  dir="rtl"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRenameDialogOpen(false);
                  setNewName("");
                  setSelectedAnalysis(null);
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (selectedAnalysis?.id && newName.trim()) {
                    handleRename(selectedAnalysis.id, newName);
                  }
                }}
                disabled={!newName.trim()}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
    </div>
  );
}

