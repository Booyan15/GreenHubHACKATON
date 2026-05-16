import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  text: string;
  label?: string;
};

/** Small “?” / info control with an ELI5 explanation on hover. */
export default function Eli5InfoTip({ text, label = "More information" }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border/80 bg-muted/60 text-muted-foreground transition hover:border-primary/40 hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={label}
        >
          <Info className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-[280px] border-border/80 bg-card px-3.5 py-3 text-sm normal-case leading-relaxed tracking-normal shadow-elegant"
      >
        {formatEli5Text(text)}
      </TooltipContent>
    </Tooltip>
  );
}

function formatEli5Text(text: string) {
  const paragraphs = text.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return text.trim();
  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}
