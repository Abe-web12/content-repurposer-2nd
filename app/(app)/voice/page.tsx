"use client";

import { useState } from "react";
import { Mic2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { VoiceCard } from "@/components/voice/voice-card";
import { VoiceForm } from "@/components/voice/voice-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useVoiceProfiles } from "@/hooks/use-voice-profiles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VoicePage() {
  const { profiles, loading, createProfile, deleteProfile } = useVoiceProfiles();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function handleCreate(data: any) {
    const result = await createProfile(data);
    if (result) {
      setShowCreate(false);
    }
    return result;
  }

  async function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteProfile(deleteTarget);
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="space-y-10">
        <PageHeader title="Voice Profiles" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Voice Profiles"
        description="Create profiles from your writing style so generated content sounds like you."
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New profile
          </Button>
        }
      />

      {profiles.length === 0 ? (
        <EmptyState
          icon={<Mic2 className="h-10 w-10" />}
          title="No voice profiles yet"
          description="Add writing examples so the AI can match your tone and style."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create your first profile
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <VoiceCard key={profile.id} profile={profile} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create voice profile</DialogTitle>
            <DialogDescription>
              Add your writing examples so generated content matches your style.
            </DialogDescription>
          </DialogHeader>
          <VoiceForm onSubmit={handleCreate} submitLabel="Create profile" />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete voice profile"
        description="This action cannot be undone. Are you sure you want to delete this profile?"
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
