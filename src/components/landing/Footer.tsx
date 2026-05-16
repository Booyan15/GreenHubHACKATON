import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/60">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9" />
            <span className="text-[15px] font-semibold tracking-tight">SATELLES</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Satelles · Built with Sentinel-2, Galileo & Open-Meteo.
          </p>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <a href="#product" className="hover:text-foreground">Product</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
