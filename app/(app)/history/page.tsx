"use client";

import { useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryFilters } from "@/components/history/history-filters";
import { GenerationCard } from "@/components/history/generation-card";
import { useGenerations, toggleFavorite, deleteGeneration } from "@/hooks/use-generations";
import type { Generation } from "@/lib/supabase/types";

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("all");
  const [showFavorites, setShowFavorites] = useState(false);

  const { generations, loading, refresh, loadMore, hasMore } = useGenerations({
    format: format === "all" ? undefined : format,
    favorites: showFavorites || undefined,
  });

  const filtered = generations.filter((gen) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      gen.output_content.toLowerCase().includes(q) ||
      gen.input_type.toLowerCase().includes(q) ||
      gen.output_format.toLowerCase().includes(q)
    );
  });

  const handleToggleFavorite = useCallback(async (id: string) => {
    const result = await toggleFavorite(id);
    if (result) refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    const success = await deleteGeneration(id);
    if (success) refresh();
  }, [refresh]);

  return (
    <div className="space-y-10">
      <PageHeader title="History" description="All your past generations in one place." />

      <HistoryFilters
        search={search}
        onSearchChange={setSearch}
        format={format}
        onFormatChange={setFormat}
        showFavorites={showFavorites}
        onFavoritesToggle={() => setShowFavorites((prev) => !prev)}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-10 w-10" />}
          title="No generations found"
          description={
            search || format !== "all" || showFavorites
              ? "Try adjusting your filters."
              : "Your saved content will appear here after you generate something."
          }
          action={
            !search && format === "all" && !showFavorites ? (
              <Button asChild>
                <a href="/generate">Create your first generation</a>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((gen) => (
              <GenerationCard
                key={gen.id}
                generation={gen}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
