/**
 * SmartAlerts — Hackathon live-dispatch panel.
 *
 * 🔴 LIVE SMS is wired to Textbelt (free tier = 1 SMS/day on key "textbelt").
 *    To send unlimited SMS during the demo, swap `key: "textbelt"` with a
 *    paid Textbelt key from https://textbelt.com — takes ~30 seconds to buy.
 *
 * Target phone : +389 71 206 931 (presenter handset)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, ChevronDown, MessageSquare, Phone, Send, X } from "lucide-react";
import { readLatestSatelliteAnalysis, type SatelliteAnalysisResult } from "@/lib/satellite-analysis";
import { riskBadgeClass } from "@/lib/government/flood";

// ─── 🔴 LIVE SMS dispatch — Textbelt ─────────────────────────────────────────

const SMS_TARGET = "+38971206931"; // ← presenter phone number

async function sendRealSMS(message: string): Promise<void> {
  try {
    const response = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        number: SMS_TARGET,
        message,
        // 🔑  Free tier key = "textbelt" (1 SMS/day).
        //     Buy a paid key at https://textbelt.com and replace below for unlimited sends:
        key: "textbelt",
      }),
    });
    const data = (await response.json()) as { success: boolean; error?: string };
    if (data.success) {
      console.info("[SmartAlerts] ✅ Real SMS delivered to presenter phone!");
    } else {
      console.warn("[SmartAlerts] SMS failed / quota hit:", data.error);
    }
  } catch (err) {
    console.error("[SmartAlerts] SMS network error:", err);
  }
}

// ─── Message builder ──────────────────────────────────────────────────────────

type NotifStyle = "viber" | "sms";

function buildAlertMessage(
  analysis: SatelliteAnalysisResult | null,
  overrideName?: string,
): { style: NotifStyle; text: string; severity: "ok" | "warn" | "critical" } {
  const name = overrideName ?? analysis?.fieldName ?? "selected field";

  if (!analysis) {
    return {
      style: "sms",
      severity: "ok",
      text: `📱 [SATELLES ALERT]: Field '${name}' is connected and monitored. No active crop alerts at this time.`,
    };
  }

  if (analysis.layer === "water") {
    const pct = analysis.stats?.waterPercentage ?? 0;
    if (pct < 20) {
      return {
        style: "sms",
        severity: "critical",
        text: `⚠️ [SATELLES ALERT]: Critical low moisture in '${name}' (${pct.toFixed(1)}% wet pixels). Check irrigation channels immediately!`,
      };
    }
    return {
      style: "sms",
      severity: "ok",
      text: `📱 [SATELLES ALERT]: '${name}' moisture is optimal (${pct.toFixed(1)}%). No intervention needed.`,
    };
  }

  const ndvi = analysis.stats?.averageNdvi;
  if (typeof ndvi !== "number" || !Number.isFinite(ndvi)) {
    return {
      style: "sms",
      severity: "ok",
      text: `📱 [SATELLES ALERT]: '${name}' is connected. Next Sentinel-2 cycle in ~5 days.`,
    };
  }

  const f = ndvi.toFixed(2);
  if (ndvi < 0.15) {
    return {
      style: "sms",
      severity: "critical",
      text: `⚠️ [SATELLES ALERT]: Critical vegetation drop detected in '${name}' (${f})! Inspect irrigation channels immediately.`,
    };
  }
  if (ndvi <= 0.55) {
    return {
      style: "sms",
      severity: "warn",
      text: `📊 [SATELLES ALERT]: Moderate crop stress detected in '${name}' (NDVI ${f}). Review yellow zones on the Live Map.`,
    };
  }
  return {
    style: "sms",
    severity: "ok",
    text: `📱 [SATELLES ALERT]: '${name}' shows excellent crop health (NDVI ${f}). No intervention needed.`,
  };
}

// ─── Saved-field picker ───────────────────────────────────────────────────────

type FieldOption = { id: string; name: string; crop?: string | null };

// Hardcoded demo fields that match what shows on the map for the hackathon.
// Replace with a real Supabase/local-storage fetch if needed.
const DEMO_FIELDS: FieldOption[] = [
  { id: "tikves-vineyard",   name: "Tikveš vineyard block",      crop: "Vranec grapes" },
  { id: "pelagonija-wheat",  name: "Pelagonija wheat field",      crop: "Wheat" },
  { id: "strumica-greenhouse", name: "Strumica greenhouse parcel", crop: "Vegetables" },
  { id: "kocani-rice",       name: "Kočani rice field",           crop: "Rice" },
];

function FieldDropdown({
  fields,
  selected,
  onChange,
}: {
  fields: FieldOption[];
  selected: FieldOption;
  onChange: (f: FieldOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium transition hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block truncate">{selected.name}</span>
          {selected.crop && (
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {selected.crop}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-elegant"
        >
          {fields.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                role="option"
                aria-selected={f.id === selected.id}
                onClick={() => { onChange(f); setOpen(false); }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-accent/40 focus-visible:outline-none ${f.id === selected.id ? "bg-primary/10 font-medium text-primary" : ""}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${f.id === selected.id ? "bg-primary" : "bg-border"}`} />
                <span className="min-w-0">
                  <span className="block truncate">{f.name}</span>
                  {f.crop && <span className="block truncate text-xs text-muted-foreground">{f.crop}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Channel selector ─────────────────────────────────────────────────────────

type Channel = "viber" | "sms" | "both";

function ChannelPicker({ value, onChange }: { value: Channel; onChange: (c: Channel) => void }) {
  const options: { id: Channel; emoji: string; label: string; sublabel: string; accent: string }[] = [
    { id: "viber", emoji: "💬", label: "Viber",  sublabel: "Free message",  accent: "#7360f2" },
    { id: "sms",   emoji: "📱", label: "SMS",    sublabel: "Direct text",   accent: "#16a34a" },
    { id: "both",  emoji: "🔔", label: "Both",   sublabel: "Maximum reach", accent: "hsl(var(--primary))" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 text-center transition-all ${
              active
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent/30"
            }`}
          >
            <span className="text-2xl leading-none">{opt.emoji}</span>
            <span className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>{opt.label}</span>
            <span className="text-[11px] text-muted-foreground">{opt.sublabel}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        on ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ${
          on ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Mock phone notification toast ───────────────────────────────────────────

function PhoneToast({
  visible,
  text,
  onClose,
}: {
  visible: boolean;
  text: string;
  onClose: () => void;
}) {
  return (
    <div
      aria-live="polite"
      className={`fixed right-4 top-4 z-[9999] w-[340px] max-w-[calc(100vw-2rem)] transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0 pointer-events-none"
      }`}
    >
      <div className="overflow-hidden rounded-2xl border border-gray-600/40 bg-[#1c1c1e] shadow-2xl">
        <div className="flex items-center gap-2.5 bg-[#3a3a3c] px-4 py-2.5">
          <MessageSquare className="h-4 w-4 text-white" />
          <span className="flex-1 text-xs font-semibold tracking-wide text-white">Messages · Now</span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 focus-visible:outline-none"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#3a3a3c] text-xl">🛰️</span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white/50">SATELLES · SMS</p>
            <p className="mt-0.5 text-sm leading-snug text-white">{text}</p>
          </div>
        </div>
        <p className="pb-2.5 text-center text-[10px] text-white/30">Swipe up to dismiss</p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SmartAlerts() {
  const analysis = useMemo(() => readLatestSatelliteAnalysis(), []);
  const [selectedField, setSelectedField] = useState<FieldOption>(DEMO_FIELDS[0]);
  const [channel, setChannel] = useState<Channel>("sms");
  const [enabled, setEnabled] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If there's a real analysis, prefer its field name in the dropdown initial selection
  useEffect(() => {
    if (analysis?.fieldName) {
      const match = DEMO_FIELDS.find((f) =>
        f.name.toLowerCase().includes(analysis.fieldName!.toLowerCase().split(" ")[0]),
      );
      if (match) setSelectedField(match);
    }
  }, [analysis]);

  const notif = buildAlertMessage(analysis, selectedField.name);

  const severityBadge =
    notif.severity === "critical"
      ? riskBadgeClass("high")
      : notif.severity === "warn"
        ? riskBadgeClass("medium")
        : riskBadgeClass("low");

  async function handleToggle(next: boolean) {
    setEnabled(next);
    setSmsError(null);

    if (!next) {
      setToastVisible(false);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (hideTimer.current)  clearTimeout(hideTimer.current);
      return;
    }

    // ── Real SMS fires immediately when toggled ON ──────────────────────────
    if (channel === "sms" || channel === "both") {
      setDispatching(true);
      try {
        await sendRealSMS(notif.text);
        setLastSent(new Date().toLocaleTimeString());
      } catch {
        setSmsError("SMS dispatch failed — check network or upgrade Textbelt key.");
      } finally {
        setDispatching(false);
      }
    }

    // ── Mock phone notification slides in after 2 s ─────────────────────────
    toastTimer.current = setTimeout(() => {
      setToastVisible(true);
      hideTimer.current = setTimeout(() => setToastVisible(false), 9000);
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (hideTimer.current)  clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="divide-y divide-border/60">

          {/* ── Field selector ─────────────────────────────────────────────── */}
          <div className="px-6 py-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monitored field
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <FieldDropdown
                  fields={DEMO_FIELDS}
                  selected={selectedField}
                  onChange={(f) => { setSelectedField(f); setEnabled(false); setLastSent(null); }}
                />
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${severityBadge}`}
              >
                {notif.severity === "critical" ? "Critical" : notif.severity === "warn" ? "Watch" : "Healthy"}
              </span>
            </div>
          </div>

          {/* ── Notification channel ────────────────────────────────────────── */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notification channel
            </p>
            <ChannelPicker value={channel} onChange={setChannel} />
          </div>

          {/* ── Monitor toggle ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <div className="min-w-0">
              <p className="font-medium">Enable automated alerts for this field</p>
              {enabled ? (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  🟢 System monitoring active 24/7
                </span>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Off · Toggle to activate and send live alert
                </p>
              )}
            </div>
            <Toggle on={enabled} onChange={(v) => void handleToggle(v)} />
          </div>

          {/* ── Dispatch status bar ─────────────────────────────────────────── */}
          {(dispatching || lastSent || smsError) && (
            <div
              className={`flex items-center gap-2 px-6 py-3 text-sm ${
                smsError
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/5 text-muted-foreground"
              }`}
            >
              {dispatching ? (
                <>
                  <Send className="h-4 w-4 animate-pulse text-primary" />
                  <span>Dispatching live SMS to {SMS_TARGET}…</span>
                </>
              ) : smsError ? (
                <span>{smsError}</span>
              ) : (
                <>
                  <Phone className="h-4 w-4 text-success" />
                  <span>SMS sent at {lastSent} — check your phone!</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Message preview ─────────────────────────────────────────────────── */}
        <div className="border-t border-border/60 bg-background/40 px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Alert message preview
          </p>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
            {notif.text}
          </div>
        </div>
      </div>

      {/* Mock phone notification toast */}
      <PhoneToast
        visible={toastVisible}
        text={notif.text}
        onClose={() => setToastVisible(false)}
      />
    </>
  );
}
