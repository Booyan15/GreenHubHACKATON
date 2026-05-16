import { cn } from "@/lib/utils";

export default function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/satelles_logo.png"
      alt="SATELLES"
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
