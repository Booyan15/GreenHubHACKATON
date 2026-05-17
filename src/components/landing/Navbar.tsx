import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => passwordRef.current?.focus(), 80);
    } else {
      setPassword("");
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    navigate("/dashboard/map");
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "glass border-b border-border/60" : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9" />
            <span className="text-[17px] font-semibold tracking-tight">SATELLES</span>
          </a>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setModalOpen(true)}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              className="rounded-full px-4"
              onClick={() => navigate("/dashboard/map")}
            >
              Start free
            </Button>
          </div>
        </nav>
      </header>

      {/* ── Sign In Modal ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl border border-border bg-white p-8 shadow-2xl dark:bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-foreground">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
              Sign in to your SATELLES account
            </p>

            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  readOnly
                  defaultValue="example@gmail.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-border dark:bg-muted dark:text-muted-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-muted-foreground">
                  Password
                </label>
                <input
                  ref={passwordRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter 'demo'"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-border dark:bg-background"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-full bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
