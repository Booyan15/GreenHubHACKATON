const partners = [
  "Tikveš",
  "Pelagonija",
  "Stobi",
  "EVN",
  "ELEM",
  "Crisis Mgmt.",
  "Ministry of Agriculture",
];

export default function LogoCloud() {
  return (
    <section className="border-y border-border/60 bg-card/60">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Trusted across the Balkans
        </p>
        <div className="mt-6 grid grid-cols-2 items-center gap-x-8 gap-y-4 sm:grid-cols-4 lg:grid-cols-7">
          {partners.map((p) => (
            <div
              key={p}
              className="text-center text-base font-semibold tracking-tight text-muted-foreground/80"
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}