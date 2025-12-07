import admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    
    // Priority 1: Try with Service Account Key from env (most reliable)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          projectId: projectId || serviceAccount.project_id,
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin initialized with Service Account Key");
      } catch (err: any) {
        console.warn("⚠️ Failed to initialize Firebase Admin with Service Account Key:", err.message);
      }
    }
    // Priority 2: Try with Application Default Credentials (if on Google Cloud)
    else {
      try {
        admin.initializeApp({
          projectId: projectId,
          credential: admin.credential.applicationDefault(),
        });
        console.log("✅ Firebase Admin initialized with Application Default Credentials");
      } catch (err: any) {
        // Priority 3: Try with project ID only (may work in some environments)
        if (projectId) {
          try {
            admin.initializeApp({
              projectId: projectId,
            });
            console.log("✅ Firebase Admin initialized with Project ID only");
          } catch (err2: any) {
            console.warn("⚠️ Firebase Admin not initialized. Scheduler will be disabled.");
            console.warn("   To enable scheduler, add FIREBASE_SERVICE_ACCOUNT_KEY to .env");
          }
        } else {
          console.warn("⚠️ Firebase Admin not initialized. No Project ID or Service Account Key found.");
        }
      }
    }
  } catch (err: any) {
    console.warn("⚠️ Firebase Admin initialization error:", err.message);
    console.warn("   Notifications via API endpoints will still work, but scheduler will be disabled.");
  }
}

export const firestoreDb = admin.apps.length ? admin.firestore() : null;

// Re-export Firebase Admin Timestamp (used for dates)
export const Timestamp = admin.firestore.Timestamp;
export const FieldValue = admin.firestore.FieldValue;

// Re-export storage
export const storage = admin.storage;

