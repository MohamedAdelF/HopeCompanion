import { createContext, useContext, useEffect, useState } from "react";
import { auth, onAuthStateChanged, type User, signOut, getDoc, doc, firestoreDb } from "@/lib/firebase";
import { setRole } from "@/lib/authRole";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const prof = await getDoc(doc(firestoreDb, "userProfiles", u.uid));
          const data = prof.data() as any;
          if (data?.role === "doctor" || data?.role === "patient") {
            setRole(data.role);
          }
        } catch {}
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


