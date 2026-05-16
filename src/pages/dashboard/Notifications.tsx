import { useEffect, useState } from "react";
import { BellRing, Loader2, Mail, Megaphone, MessageSquare, RadioTower, Send, Smartphone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { getFloodWorkspace, isGovernmentWorkspace, riskBadgeClass } from "@/lib/government/flood";

type RiskLevel = "low" | "medium" | "high" | "critical";

type Prefs = {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  phone_number: string | null;
  min_risk_level: RiskLevel;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

const defaults: Prefs = {
  email_enabled: true,
  push_enabled: false,
  sms_enabled: false,
  phone_number: "",
  min_risk_level: "medium",
  quiet_hours_start: null,
  quiet_hours_end: null,
};

const levels: { value: RiskLevel; label: string; desc: string }[] = [
  { value: "low", label: "Low", desc: "Send everything — even informational nudges." },
  { value: "medium", label: "Medium", desc: "Notify me when there's something worth acting on." },
  { value: "high", label: "High", desc: "Only urgent risks like drought, fire or frost." },
  { value: "critical", label: "Critical only", desc: "Reserved for emergencies — minimum noise." },
];

export default function Notifications() {
  const { user } = useAuth();
  const isGovernment = isGovernmentWorkspace(user?.email);
  const workspace = getFloodWorkspace(user?.email);
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushBlocked, setPushBlocked] = useState(false);
  const [announcementZoneId, setAnnouncementZoneId] = useState(workspace.zones[0]?.id ?? "");
  const selectedAnnouncementZone =
    workspace.zones.find((zone) => zone.id === announcementZoneId) ?? workspace.zones[0];
  const [announcement, setAnnouncement] = useState(selectedAnnouncementZone?.announcement ?? "");
  const [smsChannel, setSmsChannel] = useState(true);
  const [pushChannel, setPushChannel] = useState(true);
  const [sirenChannel, setSirenChannel] = useState(isGovernment);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("email_enabled, push_enabled, sms_enabled, phone_number, min_risk_level, quiet_hours_start, quiet_hours_end")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Couldn't load preferences", description: error.message, variant: "destructive" });
      } else if (data) {
        setPrefs({ ...defaults, ...data, phone_number: data.phone_number ?? "" });
      }
      setLoading(false);
    })();
  }, [user]);

  async function togglePush(next: boolean) {
    if (!next) {
      setPrefs((p) => ({ ...p, push_enabled: false }));
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushBlocked(true);
      toast({
        title: "Push not supported",
        description: "This browser doesn't support notifications.",
        variant: "destructive",
      });
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      setPushBlocked(true);
      toast({
        title: "Permission denied",
        description: "Enable notifications in your browser settings to receive push alerts.",
        variant: "destructive",
      });
      return;
    }
    setPushBlocked(false);
    setPrefs((p) => ({ ...p, push_enabled: true }));
    new Notification("SATELLES alerts enabled", {
      body: "You'll be notified when risk crosses your threshold.",
      icon: "/satelles_logo.png",
    });
  }

  async function save() {
    if (!user) return;
    if (prefs.sms_enabled && !prefs.phone_number?.trim()) {
      toast({ title: "Phone number required", description: "Add a number for SMS alerts.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          email_enabled: prefs.email_enabled,
          push_enabled: prefs.push_enabled,
          sms_enabled: prefs.sms_enabled,
          phone_number: prefs.phone_number?.trim() || null,
          min_risk_level: prefs.min_risk_level,
          quiet_hours_start: prefs.quiet_hours_start,
          quiet_hours_end: prefs.quiet_hours_end,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Preferences saved", description: "We'll alert you when risk crosses your threshold." });
    }
  }

  function sendAnnouncement() {
    if (!selectedAnnouncementZone) return;
    toast({
      title: "Announcement queued",
      description: `${selectedAnnouncementZone.affectedPeople.toLocaleString()} residents in ${selectedAnnouncementZone.cityPart} targeted across selected channels.`,
    });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          {isGovernment ? <Megaphone className="h-6 w-6" /> : <BellRing className="h-6 w-6" />}
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isGovernment ? "Resident announcements" : "Notifications"}
          </h1>
          <p className="text-muted-foreground">
            {isGovernment
              ? `${workspace.authority} · targeted flood warnings for affected residents.`
              : "Choose how SATELLES alerts you when risk rises across your zones."}
          </p>
        </div>
      </div>

      {isGovernment && (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Send announcement</h2>
              <p className="mt-1 text-sm text-muted-foreground">Zone-targeted public warning with delivery audit.</p>
            </div>
            {selectedAnnouncementZone && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ${riskBadgeClass(selectedAnnouncementZone.risk)}`}>
                {selectedAnnouncementZone.risk}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <Label htmlFor="announcement-zone">Affected zone</Label>
              <Select
                value={announcementZoneId}
                onValueChange={(value) => {
                  const zone = workspace.zones.find((item) => item.id === value);
                  setAnnouncementZoneId(value);
                  setAnnouncement(zone?.announcement ?? "");
                }}
              >
                <SelectTrigger id="announcement-zone" className="mt-1 h-11 rounded-xl">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {workspace.zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-warning" />
                {selectedAnnouncementZone?.affectedPeople.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">targeted residents</p>
            </div>
          </div>

          <div>
            <Label htmlFor="announcement-message">Message</Label>
            <Textarea
              id="announcement-message"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="mt-1 min-h-28 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ChannelRow
              icon={<MessageSquare className="h-5 w-5" />}
              title="SMS"
              desc="Cell broadcast gateway"
              checked={smsChannel}
              onChange={setSmsChannel}
            />
            <ChannelRow
              icon={<BellRing className="h-5 w-5" />}
              title="Push"
              desc="SATELLES resident app"
              checked={pushChannel}
              onChange={setPushChannel}
            />
            <ChannelRow
              icon={<RadioTower className="h-5 w-5" />}
              title="Siren relay"
              desc="Municipal warning relay"
              checked={sirenChannel}
              onChange={setSirenChannel}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={sendAnnouncement} className="h-11 rounded-full px-6" disabled={!announcement.trim()}>
              <Send className="mr-1.5 h-4 w-4" />
              Send announcement
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-lg font-semibold tracking-tight">
          {isGovernment ? "Operator alert channels" : "Channels"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isGovernment ? "Channels for flood command staff." : "Pick where you want to be reached."}
        </p>

        <ChannelRow
          icon={<Mail className="h-5 w-5" />}
          title="Email"
          desc={user?.email ?? "Sent to your account email"}
          checked={prefs.email_enabled}
          onChange={(v) => setPrefs({ ...prefs, email_enabled: v })}
        />
        <ChannelRow
          icon={<BellRing className="h-5 w-5" />}
          title="Push notifications"
          desc={pushBlocked ? "Blocked — enable in browser settings" : "Browser & desktop alerts in real time"}
          checked={prefs.push_enabled}
          onChange={togglePush}
        />
        <ChannelRow
          icon={<MessageSquare className="h-5 w-5" />}
          title="SMS"
          desc="For urgent alerts when offline"
          checked={prefs.sms_enabled}
          onChange={(v) => setPrefs({ ...prefs, sms_enabled: v })}
        />

        {prefs.sms_enabled && (
          <div className="ml-12 mt-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs">
              <Smartphone className="h-3.5 w-3.5" /> Phone number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+389 70 000 000"
              value={prefs.phone_number ?? ""}
              onChange={(e) => setPrefs({ ...prefs, phone_number: e.target.value })}
              className="mt-1"
            />
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Risk threshold</h2>
          <p className="text-sm text-muted-foreground">
            Alert me only when risk reaches at least this level.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {levels.map((l) => {
            const active = prefs.min_risk_level === l.value;
            return (
              <button
                key={l.value}
                type="button"
                onClick={() => setPrefs({ ...prefs, min_risk_level: l.value })}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-primary bg-accent shadow-glow"
                    : "border-border bg-background hover:border-foreground/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{l.label}</span>
                  {active && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                      Selected
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{l.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Quiet hours</h2>
          <p className="text-sm text-muted-foreground">
            We'll hold non-critical alerts during these hours and deliver a digest after.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="qs">From</Label>
            <Input
              id="qs"
              type="time"
              value={prefs.quiet_hours_start ?? ""}
              onChange={(e) => setPrefs({ ...prefs, quiet_hours_start: e.target.value || null })}
            />
          </div>
          <div>
            <Label htmlFor="qe">To</Label>
            <Input
              id="qe"
              type="time"
              value={prefs.quiet_hours_end ?? ""}
              onChange={(e) => setPrefs({ ...prefs, quiet_hours_end: e.target.value || null })}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="h-11 rounded-full px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}

function ChannelRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
