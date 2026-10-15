import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

export type DahiraRole = "member" | "treasurer" | "manager" | "admin";
export type MemberProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  section: string | null;
  role: DahiraRole;
  status: "active" | "suspended";
  member_number: string | null;
  created_at: string;
};

type AuthContextValue = {
  client: ReturnType<typeof getSupabaseClient>;
  user: User | null;
  session: Session | null;
  profile: MemberProfile | null;
  loading: boolean;
  configurationMissing: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(client));

  const refreshProfile = useCallback(async () => {
    if (!client || !session?.user) {
      setProfile(null);
      return;
    }
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, phone, section, role, status, member_number, created_at")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) {
      console.error("Impossible de charger le profil", error.message);
      setProfile(null);
      return;
    }
    setProfile(data as MemberProfile | null);
  }, [client, session?.user]);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let active = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Lecture de session impossible", error.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
    setSession(null);
    setProfile(null);
  }, [client]);

  const value = useMemo(() => ({
    client,
    user: session?.user ?? null,
    session,
    profile,
    loading,
    configurationMissing: !client,
    refreshProfile,
    signOut,
  }), [client, session, profile, loading, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider");
  return context;
}
