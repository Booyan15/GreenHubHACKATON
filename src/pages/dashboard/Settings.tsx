import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { getLocalUserProfile, updateLocalUserProfile } from "@/lib/local-auth";

export default function Settings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      const profile = getLocalUserProfile();
      setFullName(profile.full_name);
      setOrganization(profile.organization);
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase.from("profiles").select("full_name, organization").eq("id", user.id).maybeSingle();
      if (error) {
        toast({ title: "Couldn't load settings", description: error.message, variant: "destructive" });
      } else {
        setFullName(data?.full_name ?? "");
        setOrganization(data?.organization ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);

    if (!isSupabaseConfigured) {
      try {
        updateLocalUserProfile({ fullName, organization });
        toast({ title: "Profile updated", description: "Changes saved locally for this browser." });
      } catch (error) {
        toast({
          title: "Couldn't save",
          description: error instanceof Error ? error.message : "Local settings could not be saved.",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName, organization });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your profile and preferences.</p>
      </div>
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div>
          <Label htmlFor="fn">Full name</Label>
          <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="org">Organization</Label>
          <Input id="org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Tikveš Winery" />
        </div>
        <Button onClick={save} disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
