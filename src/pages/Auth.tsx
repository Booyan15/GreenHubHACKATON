import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader2, Sprout, Building2, Landmark, User, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { DEMO_WORKSPACE_KEY } from "@/lib/government/flood";
import { signInLocalDemoUser, signInLocalUser, signUpLocalUser } from "@/lib/local-auth";
import BrandLogo from "@/components/BrandLogo";

const DEMO_PASSWORD = "Demo1234!";
const DEMO_ACCOUNTS = [
  { role: "Farmer", email: "farmer@demo.satelles.mk", icon: Sprout, blurb: "2 fields · wheat & grapes" },
  { role: "Enterprise", email: "enterprise@demo.satelles.mk", icon: Building2, blurb: "3 estates · agribusiness" },
  { role: "Government", email: "gov@demo.satelles.mk", icon: Landmark, blurb: "Skopje flood operations", workspace: "skopje" },
  {
    role: "Venice Gov",
    email: "venice.gov@demo.satelles.mk",
    loginEmail: "gov@demo.satelles.mk",
    icon: Landmark,
    blurb: "Acqua alta response demo",
    workspace: "venice",
  },
  { role: "Citizen", email: "citizen@demo.satelles.mk", icon: User, blurb: "Skopje resident · alerts only" },
  { role: "Admin", email: "admin@demo.satelles.mk", icon: ShieldCheck, blurb: "Full platform access" },
] as const;

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const redirect = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, navigate, redirect]);

  function setDemoWorkspace(workspace?: DemoAccount["workspace"]) {
    if (workspace) localStorage.setItem(DEMO_WORKSPACE_KEY, workspace);
    else localStorage.removeItem(DEMO_WORKSPACE_KEY);
  }

  async function signInDemoEmail(authEmail: string) {
    if (!isSupabaseConfigured) {
      signInLocalDemoUser(authEmail);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: DEMO_PASSWORD,
    });
    if (!error) return;

    toast({ title: "Preparing demo accounts…", description: "This only happens once." });
    const { error: fnErr } = await supabase.functions.invoke("seed-demo-accounts");
    if (fnErr) throw fnErr;

    const retry = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: DEMO_PASSWORD,
    });
    if (retry.error) throw retry.error;
  }

  async function seedAndLogin(account: DemoAccount) {
    setSeeding(true);
    try {
      setDemoWorkspace(account.workspace);
      await signInDemoEmail("loginEmail" in account ? account.loginEmail : account.email);
      navigate(redirect, { replace: true });
    } catch (e) {
      setDemoWorkspace(undefined);
      toast({ title: "Demo login failed", description: String((e as Error).message ?? e), variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const isVeniceDemo = normalizedEmail === "venice.gov@demo.satelles.mk" && password === DEMO_PASSWORD;
      setDemoWorkspace(isVeniceDemo ? "venice" : undefined);

      if (isVeniceDemo) {
        await signInDemoEmail("gov@demo.satelles.mk");
        navigate(redirect, { replace: true });
        return;
      }

      if (!isSupabaseConfigured) {
        signInLocalUser({ email, password });
        navigate(redirect, { replace: true });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate(redirect, { replace: true });
    } catch (error) {
      setDemoWorkspace(undefined);
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Invalid login credentials",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!isSupabaseConfigured) {
        signUpLocalUser({ email, password, name });
        toast({
          title: "Account created",
          description: "Signed in locally for this browser.",
        });
        navigate(redirect, { replace: true });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: name },
        },
      });

      if (error) throw error;

      toast({
        title: "Check your inbox",
        description: "We sent you a confirmation link to activate your account.",
      });
      setTab("signin");
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: error instanceof Error ? error.message : "Could not create account",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <BrandLogo className="h-10 w-10" />
          <span className="text-lg font-semibold tracking-tight">SATELLES</span>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live satellite intelligence for your land, business and country.
          </p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email-in">Email</Label>
                  <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@farm.mk" />
                </div>
                <div>
                  <Label htmlFor="pw-in">Password</Label>
                  <Input id="pw-in" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="h-11 w-full rounded-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="name-up">Full name</Label>
                  <Input id="name-up" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Marko Stojanov" />
                </div>
                <div>
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@farm.mk" />
                </div>
                <div>
                  <Label htmlFor="pw-up">Password</Label>
                  <Input id="pw-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="h-11 w-full rounded-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms and privacy policy.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-card/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium tracking-tight">Try a demo account</p>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">no signup</span>
          </div>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => {
              const { role, email: demoEmail, icon: Icon, blurb } = account;
              return (
              <button
                key={demoEmail}
                onClick={() => seedAndLogin(account)}
                disabled={seeding}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 text-left transition hover:border-foreground/30 hover:shadow-sm disabled:opacity-50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{role}</span>
                  <span className="block text-xs text-muted-foreground">{blurb}</span>
                </span>
                {seeding ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">Enter →</span>
                )}
              </button>
            );
            })}
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Shared password: <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
