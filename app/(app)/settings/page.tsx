"use client";

import { useState } from "react";
import { User, CreditCard, Loader2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlanBadge } from "@/components/billing/plan-badge";
import { useUser } from "@/hooks/use-user";
import { showError } from "@/components/ui/toast";
import { BrandKitForm } from "@/components/settings/brand-kit-form";
import { WebhookSettings } from "@/components/settings/WebhookSettings";

export default function SettingsPage() {
  const { profile, loading: profileLoading, signOut } = useUser();
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const json = await response.json();

      if (!response.ok) {
        showError(json.error || "Failed to open billing portal");
        return;
      }

      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      showError("Something went wrong.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader title="Settings" description="Manage your account, plan, and preferences." />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-text-muted" />
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account details.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-text-muted">Email</span>
              <p className="text-sm text-text-primary">{profile?.email || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-text-muted">Name</span>
              <p className="text-sm text-text-primary">{profile?.full_name || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-text-muted">Plan</span>
              <div className="mt-0.5">
                <PlanBadge />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-text-muted">Generations Used</span>
              <p className="text-sm text-text-primary">
                {profile?.generations_used ?? 0} / {profile?.generations_limit ?? 3}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-text-muted" />
            <div>
              <CardTitle>Billing</CardTitle>
              <CardDescription>
                Manage your subscription and payment methods.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-surface-2 p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Current Plan</p>
              <PlanBadge />
            </div>
            {profile?.plan !== "free" && (
              <Button
                variant="outline"
                size="sm"
                onClick={openPortal}
                loading={portalLoading}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Manage billing
                  </>
                )}
              </Button>
            )}
          </div>
          {profile?.plan === "free" && (
            <Button asChild className="w-full sm:w-auto">
              <a href="/upgrade">Upgrade plan</a>
            </Button>
          )}
        </CardContent>
      </Card>

      <BrandKitForm />

      <WebhookSettings />

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Sign out</p>
          <p className="text-xs text-text-muted">Sign out of your account on this device.</p>
        </div>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
