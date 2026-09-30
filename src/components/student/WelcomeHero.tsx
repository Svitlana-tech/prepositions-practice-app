/** The blue block that opens the first-launch screens: the app icon's three cards
 *  ("in · on · at") fanned out, the app name and one line under it. */
export function WelcomeHero({ subtitle }: { subtitle: string }) {
  return (
    <div
      className="menu-enter -mx-5 rounded-b-[28px] px-5 pb-6 pt-6 text-center"
      style={{ background: "#1565C0", ["--i" as string]: 0 }}
    >
      <div style={{ position: "relative", width: 196, height: 112, margin: "0 auto" }}>
        <FanCard word="in" style={{ left: 8, top: 12, transform: "rotate(-14deg)" }} />
        <FanCard word="at" style={{ right: 8, top: 12, transform: "rotate(14deg)" }} />
        <FanCard word="on" white style={{ left: 63, top: 2, width: 70, height: 98, zIndex: 1 }} />
      </div>
      <h1 className="mt-3 text-[27px] font-bold text-white">Preposition Master</h1>
      <p className="mt-1.5 text-[15px]" style={{ color: "#D6E6FA" }}>
        {subtitle}
      </p>
    </div>
  );
}

function FanCard({ word, style, white }: { word: string; style: React.CSSProperties; white?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        width: 64,
        height: 90,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        fontSize: 23,
        fontWeight: 700,
        background: white ? "#FFFFFF" : "#E3F2FD",
        color: "#1565C0",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.18)",
        ...style,
      }}
    >
      {word}
    </div>
  );
}
