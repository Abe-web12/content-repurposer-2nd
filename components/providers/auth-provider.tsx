"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const mounted = useRef(true);
  const fetching = useRef(false);

  const ensureProfile = useCallback(
    async (userId: string, userEmail?: string, userMeta?: Record<string, unknown>): Promise<Profile | null> => {
      // 1. Try to fetch existing profile
      const { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (existing) return existing as Profile;

      // 2. If profile doesn't exist, create it via upsert
      //    Use the service role if available, otherwise client-side upsert
      const insertPayload: Record<string, unknown> = {
        id: userId,
        email: userEmail || "",
        full_name: (userMeta?.full_name as string) || (userMeta?.name as string) || "",
      };

      // Only add avatar_url if we have a value — the column might not exist yet
      const avatarUrl = (userMeta?.avatar_url as string) || (userMeta?.picture as string) || "";
      if (avatarUrl) {
        insertPayload.avatar_url = avatarUrl;
      }

      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .upsert(insertPayload, { onConflict: "id", ignoreDuplicates: false })
        .select("*")
        .maybeSingle();

      if (insertError) {
        // If the error is about a missing column (PGRST204), retry without optional fields
        if (insertError.code === "PGRST204" || insertError.message?.includes("avatar_url")) {
          delete insertPayload.avatar_url;
          const { data: retryProfile, error: retryError } = await supabase
            .from("profiles")
            .upsert(insertPayload, { onConflict: "id", ignoreDuplicates: false })
            .select("*")
            .maybeSingle();

          if (retryError) {
            console.error("Failed to create profile (retry):", retryError.message);
            return null;
          }
          return retryProfile as Profile;
        }

        // If constraint violation (duplicate), another request already created it — fetch again
        if (insertError.code === "23505") {
          const { data: retry } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          return retry as Profile | null;
        }

        console.error("Failed to create profile:", insertError.message);
        return null;
      }

      return newProfile as Profile;
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const data = await ensureProfile(user.id, user.email ?? undefined, user.user_metadata as Record<string, unknown>);
    if (data && mounted.current) setProfile(data);
  }, [user, ensureProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.assign("/login");
  }, [supabase]);

  useEffect(() => {
    mounted.current = true;

    async function initialize() {
      if (fetching.current) return;
      fetching.current = true;

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!mounted.current) return;
        setUser(currentUser);

        if (currentUser) {
          const nextProfile = await ensureProfile(
            currentUser.id,
            currentUser.email ?? undefined,
            currentUser.user_metadata as Record<string, unknown>
          );
          if (mounted.current) setProfile(nextProfile);
        }
      } finally {
        fetching.current = false;
        if (mounted.current) setLoading(false);
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;

      if (event === "TOKEN_REFRESHED") return;

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (!mounted.current) return;
        setUser(currentUser);

        if (currentUser) {
          const nextProfile = await ensureProfile(
            currentUser.id,
            currentUser.email ?? undefined,
            currentUser.user_metadata as Record<string, unknown>
          );
          if (mounted.current) {
            setProfile(nextProfile);
            setLoading(false);
          }
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted.current) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, ensureProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
