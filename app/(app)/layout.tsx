import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { UsageProvider } from "@/components/providers/usage-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AuthProvider>
      <UsageProvider>
        <div className="min-h-screen bg-[#F8FAFC]">
          <div className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
            <Sidebar />
          </div>
          <div className="min-h-screen lg:pl-64">
            <Topbar />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </div>
      </UsageProvider>
    </AuthProvider>
  );
}
