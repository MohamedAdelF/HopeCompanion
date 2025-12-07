import type { Express } from "express";
import { Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { diaryEntrySchema, patientSchema, riskAssessmentInputSchema, alertSchema, type RiskAssessmentResult } from "@shared/schema";
import { authenticateToken, requireAdmin, optionalAuthenticate } from "./middleware/auth";
import { uploadLimiter, aiLimiter, authLimiter } from "./middleware/security";

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Initialize Firebase Admin (lazy initialization)
async function getAdminStorage() {
  try {
    const admin = await import("firebase-admin");
    if (!admin.apps.length) {
      // Try to initialize with service account or use Application Default Credentials
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || 'pinkhopecompanion'}.firebasestorage.app`,
        });
      } catch (err: any) {
        // If service account not found, try with explicit credentials from env
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || 'pinkhopecompanion'}.firebasestorage.app`,
          });
        } else {
          console.warn("⚠️ Firebase Admin not initialized. File uploads will use alternative method.");
          return null;
        }
      }
    }
    if (admin.apps.length) {
      return admin.storage();
    }
    return null;
  } catch (err) {
    console.warn("⚠️ Firebase Admin not available:", err);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Seed a demo patient if none exists
  if ((await storage.listPatients()).length === 0) {
    await storage.upsertPatient({
      name: "مريضة تجريبية",
      age: 42,
      status: "متابعة",
      nextAppointment: "2025-11-15",
      riskLevel: "منخفض",
    });
  }

  // Patients - Require authentication
  app.get("/api/patients", authenticateToken, async (_req: Request, res: Response) => {
    const patients = await storage.listPatients();
    res.json(patients);
  });

  app.post("/api/patients", authenticateToken, async (req: Request, res: Response) => {
    const parse = patientSchema.omit({ id: true }).partial({ nextAppointment: true }).safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: "بيانات غير صالحة" });
    const created = await storage.upsertPatient(parse.data);
    res.status(201).json(created);
  });

  // Diary entries - Require authentication
  app.get("/api/diary", authenticateToken, async (req: Request, res: Response) => {
    const patientId = (req.query.patientId as string) || (await storage.listPatients())[0]?.id;
    if (!patientId) return res.json([]);
    const entries = await storage.listDiary(patientId);
    res.json(entries);
  });

  function simpleSentiment(text: string): number {
    const positives = ["جيد", "تحسن", "سعيد", "ممتاز", "أفضل", "قوي", "أمل"];
    const negatives = ["تعب", "ألم", "حزين", "سيء", "قلق", "خوف", "إرهاق"];
    const tokens = text.split(/\s+/);
    let score = 0;
    for (const t of tokens) {
      if (positives.some(p => t.includes(p))) score += 1;
      if (negatives.some(n => t.includes(n))) score -= 1;
    }
    return Math.max(-1, Math.min(1, score / Math.max(1, tokens.length / 10)));
  }

  app.post("/api/diary", authenticateToken, async (req: Request, res: Response) => {
    const body = req.body as Partial<{ patientId: string; content: string; mood: "happy"|"neutral"|"sad"; date?: string }>;
    const patientId = body.patientId || (await storage.listPatients())[0]?.id;
    if (!patientId || !body.content) return res.status(400).json({ message: "patientId and content required" });
    const entry = diaryEntrySchema.omit({ id: true, sentimentScore: true }).parse({
      patientId,
      content: body.content,
      mood: body.mood ?? "neutral",
      date: body.date ?? new Date().toISOString(),
    });
    const sentiment = simpleSentiment(entry.content);
    const saved = await storage.addDiary({ ...entry, sentimentScore: sentiment });
    // generate alert for negative sentiment or sad mood
    if (sentiment < -0.2 || entry.mood === "sad") {
      await storage.addAlert({
        patientId,
        type: "sentiment",
        message: "مؤشر نفسي منخفض في اليوميات — يُنصح بالمتابعة.",
      });
    }
    res.status(201).json(saved);
  });

  // Risk assessment
  function computeRiskLevel(score: number): "منخفض"|"متوسط"|"مرتفع" {
    if (score <= 3) return "منخفض";
    if (score <= 6) return "متوسط";
    return "مرتفع";
  }

  app.post("/api/assessments", authenticateToken, async (req: Request, res: Response) => {
    const parsed = riskAssessmentInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "بيانات غير صالحة" });
    const { patientId, answers } = parsed.data;
    let score = 0;
    const add = (n: number) => { score += n; };
    switch (answers["age"]) {
      case "under40": add(1); break;
      case "40-50": add(2); break;
      case "50-60": add(3); break;
      case "over60": add(4); break;
    }
    switch (answers["family"]) {
      case "no": add(0); break;
      case "distant": add(2); break;
      case "close": add(4); break;
    }
    switch (answers["lifestyle"]) {
      case "yes": add(0); break;
      case "sometimes": add(1); break;
      case "no": add(2); break;
    }
    const level = computeRiskLevel(score);
    const recommendations: string[] = [
      "الفحص الذاتي الشهري للثدي",
      "زيارة الطبيب للفحص السنوي",
      "الحفاظ على نمط حياة صحي",
    ];
    if (score > 6) recommendations.push("يُنصح بإجراء فحص ماموجرام في أقرب وقت");
    const result: Omit<RiskAssessmentResult, "id"|"createdAt"> = {
      patientId,
      score,
      level,
      recommendations,
    };
    const saved = await storage.addAssessment(result);
    if (saved.level === "مرتفع") {
      await storage.addAlert({
        patientId: saved.patientId,
        type: "risk",
        message: "مستوى الخطر مرتفع — يُنصح بمتابعة عاجلة.",
      });
    }
    res.status(201).json(saved);
  });

  // Alerts API - Require authentication
  app.get("/api/alerts", authenticateToken, async (_req: Request, res: Response) => {
    const alerts = await storage.listAlerts();
    res.json(alerts);
  });

  app.post("/api/alerts/:id/resolve", authenticateToken, async (req: Request, res: Response) => {
    const updated = await storage.resolveAlert(req.params.id);
    if (!updated) return res.status(404).json({ message: "غير موجود" });
    res.json(updated);
  });

  // File upload endpoint (bypasses CORS by uploading from server) - Require authentication + rate limiting
  app.post("/api/upload-file", uploadLimiter, authenticateToken, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "لم يتم إرسال ملف" });
      }

      const { patientId, doctorId, fileType, certType, description, title, uploadedBy } = req.body;
      
      // Determine file path based on whether it's a patient file or doctor certificate
      const isDoctorCert = !!doctorId;
      const userId = isDoctorCert ? doctorId : patientId;
      
      if (!userId || !uploadedBy) {
        return res.status(400).json({ error: "patientId/doctorId و uploadedBy مطلوبان" });
      }

      // Try Firebase Admin first
      const adminStorageInstance = await getAdminStorage();
      if (adminStorageInstance) {
        try {
          // Get bucket name from env or use default
          const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 
                            `${process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'pinkhopecompanion'}.firebasestorage.app`;
          const bucket = adminStorageInstance.bucket(bucketName);
          const timestamp = Date.now();
          const folderPath = isDoctorCert ? 'doctorCertificates' : 'patientFiles';
          const fileName = `${folderPath}/${userId}/${timestamp}_${file.originalname}`;
          const fileRef = bucket.file(fileName);

          // Upload file
          const metadata: any = {
            contentType: file.mimetype || 'application/octet-stream',
            metadata: {
              uploadedBy,
            },
          };
          
          if (isDoctorCert) {
            metadata.metadata.doctorId = doctorId;
            metadata.metadata.certType = certType || 'academic';
            metadata.metadata.title = title || '';
            metadata.metadata.description = description || '';
          } else {
            metadata.metadata.patientId = patientId;
            metadata.metadata.fileType = fileType || 'other';
            metadata.metadata.description = description || '';
          }

          await fileRef.save(file.buffer, { metadata });

          // Generate signed URL (valid for 1 year)
          const [downloadURL] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
          });

          // Also save metadata to Firestore (using client SDK via fetch to Firebase)
          // For now, return the URL and let client save metadata
          return res.json({
            success: true,
            downloadURL,
            storagePath: fileName,
            fileName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
          });
        } catch (adminError: any) {
          console.error("Firebase Admin upload error:", adminError);
          // Fall through to alternative method
        }
      }

      // Alternative: Direct upload via Firebase Storage REST API using OAuth2
      // This bypasses CORS by uploading from server
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || 'pinkhopecompanion'}.firebasestorage.app`;
      const timestamp = Date.now();
      const folderPath = isDoctorCert ? 'doctorCertificates' : 'patientFiles';
      const fileName = `${folderPath}/${userId}/${timestamp}_${file.originalname}`;
      const encodedFileName = encodeURIComponent(fileName);
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${storageBucket}/o?name=${encodedFileName}&uploadType=media`;
      
      // Try to get OAuth2 token (requires service account or Application Default Credentials)
      try {
        const admin = await import("firebase-admin");
        if (admin.apps.length > 0) {
          // If Firebase Admin is initialized, use it to get access token
          const adminApp = admin.apps[0];
          if (adminApp) {
            const credential = adminApp.options.credential;
            
            if (credential && typeof (credential as any).getAccessToken === 'function') {
              const tokenResult = await (credential as any).getAccessToken();
              const accessToken = tokenResult?.access_token || tokenResult;
              
              if (accessToken) {
                // Convert Buffer to Uint8Array for fetch (more compatible)
                const uint8Array = new Uint8Array(file.buffer);
                
                // Upload file using REST API with OAuth2 token
                const uploadResponse = await fetch(uploadUrl, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": file.mimetype || 'application/octet-stream',
                    "Content-Length": file.size.toString(),
                  },
                  body: uint8Array,
                });
              
                if (uploadResponse.ok) {
                  const uploadData = await uploadResponse.json();
                  const downloadURL = `https://storage.googleapis.com/${storageBucket}/${fileName}`;
                  
                  return res.json({
                    success: true,
                    downloadURL,
                    storagePath: fileName,
                    fileName: file.originalname,
                    size: file.size,
                    mimeType: file.mimetype,
                  });
                } else {
                  const errorText = await uploadResponse.text();
                  console.error("Storage API upload error:", uploadResponse.status, errorText);
                }
              }
            }
          }
        }
      } catch (oauthError: any) {
        console.error("OAuth2 token error:", oauthError?.message || oauthError);
      }
      
      // Fallback: If no Admin SDK or OAuth2 available, return error with instructions
      return res.status(500).json({ 
        error: "تعذر رفع الملف من السيرفر.",
        suggestion: "يرجى تكوين Firebase Admin SDK مع Service Account Key في متغيرات البيئة (FIREBASE_SERVICE_ACCOUNT_KEY) أو Application Default Credentials.",
        note: "بدلاً من ذلك، يمكنك حل مشكلة CORS في Firebase Storage Console."
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء رفع الملف", details: error.message });
    }
  });

  // Get signed URL for existing file
  app.get("/api/file-url/:storagePath", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { storagePath } = req.params;
      if (!storagePath) {
        return res.status(400).json({ error: "storagePath مطلوب" });
      }

      const adminStorageInstance = await getAdminStorage();
      if (!adminStorageInstance) {
        return res.status(500).json({ error: "Firebase Admin غير متاح" });
      }

      const bucket = adminStorageInstance.bucket();
      const fileRef = bucket.file(decodeURIComponent(storagePath));

      // Check if file exists
      const [exists] = await fileRef.exists();
      if (!exists) {
        return res.status(404).json({ error: "الملف غير موجود" });
      }

      // Generate signed URL (valid for 1 year)
      const [downloadURL] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      return res.json({ downloadURL });
    } catch (error: any) {
      console.error("Error getting file URL:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء الحصول على رابط الملف", details: error.message });
    }
  });

  // AI coach endpoint (rule-based with optional Gemini/ChatGPT/Anthropic) - Require authentication + rate limiting
  app.post("/api/coach", aiLimiter, authenticateToken, async (req: Request, res: Response) => {
    const input = (req.body?.message as string) ?? "";
    if (!input.trim()) return res.status(400).json({ message: "message مطلوب" });
    
    const supportive = (text: string) => {
      const lower = text.toLowerCase();
      if (/[\u0621-\u064A]/.test(text)) {
        if (text.includes("تعب") || text.includes("ألم") || text.includes("خوف") || text.includes("قلق")) {
          return "أشعر بما تمرين به. خذي نفساً عميقاً، وتذكّري أن هذه المشاعر طبيعية. يمكنك تجربة تمارين تنفّس لمدة دقيقتين. هل تودين نصائح بسيطة الآن؟";
        }
        return "شكراً لمشاركتك. يمكنني تقديم معلومات موثوقة ونصائح نفسية ولطبية عامة. كيف تودين أن أساعدك الآن؟";
      }
      if (lower.includes("pain") || lower.includes("fear") || lower.includes("anxiety")) {
        return "I'm here with you. These feelings are valid. Try a two-minute breathing exercise; I can guide you. Would you like that?";
      }
      return "Thanks for sharing. I can provide supportive tips and medical information. How can I help right now?";
    };

    // Try Google Gemini FIRST (fastest and most cost-effective)
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (geminiKey) {
      try {
        console.log("🤖 Using Gemini API for coach endpoint");
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey);
        
        // Try latest models first - Gemini 2.5 Flash is the best
        const modelNames = [
          "gemini-2.5-flash",              // Best: Gemini 2.5 Flash
          "gemini-2.0-flash-exp",          // Gemini 2.0 Flash Experimental
          "gemini-1.5-flash-latest",       // Latest stable 1.5 Flash
          "gemini-1.5-flash",              // Standard 1.5 Flash
          "gemini-1.5-pro",                // 1.5 Pro
          "gemini-pro"                     // Legacy fallback
        ];
        
        let model;
        let lastError;
        
        for (const modelName of modelNames) {
          try {
            model = genAI.getGenerativeModel({ model: modelName });
            
            const prompt = `أنت مساعد ذكي متخصص في سرطان الثدي. اجب بالعربية فقط وبإيجاز شديد (2-3 جمل كحد أقصى). كن داعماً وعملياً. إذا كان السؤال طارئاً، شجع على مراجعة الطبيب فوراً.

السؤال: ${input}

الرد المختصر بالعربية:`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            if (text && text.trim()) {
              console.log(`✅ Gemini ${modelName} responded successfully`);
              return res.json({ reply: text.trim(), source: "gemini" });
            }
          } catch (err: any) {
            lastError = err;
            console.log(`❌ Gemini ${modelName} failed: ${err?.message?.substring(0, 100)}`);
            continue;
          }
        }
        
        console.warn("⚠️ All Gemini models failed, falling back to other APIs");
      } catch (error: any) {
        console.error("❌ Gemini API error (Coach):", error?.message || error);
        // Fall through to other APIs
      }
    }

    // Try ChatGPT API as fallback
    const openAIKey = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY;
    if (openAIKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAIKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "أنت مساعد ذكي متخصص في سرطان الثدي. اجب بالعربية فقط وبإيجاز شديد (2-3 جمل كحد أقصى). كن داعماً وعملياً. إذا كان السؤال طارئاً، شجع على مراجعة الطبيب فوراً."
              },
              {
                role: "user",
                content: input
              }
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return res.json({ reply });
          }
        }
      } catch (error) {
        console.error("ChatGPT API error:", error);
        // Fall through to Anthropic or default
      }
    }

    // Try Anthropic API as fallback
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const { Anthropic } = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic({ apiKey });
        const completion = await anthropic.messages.create({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 300,
          system: "You are a compassionate Arabic-first breast cancer care coach. Be supportive, brief, and practical. Provide accurate information about breast cancer symptoms, self-examination, prevention, and emotional support.",
          messages: [{ role: "user", content: input }],
        });
        const out = completion.content?.[0]?.type === "text" ? completion.content[0].text : supportive(input);
        return res.json({ reply: out });
      } catch (error) {
        console.error("Anthropic API error:", error);
      }
    }
    
    // Default fallback response
    res.json({ reply: supportive(input) });
  });

  // Admin AI endpoint - Advanced analysis with context - Require authentication only (not admin) + rate limiting
  app.post("/api/admin/ai", aiLimiter, authenticateToken, async (req: Request, res: Response) => {
    const { message, context } = req.body;
    const input = (message as string) ?? "";
    if (!input.trim()) {
      return res.status(400).json({ error: "message مطلوب" });
    }

    // Debug: Log environment variables (without exposing keys)
    console.log("🔐 API Keys status:");
    console.log("  - OpenAI:", process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Not set");
    console.log("  - Anthropic:", process.env.ANTHROPIC_API_KEY ? "✓ Set" : "✗ Not set");
    console.log("  - Gemini:", (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) ? "✓ Set" : "✗ Not set");

    // Build comprehensive context for admin AI
    const contextString = context ? JSON.stringify(context, null, 2) : "لا توجد بيانات سياقية متاحة.";

    const systemPrompt = `أنت مساعد ذكي متخصص في تحليل البيانات الطبية والإدارة الصحية لمنصة رفيق الأمل.

مهمتك:
1. تحليل البيانات والإحصائيات بدقة
2. تقديم توصيات عملية قابلة للتنفيذ
3. تحديد المشاكل والفرص للتحسين
4. اقتراح خطط عمل محددة
5. تحليل الاتجاهات والأنماط

البيانات المتاحة:
${contextString}

تعليمات:
- استخدم البيانات المقدمة في السياق لإعطاء إجابات دقيقة
- قدم تحليلاً عميقاً وليس فقط ملخصاً سطحياً
- اقترح حلول عملية ومحددة
- استخدم تنسيق واضح مع نقاط وترقيم
- كن مختصراً ولكن شامل
- إذا طُلب تحليل معين، ركز عليه بالتفصيل
- استخدم اللغة العربية فقط`;

    const fullPrompt = `${input}\n\nاستخدم البيانات التالية في التحليل:\n${contextString}`;

    // Try Google Gemini FIRST (since user has provided the key)
    // SECURITY: Never use hardcoded API keys - only use environment variables
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!geminiKey) {
      console.warn("⚠️ GEMINI_API_KEY not found in environment variables");
      return res.status(500).json({ 
        error: "مفتاح API غير متوفر",
        message: "يرجى تكوين GEMINI_API_KEY في متغيرات البيئة"
      });
    }
    
    console.log("🔍 Checking Gemini API Key:", geminiKey ? `Found (length: ${geminiKey.length})` : "Not found");
    
    if (geminiKey) {
      try {
        console.log("🤖 Initializing Gemini API...");
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey);
        
        // Try models - prioritize based on availability
        // Latest models first (Gemini 2.5 Flash, then 2.0 Flash, then 1.5 Flash)
        const modelNames = [
          "gemini-2.5-flash",              // Latest: Gemini 2.5 Flash (Best model)
          "gemini-2.0-flash-exp",         // Gemini 2.0 Flash Experimental
          "gemini-1.5-flash-latest",      // Latest stable 1.5 Flash
          "gemini-1.5-flash",             // Standard 1.5 Flash
          "gemini-1.5-pro",               // 1.5 Pro
          "models/gemini-2.5-flash",      // Alternative format
          "models/gemini-2.0-flash-exp",
          "models/gemini-1.5-flash-latest",
          "models/gemini-1.5-flash",
          "models/gemini-1.5-pro",
          "gemini-pro"                    // Legacy fallback
        ];
        
        let model;
        let lastError;
        
        for (const modelName of modelNames) {
          try {
            console.log(`  🧪 Trying model: ${modelName}`);
            model = genAI.getGenerativeModel({ model: modelName });
            
            // Build comprehensive prompt for Gemini
            const combinedPrompt = `أنت مساعد ذكي متخصص في تحليل البيانات الطبية والإدارة الصحية لمنصة رفيق الأمل.

مهمتك:
1. تحليل البيانات والإحصائيات بدقة
2. تقديم توصيات عملية قابلة للتنفيذ
3. تحديد المشاكل والفرص للتحسين
4. اقتراح خطط عمل محددة
5. تحليل الاتجاهات والأنماط

استخدم البيانات التالية في التحليل:
${contextString}

السؤال/الطلب من المدير:
${input}

يرجى تقديم تحليل شامل ومفصل بالعربية مع:
- تحليل عميق للبيانات
- توصيات عملية
- خطط عمل محددة
- استخدام تنسيق واضح مع نقاط وترقيم`;

            console.log("📤 Sending request to Gemini API...");
            const result = await model.generateContent(combinedPrompt);
            const response = await result.response;
            const text = response.text();
            
            if (text && text.trim()) {
              console.log(`  ✅ Model ${modelName} works! Response length: ${text.length}`);
              return res.json({ reply: text.trim(), source: "gemini" });
            } else {
              throw new Error("Empty response from model");
            }
          } catch (err: any) {
            lastError = err;
            console.log(`  ❌ Model ${modelName} failed: ${err?.message?.substring(0, 150)}`);
            continue;
          }
        }
        
        // If all models failed, throw error with details
        throw new Error(`All Gemini models failed. Last error: ${lastError?.message || "Unknown error"}`);
      } catch (error: any) {
        console.error("❌ Gemini API error (Admin AI):");
        console.error("  Error message:", error?.message || "Unknown error");
        console.error("  Error name:", error?.name);
        console.error("  Full error:", error);
        
        // Check for specific error types
        if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("API key")) {
          console.error("  ❌ Invalid API Key!");
        }
        if (error?.message?.includes("QUOTA")) {
          console.error("  ❌ Quota exceeded!");
        }
        // Fall through to other APIs
      }
    } else {
      console.log("ℹ️ Gemini API Key not found, trying other APIs");
    }

    // Try OpenAI as fallback
    const openAIKey = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY;
    if (openAIKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAIKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: fullPrompt,
              },
            ],
            max_tokens: 800,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return res.json({ reply, source: "openai" });
          }
        }
      } catch (error) {
        console.error("OpenAI API error (Admin AI):", error);
        // Fall through to Anthropic
      }
    }

    // Try Anthropic as fallback
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const { Anthropic } = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic({ apiKey });
        const completion = await anthropic.messages.create({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: "user", content: fullPrompt }],
        });
        const out = completion.content?.[0]?.type === "text" ? completion.content[0].text : "حدث خطأ أثناء التحليل.";
        return res.json({ reply: out, source: "anthropic" });
      } catch (error) {
        console.error("Anthropic API error (Admin AI):", error);
        // Fall through to fallback
      }
    }

    // Note: Gemini is tried first above, before OpenAI and Anthropic

    // Fallback: Generate intelligent response based on context
    const generateFallbackResponse = () => {
      const lowerInput = input.toLowerCase();
      
      if (lowerInput.includes("مرضى") || lowerInput.includes("patients")) {
        const totalPatients = context?.stats?.totalPatients || 0;
        const highRisk = context?.patients?.filter((p: any) => p.riskLevel === "مرتفع")?.length || 0;
        return `تحليل شامل للمرضى:\n\n📊 الإحصائيات:\n• إجمالي المرضى: ${totalPatients}\n• المرضى عاليو المخاطر: ${highRisk}\n• نسبة المخاطر المرتفعة: ${totalPatients > 0 ? ((highRisk / totalPatients) * 100).toFixed(1) : 0}%\n\n🔍 التوصيات:\n• متابعة دقيقة للمرضى عاليي المخاطر\n• جدولة مواعيد متابعة منتظمة\n• زيادة التوعية الصحية\n• مراجعة خطط الرعاية بشكل دوري`;
      }
      
      if (lowerInput.includes("تقييم") || lowerInput.includes("assessment")) {
        const totalAssessments = context?.stats?.totalAssessments || 0;
        const highRiskAssessments = context?.assessments?.filter((a: any) => a.level === "مرتفع")?.length || 0;
        return `تحليل التقييمات:\n\n📊 الإحصائيات:\n• إجمالي التقييمات: ${totalAssessments}\n• التقييمات عالية المخاطر: ${highRiskAssessments}\n\n💡 التوصيات:\n• مراجعة شاملة للمرضى ذوي التقييمات المرتفعة\n• تطوير برامج توعية مستهدفة\n• تحسين عملية المتابعة`;
      }
      
      return `تحليل شامل للنظام:\n\n📈 الحالة العامة:\nالنظام يعمل بشكل جيد مع بعض المجالات التي تحتاج تحسين.\n\n💡 توصيات عامة:\n• مراقبة التنبيهات النشطة بشكل مستمر\n• تحسين تجربة المستخدم\n• زيادة التفاعل بين الأطباء والمرضى`;
    };

    return res.json({ reply: generateFallbackResponse(), source: "fallback" });
  });

  // Test Gemini API endpoint - Admin only
  app.get("/api/test-gemini", requireAdmin, async (req: Request, res: Response) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
      
      if (!geminiKey) {
        return res.status(400).json({ 
          error: "GEMINI_API_KEY not found in environment variables",
          envKeys: Object.keys(process.env).filter(k => k.includes("GEMINI") || k.includes("GEMINI"))
        });
      }

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      
      // Try latest models first
      const modelNames = [
        "gemini-2.5-flash",              // Best: Gemini 2.5 Flash
        "gemini-2.0-flash-exp",         // Gemini 2.0 Flash Experimental
        "gemini-1.5-flash-latest",      // Latest stable 1.5 Flash
        "gemini-1.5-flash",             // Standard 1.5 Flash
        "gemini-1.5-pro",               // 1.5 Pro
        "gemini-pro"                    // Legacy fallback
      ];
      
      let model;
      let lastError;
      let workingModel = null;
      
      const testPrompt = "مرحباً، قل مرحباً بالعربية فقط.";
      
      for (const modelName of modelNames) {
        try {
          console.log(`🧪 Testing model: ${modelName}`);
          model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(testPrompt);
          const response = await result.response;
          const text = response.text();
          
          if (text && text.trim()) {
            workingModel = modelName;
            console.log(`✅ Model ${modelName} works!`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.log(`❌ Model ${modelName} failed: ${err?.message?.substring(0, 100)}`);
          continue;
        }
      }
      
      if (!workingModel || !model) {
        throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown error"}`);
      }
      
      const result = await model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();
      
      return res.json({
        success: true,
        message: "Gemini API is working!",
        response: text,
        model: workingModel,
        keyLength: geminiKey.length,
        keyPrefix: geminiKey.substring(0, 10) + "..."
      });
    } catch (error: any) {
      console.error("Gemini test error:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Unknown error",
        details: error?.toString(),
        stack: error?.stack
      });
    }
  });

  // WhatsApp Notifications API endpoints
  app.post("/api/notifications/send", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { type, recipientId, recipientType, data } = req.body;

      if (!type || !recipientId || !recipientType) {
        return res.status(400).json({ error: "Missing required fields: type, recipientId, recipientType" });
      }

      const { 
        notifyAppointmentBookedToPatient,
        notifyAppointmentBookedToDoctor,
        notifyAppointmentReminder,
        notifyMedicationAddedToPatient,
        notifyMedicationReminder,
        notifyHighRiskToPatient,
        notifyHighRiskToDoctor,
        sendCustomNotification
      } = await import("./services/notifications");

      let success = false;

      switch (type) {
        case "appointment_booked_patient":
          if (!data?.appointmentDate || !data?.appointmentType) {
            return res.status(400).json({ error: "Missing appointmentDate or appointmentType" });
          }
          success = await notifyAppointmentBookedToPatient(
            recipientId,
            new Date(data.appointmentDate),
            data.appointmentType
          );
          break;

        case "appointment_booked_doctor":
          if (!data?.patientId || !data?.appointmentDate || !data?.appointmentType) {
            return res.status(400).json({ error: "Missing patientId, appointmentDate, or appointmentType" });
          }
          success = await notifyAppointmentBookedToDoctor(
            recipientId,
            data.patientId,
            new Date(data.appointmentDate),
            data.appointmentType
          );
          break;

        case "appointment_reminder":
          if (!data?.appointmentDate || !data?.hoursUntil) {
            return res.status(400).json({ error: "Missing appointmentDate or hoursUntil" });
          }
          success = await notifyAppointmentReminder(
            recipientId,
            new Date(data.appointmentDate),
            data.hoursUntil
          );
          break;

        case "medication_added":
          if (!data?.medicationName || !data?.times || !data?.startDate) {
            return res.status(400).json({ error: "Missing medicationName, times, or startDate" });
          }
          success = await notifyMedicationAddedToPatient(
            recipientId,
            data.medicationName,
            data.dosage || "",
            data.times,
            data.startDate
          );
          break;

        case "medication_reminder":
          if (!data?.medicationName || !data?.time) {
            return res.status(400).json({ error: "Missing medicationName or time" });
          }
          success = await notifyMedicationReminder(
            recipientId,
            data.medicationName,
            data.time
          );
          break;

        case "high_risk_patient":
          success = await notifyHighRiskToPatient(recipientId);
          break;

        case "high_risk_doctor":
          if (!data?.patientId) {
            return res.status(400).json({ error: "Missing patientId" });
          }
          success = await notifyHighRiskToDoctor(recipientId, data.patientId);
          break;

        case "custom":
          if (!data?.message) {
            return res.status(400).json({ error: "Missing message" });
          }
          success = await sendCustomNotification(recipientId, recipientType, data.message);
          break;

        default:
          return res.status(400).json({ error: "Invalid notification type" });
      }

      if (success) {
        return res.json({ success: true, message: "Notification sent successfully" });
      } else {
        return res.status(200).json({ 
          success: false, 
          message: "Notification failed to send. This could be due to missing phone number, Twilio configuration, or WhatsApp Sandbox setup. Check server logs for details.",
          error: "Notification sending failed"
        });
      }
    } catch (error: any) {
      console.error("Error sending notification:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  // Test WhatsApp notification endpoint
  app.post("/api/notifications/test", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { phone, message } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ error: "Missing phone or message" });
      }

      const { sendWhatsAppMessage, isTwilioConfigured } = await import("./services/twilio");

      if (!isTwilioConfigured()) {
        return res.status(500).json({ 
          error: "Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in environment variables." 
        });
      }

      const result = await sendWhatsAppMessage(phone, message);

      if (result.success) {
        return res.json({ success: true, messageId: result.messageId, message: "Test notification sent successfully" });
      } else {
        return res.status(500).json({ error: result.error || "Failed to send test notification" });
      }
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  // Medical Image Analysis endpoint - Doctor only
  app.post("/api/analyze-medical-image", uploadLimiter, authenticateToken, upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع أي صورة" });
      }

      const imageType = (req.body.imageType as string) || "mammogram";
      const file = req.file;

      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: "نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPG, PNG أو WEBP" });
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت" });
      }

      console.log(`📸 Analyzing medical image: ${file.originalname}, type: ${imageType}, size: ${file.size} bytes`);

      // Upload to Firebase Storage
      const adminStorage = await getAdminStorage();
      let imageUrl = "";

      if (adminStorage) {
        try {
          // Get bucket name from env or use default
          const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 
                            `${process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'pinkhopecompanion'}.firebasestorage.app`;
          const bucket = adminStorage.bucket(bucketName);
          const fileName = `medical-images/${Date.now()}-${file.originalname}`;
          const fileRef = bucket.file(fileName);

          await fileRef.save(file.buffer, {
            metadata: {
              contentType: file.mimetype,
              metadata: {
                uploadedBy: (req as any).user?.uid || "unknown",
                imageType: imageType,
                uploadedAt: new Date().toISOString(),
              },
            },
          });

          // Make file readable (or use signed URL)
          await fileRef.makePublic();
          imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          console.log(`✅ Image uploaded to Firebase Storage: ${imageUrl}`);
        } catch (storageError: any) {
          console.error("Error uploading to Firebase Storage:", storageError);
          // Continue with analysis even if storage fails
        }
      }

      // Analyze with Gemini Vision API
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY غير موجود في متغيرات البيئة" });
      }

      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey);

        // Use models that support vision (image analysis)
        const visionModels = [
          "gemini-2.5-flash",         // Best: Gemini 2.5 Flash (latest and best for vision)
          "gemini-2.0-flash-exp",     // Gemini 2.0 Flash Experimental
          "gemini-1.5-flash-latest",  // Latest stable 1.5 Flash
          "gemini-1.5-flash",         // Standard vision support
          "gemini-1.5-pro",           // Pro with vision
        ];

        let analysis = "";
        let lastError: any = null;

        for (const modelName of visionModels) {
          try {
            // Use JSON mode for structured output
            const model = genAI.getGenerativeModel({ 
              model: modelName,
              generationConfig: {
                responseMimeType: "application/json",
              }
            });

            // Convert image buffer to base64
            const base64Image = file.buffer.toString("base64");
            const mimeType = file.mimetype;

            // Build prompt based on image type - Enhanced prompts for better parsing
            let prompt = "";
            
            if (imageType === "mammogram") {
              prompt = `أنت استشاري أشعة خبير متخصص في تصوير الثدي. قم بتحليل صورة الماموجرام المرفقة وقدم تقريراً دقيقاً باللغة العربية.

**مهم جداً جداً:** 
- يجب أن تكون إجابتك JSON فقط بدون أي نص إضافي قبل أو بعد
- لا تكتب أي شرح أو مقدمة
- ابدأ مباشرة بـ { وأنهِ بـ }
- لا تستخدم علامات تنسيق مثل \`\`\`json أو \`\`\`

استخدم الهيكل التالي تماماً (ابدأ مباشرة بالـ JSON):

{
  "finalResult": "النتيجة النهائية المختصرة هنا (2-3 جمل كاملة)",
  "biRads": "الرقم فقط (مثلاً 0 أو 1 أو 2 أو 3 أو 4 أو 5 أو 6)",
  "findings": {
    "breastDensity": "وصف كثافة الثدي (مثل: كثافة دهنية، متفرقة، غير متجانسة، كثيفة جداً)",
    "masses": "وصف الكتل إن وجدت (الشكل، الحواف، الكثافة، الموقع)",
    "calcifications": "وصف التكلسات إن وجدت (النوع، التوزيع، الموقع)",
    "asymmetry": "وصف عدم التناظر أو التشوه المعماري إن وجد"
  },
  "detailedAnalysis": "التحليل الكامل والشرح التفصيلي هنا (فقرة أو أكثر)",
  "recommendations": [
    "التوصية الأولى",
    "التوصية الثانية",
    "التوصية الثالثة"
  ]
}

**قواعد مهمة:**
- لا تعطي تشخيصاً نهائياً للسرطان. استخدم مصطلحات مثل "مشبوه" أو "غير طبيعي" أو "يوحي بـ"
- biRads يجب أن يكون رقم فقط (0-6)
- finalResult يجب أن يكون مختصر (2-3 جمل)
- recommendations يجب أن تكون مصفوفة من النصوص
- كن مهنياً ودقيقاً في الوصف`;
            } else if (imageType === "xray") {
              prompt = `أنت استشاري أشعة خبير. قم بتحليل صورة الأشعة السينية المرفقة وقدم تقريراً دقيقاً باللغة العربية.

**مهم جداً:** يجب أن تكون إجابتك بصيغة JSON فقط وبدون أي علامات تنسيق (مثل \`\`\`json أو \`\`\`).

استخدم الهيكل التالي تماماً:

{
  "finalResult": "النتيجة النهائية المختصرة هنا (2-3 جمل كاملة)",
  "biRads": "N/A",
  "findings": {
    "breastDensity": "N/A",
    "masses": "وصف أي كتل أو آفات إن وجدت",
    "calcifications": "وصف أي تكلسات أو ترسبات إن وجدت",
    "asymmetry": "وصف أي تشوهات أو عدم تناظر إن وجد"
  },
  "detailedAnalysis": "التحليل الكامل والشرح التفصيلي هنا (فقرة أو أكثر)",
  "recommendations": [
    "التوصية الأولى",
    "التوصية الثانية",
    "التوصية الثالثة"
  ]
}

**قواعد مهمة:**
- حدد بوضوح إذا كانت الصورة تبدو "طبيعية" أو "غير طبيعية"
- biRads و breastDensity يمكن أن تكون "N/A" للأشعة السينية
- كن مهنياً ودقيقاً في الوصف`;
            } else {
              prompt = `Act as a general medical AI assistant specialized in medical imaging.

Analyze the visual content of this medical image.

Your analysis must be in **Arabic**:

**CRITICAL FORMATTING RULES:**
- Each section title MUST be on its own line, ending with a colon (:)
- Each section's content MUST be on separate lines below the title
- Use line breaks between sections for clarity
- DO NOT put multiple sections in one line

1. **ماذا يظهر في الصورة:**
   (Put this title on its own line, then description below)
   - Identify the modality (MRI, CT, Ultrasound, Dermoscopy, Endoscopy, etc.).
   - Describe the visible anatomy or condition.

2. **الملاحظات غير الطبيعية:**
   (Put this title on its own line, then findings below, each point on a new line)
   - Highlight any visible anomalies or areas of concern.
   - Describe the location, size, and characteristics of any findings.

3. **التحليل:**
   (Put this title on its own line, then analysis below)

4. **التوصيات:**
   (Put this title on its own line, then recommendations below)

5. **الخلاصة:**
   (Put this title on its own line, then conclusion below)
   - Provide a brief summary of what is seen.
   - Determine if immediate medical attention seems necessary based on visual cues.
   - Clearly state if the image appears "Normal" (طبيعي) or "Abnormal" (غير طبيعي).

**IMPORTANT:**
- End with a section titled "الخلاصة" containing the final verdict ONLY ONCE at the very end.
- Do NOT repeat section titles or content.
- Write complete sentences, do NOT cut them off.
- Use Markdown formatting (**bold**, lists) for better readability.
- **EACH SECTION TITLE MUST BE ON A SEPARATE LINE**
- **EACH SECTION'S CONTENT MUST BE CLEARLY SEPARATED**
- Add a disclaimer that this is not a final medical diagnosis.
- Be professional and concise.`;
            }

            // Use Gemini Vision API
            const result = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: base64Image,
                  mimeType: mimeType,
                },
              },
            ]);

            const response = await result.response;
            let responseText = response.text();
            
            // Clean up JSON if it has markdown code blocks
            responseText = responseText.replace(/```json|```/g, '').trim();
            
            // Try to extract JSON from text (might have extra text before/after)
            const firstBrace = responseText.indexOf('{');
            const lastBrace = responseText.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              // Extract JSON part only
              const jsonPart = responseText.substring(firstBrace, lastBrace + 1);
              
              // Try to parse JSON to validate it
              try {
                const parsed = JSON.parse(jsonPart);
                
                // Validate structure
                if (parsed.finalResult && parsed.biRads !== undefined && parsed.findings && parsed.detailedAnalysis && parsed.recommendations) {
                  // Return clean JSON string
                  analysis = JSON.stringify(parsed);
                  console.log(`✅ Gemini ${modelName} analyzed image successfully with valid JSON`);
                  break;
                } else {
                  console.warn(`⚠️ Gemini ${modelName} JSON structure incomplete`);
                  analysis = jsonPart; // Use extracted JSON even if incomplete
                  break;
                }
              } catch (parseError) {
                console.warn(`⚠️ Gemini ${modelName} returned invalid JSON, trying full text`);
                // Try parsing the whole response
                try {
                  const parsed = JSON.parse(responseText);
                  analysis = JSON.stringify(parsed);
                  break;
                } catch (e2) {
                  console.warn(`⚠️ Gemini ${modelName} returned invalid JSON, using raw text`);
                  analysis = responseText;
                  break;
                }
              }
            } else {
              // No JSON found, use raw text
              console.warn(`⚠️ Gemini ${modelName} returned text without JSON structure`);
              analysis = responseText;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.log(`❌ Gemini ${modelName} failed: ${err?.message?.substring(0, 100)}`);
            continue;
          }
        }

        if (!analysis || !analysis.trim()) {
          throw new Error(`فشل تحليل الصورة. ${lastError?.message || "خطأ غير معروف"}`);
        }

        return res.json({
          success: true,
          analysis: analysis.trim(),
          imageUrl: imageUrl,
          imageType: imageType,
        });
      } catch (geminiError: any) {
        console.error("❌ Gemini Vision API error:", geminiError);
        return res.status(500).json({
          error: "فشل تحليل الصورة باستخدام الذكاء الاصطناعي",
          details: geminiError?.message || "خطأ غير معروف",
        });
      }
    } catch (error: any) {
      console.error("Error analyzing medical image:", error);
      return res.status(500).json({
        error: "حدث خطأ أثناء تحليل الصورة",
        details: error?.message || "خطأ غير معروف",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
