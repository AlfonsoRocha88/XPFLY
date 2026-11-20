import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  // Most query keys ("profile", "all-tasks", ...) are not per user: drop the cache whenever the
  // signed-in account changes, so the next account never sees the previous one's data.
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const apply = (session: Session | null) => {
      const id = session?.user?.id ?? null;
      if (lastUserId.current !== undefined && lastUserId.current !== id) queryClient.clear();
      lastUserId.current = id;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => apply(session));

    supabase.auth.getSession().then(({ data: { session } }) => apply(session));

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
