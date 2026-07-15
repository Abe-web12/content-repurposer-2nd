"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Generation } from "@/lib/supabase/types";
import { showError } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface UseGenerationsOptions {
  limit?: number;
  format?: string;
  favorites?: boolean;
  subscribe?: boolean;
}

export function useGenerations(options: UseGenerationsOptions = {}) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchGenerations = useCallback(async (reset = false) => {
    setLoading(true);

    const params = new URLSearchParams();
    params.set("limit", String(optionsRef.current.limit || 20));
    params.set("offset", String(reset ? 0 : offsetRef.current));

    if (optionsRef.current.format) {
      params.set("format", optionsRef.current.format);
    }
    if (optionsRef.current.favorites) {
      params.set("favorites", "true");
    }

    try {
      const response = await fetch(`/api/generations?${params}`);
      const json = await response.json();

      if (!response.ok) {
        showError(json.error || "Failed to load generations");
        return;
      }

      setGenerations((prev) => (reset ? (json.data || []) : [...prev, ...(json.data || [])]));
      setHasMore(json.data && json.data.length === (optionsRef.current.limit || 20));
      if (!reset) {
        offsetRef.current += optionsRef.current.limit || 20;
      } else {
        offsetRef.current = (optionsRef.current.limit || 20);
      }
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    fetchGenerations(true);
  }, [fetchGenerations]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchGenerations(false);
    }
  }, [loading, hasMore, fetchGenerations]);

  useEffect(() => {
    refresh();
  }, [refresh, options.format, options.favorites]);

  useEffect(() => {
    if (!options.subscribe) return;

    const supabase = createClient();
    const channel = supabase
      .channel("generations-list-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generations" },
        () => {
          offsetRef.current = 0;
          fetchGenerations(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.subscribe, fetchGenerations]);

  return {
    generations,
    loading,
    hasMore,
    refresh,
    loadMore,
  };
}

export async function toggleFavorite(id: string) {
  const response = await fetch(`/api/generations/${id}/favorite`, {
    method: "PATCH",
  });
  const json = await response.json();

  if (!response.ok) {
    showError(json.error || "Failed to update favorite");
    return null;
  }

  return json.data;
}

export async function deleteGeneration(id: string) {
  const response = await fetch(`/api/generations/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const json = await response.json();
    showError(json.error || "Failed to delete generation");
    return false;
  }

  return true;
}

export async function fetchGeneration(id: string): Promise<Generation | null> {
  try {
    const response = await fetch(`/api/generations/${id}`);
    const json = await response.json();

    if (!response.ok) {
      showError(json.error || "Failed to load generation");
      return null;
    }

    return json.data;
  } catch (err: any) {
    showError(err.message || "Network error");
    return null;
  }
}
