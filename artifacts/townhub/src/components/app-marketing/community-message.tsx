export function AppMarketingCommunityMessage() {
  return (
    <section id="about" className="py-20 bg-primary text-white relative overflow-hidden scroll-mt-24">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />
      <div className="container mx-auto px-4 max-w-[1280px] relative z-10">
        <div className="max-w-3xl">
          <p className="text-townhub-orange text-sm font-bold tracking-widest uppercase mb-6">
            Made for community
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-8 leading-tight text-white">
            Local information shouldn&apos;t
            <br />
            be hard to find.
          </h2>
          <div className="w-16 h-1 bg-townhub-orange mb-8 rounded-full" aria-hidden />
          <p className="text-xl md:text-2xl text-white/80 leading-relaxed mb-12 max-w-2xl font-sans">
            TownHub brings the people, businesses, events, and updates that make a community special
            into one convenient place.
          </p>
          <ul className="flex flex-col sm:flex-row gap-6 sm:gap-12">
            {[
              "Know what's happening",
              "Find and support local businesses",
              "Stay connected close to home",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-townhub-orange shrink-0" aria-hidden />
                <span className="text-white/90 font-medium text-[17px] md:text-[18px] font-sans">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
