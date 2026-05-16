import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_WORKSPACE_KEY, getFloodWorkspace, isGovernmentWorkspace } from "@/lib/government/flood";

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isGovernment = isGovernmentWorkspace(user?.email);
  const workspace = isGovernment ? getFloodWorkspace(user?.email) : null;

  async function handleSignOut() {
    localStorage.removeItem(DEMO_WORKSPACE_KEY);
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {isGovernment ? "Live · Sentinel-1 · Sentinel-2 · CEMS · Open-Meteo" : "Live · Sentinel-2 · Open-Meteo"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground md:inline">
                {workspace?.authority ?? user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
