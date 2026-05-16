import { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function StatCard({
  label,
  value,
  hint,
  icon,
  info,
  tone = "text-foreground",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  info?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{label}</span>
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`About ${label}`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-80 normal-case tracking-normal">
                <div className="space-y-1 text-sm leading-relaxed">{info}</div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="shrink-0">{icon}</span>
      </div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${tone}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
