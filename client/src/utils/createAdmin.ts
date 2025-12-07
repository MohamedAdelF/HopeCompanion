// Utility script to create admin account
// Run this in browser console or create a one-time setup script

import { auth, firestoreDb, doc, setDoc } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export async function createAdminAccount() {
  try {
    // Create admin user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      "admin@admin.com",
      "admin"
    );

    // Create admin profile in Firestore
    await setDoc(doc(firestoreDb, "userProfiles", userCredential.user.uid), {
      uid: userCredential.user.uid,
      role: "admin",
      email: "admin@admin.com",
      createdAt: new Date().toISOString(),
    });

    console.log("✅ Admin account created successfully!");
    console.log("Email: admin@admin.com");
    console.log("Password: admin");
    return userCredential.user;
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      console.log("ℹ️ Admin account already exists");
      
      // Try to update existing account to admin role
      try {
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const cred = await signInWithEmailAndPassword(auth, "admin@admin.com", "admin");
        await setDoc(doc(firestoreDb, "userProfiles", cred.user.uid), {
          uid: cred.user.uid,
          role: "admin",
          email: "admin@admin.com",
        }, { merge: true });
        console.log("✅ Admin role assigned to existing account");
        return cred.user;
      } catch (updateError) {
        console.error("Error updating admin role:", updateError);
        throw updateError;
      }
    } else {
      console.error("Error creating admin account:", error);
      throw error;
    }
  }
}

