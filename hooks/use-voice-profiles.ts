"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VoiceProfile } from "@/lib/supabase/types";
import { showError, showSuccess } from "@/components/ui/toast";

export function useVoiceProfiles() {
  const [supabase] = useState(() => createClient());
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);

    const response = await fetch("/api/voice");
    const json = await response.json();

    if (response.ok) {
      setProfiles(json.data || []);
    } else {
      showError(json.error || "Failed to load voice profiles");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  async function createProfile(data: Omit<VoiceProfile, "id" | "user_id" | "created_at" | "embedding">) {
    const response = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await response.json();

    if (!response.ok) {
      const errorMsg =
        typeof json.error === "string"
          ? json.error
          : "Failed to create voice profile";
      showError(errorMsg);
      return null;
    }

    showSuccess("Voice profile created");
    await fetchProfiles();
    return json.data;
  }

  async function updateProfile(id: string, data: Partial<VoiceProfile>) {
    const response = await fetch("/api/voice", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });

    const json = await response.json();

    if (!response.ok) {
      showError(typeof json.error === "string" ? json.error : "Failed to update");
      return null;
    }

    showSuccess("Voice profile updated");
    await fetchProfiles();
    return json.data;
  }

  async function deleteProfile(id: string) {
    const response = await fetch(`/api/voice?id=${id}`, { method: "DELETE" });
    const json = await response.json();

    if (!response.ok) {
      showError(json.error || "Failed to delete");
      return false;
    }

    showSuccess("Voice profile deleted");
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    return true;
  }

  const defaultProfile = profiles.find((p) => p.is_default) || profiles[0] || null;

  return {
    profiles,
    loading,
    defaultProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    refetch: fetchProfiles,
  };
}
