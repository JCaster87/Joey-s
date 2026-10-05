import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  Series,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Billy,
  Card,
  Chunky,
  CornerLabel,
  Counter,
  FootageStandIn,
  Floaties,
  SlimeDrip,
  SlimeWipe,
  Splat,
  Stamp,
  Sunburst,
  Tile,
  WordReveal,
  blobPath,
  clamp,
  usePop,
} from "./primitives";
import { BODY, C, DISPLAY, fontsReady } from "./theme";

// ---------------------------------------------------------------------------
// 1. Chapter title card
// ---------------------------------------------------------------------------
export const TitleCard: React.FC<{ chapter: number; lines: string[] }> = ({ chapter, lines }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const billyIn = usePop(4, 13, 120);
  const badge = usePop(10, 9, 180);
  const drip = interpolate(frame, [0, 70], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const wipe = interpolate(frame, [durationInFrames - 22, durationInFrames], [0, 1], clamp);
  const tileStart = 18;
  const looks = [
    { size: 92, bg: C.cream, fg: C.purple },
    { size: 140, bg: C.yellow, fg: C.purple },
    { size: 140, bg: C.slime, fg: C.ink },
  ];
  let offset = tileStart;
  const rows = lines.map((text, r) => {
    const row = { text, offset, ...looks[Math.min(r, looks.length - 1)] };
    offset += text.length * 3;
    return row;
  });
  const allIn = offset + 10;
  const drop = interpolate(frame, [allIn, allIn + 12], [-200, 612], {
    ...clamp,
    easing: Easing.in(Easing.quad),
  });
  const splatP = usePop(allIn + 12, 8, 200);
  const billyLetters = frame < allIn ? "???" : "!!!";

  return (
    <AbsoluteFill>
      <Sunburst />
      <Floaties seed="title" count={14} opacity={0.8} />

      {/* Billy rises from the bottom-left */}
      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: interpolate(billyIn, [0, 1], [-700, -90]),
          transform: `rotate(${Math.sin(frame / 20) * 2}deg)`,
        }}
      >
        <Billy size={430} letters={billyLetters} />
      </div>

      {/* Answer-board tiles */}
      <div style={{ position: "absolute", left: 560, right: 40, top: 270, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {rows.map((row, r) => (
          <div key={r} style={{ display: "flex", marginBottom: 4 }}>
            {row.text.split("").map((ch, i) => (
              <Tile key={i} ch={ch} start={row.offset + i * 3} size={row.size} bg={row.bg} fg={row.fg} />
            ))}
          </div>
        ))}
      </div>

      {/* A glob drops and splats on the corner of the board */}
      {frame >= allIn && (
        <svg width={1920} height={1080} style={{ position: "absolute" }}>
          {splatP < 0.05 ? (
            <path d={blobPath(285, drop, 34, 0.05, 3, frame / 3)} fill={C.slime} stroke={C.slimeDark} strokeWidth={5} />
          ) : (
            <g transform={`translate(285 612) scale(${0.4 + splatP * 0.8}, ${0.4 + splatP * 0.55})`}>
              <path d={blobPath(0, 0, 70, 0.2, 9, 1.3)} fill={C.slime} stroke={C.slimeDark} strokeWidth={6} />
              <ellipse cx={-18} cy={-20} rx={20} ry={9} fill="#fff" opacity={0.45} />
            </g>
          )}
        </svg>
      )}

      <SlimeDrip progress={drip} seed="titleTop" maxLen={170} />
      {/* Chapter badge */}
      <div
        style={{
          position: "absolute",
          right: 70,
          top: 60,
          transform: `scale(${badge}) rotate(${-10 + Math.sin(frame / 15) * 3}deg)`,
        }}
      >
        <Splat size={250} color={C.orange}>
          <div style={{ fontFamily: DISPLAY, fontSize: 40, color: C.cream, WebkitTextStroke: `3px ${C.ink}`, paintOrder: "stroke", paddingTop: 8 }}>
            CHAPTER
          </div>
          <div style={{ fontFamily: DISPLAY, fontSize: 110, color: C.yellow, WebkitTextStroke: `6px ${C.ink}`, paintOrder: "stroke", lineHeight: 0.9 }}>
            {chapter}
          </div>
        </Splat>
      </div>
      <SlimeWipe progress={wipe} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 2. Slime's birth certificate
// ---------------------------------------------------------------------------
const CertRow: React.FC<{ k: string; v: string; at: number }> = ({ k, v, at }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 8], [0, 1], clamp);
  const w = interpolate(frame, [at, at + 14], [0, 100], clamp);
  return (
    <div style={{ display: "flex", alignItems: "baseline", margin: "14px 0", opacity: o }}>
      <div style={{ width: 300, fontFamily: BODY, fontWeight: 700, fontSize: 30, color: C.purple, letterSpacing: 2 }}>{k}</div>
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 44, color: C.ink, clipPath: `inset(0 ${100 - w}% 0 0)` }}>{v}</div>
        <div style={{ height: 3, background: C.purple, opacity: 0.4, marginTop: 4 }} />
      </div>
    </div>
  );
};

export const BirthCertificate: React.FC = () => {
  const enter = usePop(0, 14, 120);
  return (
    <AbsoluteFill>
      <FootageStandIn />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Card width={1300} height={860} enter={enter} bg={C.cream}>
          <div style={{ position: "absolute", inset: 22, border: `6px double ${C.purple}`, borderRadius: 18 }} />
          <div style={{ padding: "120px 110px 60px" }}>
            <div style={{ textAlign: "center", fontFamily: BODY, fontWeight: 700, fontSize: 30, color: C.purple, letterSpacing: 8 }}>
              OFFICIAL RECORD
            </div>
            <Chunky size={86} color={C.slime} style={{ textAlign: "center", marginBottom: 30 }}>
              CERTIFICATE OF LIVE SLIME
            </Chunky>
            <CertRow k="NAME" v="Slime (green)" at={16} />
            <CertRow k="BORN" v="1979 · Ottawa, Canada" at={30} />
            <CertRow k="PARENT" v="You Can't Do That on Television" at={44} />
            <CertRow k="TRIGGER WORDS" v={'"I don\'t know."'} at={58} />
          </div>
        </Card>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Stamp text="REUSED BY FIGURE IT OUT" start={110} color={C.red} rotate={-9} fontSize={72} style={{ marginTop: 600 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3. Secret slime action card
// ---------------------------------------------------------------------------
export const SecretSlimeAction: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 12, 140);
  const strike = interpolate(frame, [45, 58], [0, 100], clamp);
  const reveal = usePop(60, 10, 170);
  return (
    <AbsoluteFill>
      <FootageStandIn />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Card width={1240} height={560} enter={enter} bg={C.purple} rotate={2}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <Chunky size={66} color={C.slime}>SECRET SLIME ACTION</Chunky>
            <div style={{ position: "relative", marginTop: 34, fontFamily: BODY, fontWeight: 700, fontSize: 64, color: C.cream }}>
              Saying "I don't know"
              <div style={{ position: "absolute", left: 0, top: "52%", height: 10, width: `${strike}%`, background: C.red, borderRadius: 5 }} />
            </div>
            <div style={{ transform: `scale(${reveal}) rotate(${-3 * reveal}deg)`, marginTop: 30 }}>
              <Chunky size={92} color={C.yellow}>BEING DANNY TAMBERELLI</Chunky>
            </div>
          </AbsoluteFill>
        </Card>
      </AbsoluteFill>
      <CornerLabel title="REPORTED" sub="per fan pages · no paper trail" start={75} end={148} corner="br" accent={C.orange} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 4. Danny quote card
// ---------------------------------------------------------------------------
const Headshot: React.FC<{ initials: string; size: number }> = ({ initials, size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: `10px solid ${C.rim}`,
      boxShadow: `0 0 0 6px ${C.ink}, 10px 12px 0 6px ${C.ink}`,
      background: `linear-gradient(160deg, ${C.violet}, ${C.deep})`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    <div style={{ fontFamily: DISPLAY, fontSize: size * 0.32, color: C.cream, paddingTop: size * 0.05 }}>{initials}</div>
    <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: size * 0.075, color: C.lilac }}>photo goes here</div>
  </div>
);

export const QuoteCard: React.FC<{
  quote: string;
  name: string;
  source: string;
  initials: string;
  highlight?: string[];
}> = ({ quote, name, source, initials, highlight }) => {
  const enter = usePop(0, 13, 130);
  const ring = usePop(6, 10, 150);
  const attr = usePop(18 + quote.split(" ").length * 4, 12, 150);
  return (
    <AbsoluteFill>
      <FootageStandIn />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Card width={1500} height={640} enter={enter}>
          <div style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 80px", gap: 70 }}>
            <div style={{ transform: `scale(${ring}) rotate(${(1 - ring) * -40}deg)` }}>
              <Headshot initials={initials} size={330} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 180, color: C.orange, lineHeight: 0.6, height: 70, WebkitTextStroke: `6px ${C.ink}`, paintOrder: "stroke" }}>
                “
              </div>
              <WordReveal
                text={quote}
                start={18}
                highlight={highlight}
                style={{ justifyContent: "flex-start", fontFamily: BODY, fontWeight: 700, fontSize: 58, lineHeight: 1.25, color: C.ink }}
              />
              <div style={{ marginTop: 34, opacity: attr, transform: `translateX(${(1 - attr) * 40}px)` }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 46, color: C.purple, paddingTop: 6 }}>— {name}</div>
                <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: C.purple, opacity: 0.75 }}>{source}</div>
              </div>
            </div>
          </div>
        </Card>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 5. Danny's slime-o-meter
// ---------------------------------------------------------------------------
const Gauge: React.FC<{ value: number; max: number; start: number }> = ({ value, max, start }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [start, start + 45], [0, value], { ...clamp, easing: Easing.out(Easing.cubic) });
  const level = v / max;
  const bubbles = Array.from({ length: 6 }, (_, i) => {
    const y = 560 - (((frame * (1.5 + i * 0.3) + i * 90) % 520));
    return { x: 60 + ((i * 47) % 160), y };
  });
  return (
    <div style={{ position: "relative", width: 300, height: 600 }}>
      <svg width={300} height={600} viewBox="0 0 300 600">
        <defs>
          <clipPath id="tube">
            <rect x={40} y={20} width={220} height={560} rx={110} />
          </clipPath>
        </defs>
        <rect x={40} y={20} width={220} height={560} rx={110} fill={C.deep} />
        <g clipPath="url(#tube)">
          <rect x={0} y={580 - 560 * level} width={300} height={600} fill={C.slime} />
          <path
            d={`M 0 ${580 - 560 * level} ${Array.from({ length: 16 }, (_, i) => `L ${i * 20} ${580 - 560 * level + Math.sin(i / 1.5 + frame / 5) * 7}`).join(" ")} L 300 ${580 - 560 * level} L 300 600 L 0 600 Z`}
            fill={C.slimeLight}
            opacity={0.5}
          />
          {bubbles.map((b, i) =>
            b.y > 580 - 560 * level ? <circle key={i} cx={b.x} cy={b.y} r={9} fill="#fff" opacity={0.4} /> : null,
          )}
        </g>
        <rect x={40} y={20} width={220} height={560} rx={110} fill="none" stroke={C.ink} strokeWidth={12} />
        <rect x={80} y={70} width={22} height={300} rx={11} fill="#fff" opacity={0.25} />
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={225} x2={260} y1={580 - 560 * t} y2={580 - 560 * t} stroke={C.ink} strokeWidth={8} />
        ))}
      </svg>
    </div>
  );
};

const StatRow: React.FC<{ n: number; label: string; at: number; prefix?: string; color?: string }> = ({
  n,
  label,
  at,
  prefix = "",
  color = C.yellow,
}) => {
  const p = usePop(at, 11, 160);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, margin: "10px 0", opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * 80}px)` }}>
      <Chunky size={110} color={color} style={{ width: 290, textAlign: "right" }}>
        <Counter to={n} start={at} dur={24} prefix={prefix} />
      </Chunky>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 44, color: C.cream }}>{label}</div>
    </div>
  );
};

export const DannyMeter: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 12, 140);
  return (
    <AbsoluteFill>
      <Sunburst a={C.purple} b={C.deep} speed={0.06} />
      <SlimeDrip progress={interpolate(frame, [0, 60], [0, 1], clamp)} seed="meter" maxLen={160} />
      <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", transform: `scale(${head})` }}>
        <Chunky size={92} color={C.slime}>THE DANNY SLIME-O-METER</Chunky>
      </div>
      <div style={{ position: "absolute", left: 260, top: 330 }}>
        <Gauge value={200} max={220} start={20} />
        <Chunky size={70} color={C.cream} style={{ position: "absolute", top: 250, width: 300, textAlign: "center", transform: "rotate(-6deg)" }}>
          ~<Counter to={200} start={20} dur={45} />
        </Chunky>
      </div>
      <div style={{ position: "absolute", left: 680, top: 350 }}>
        <StatRow n={4} label="shows taped a day" at={30} />
        <StatRow n={3} label="showers a day (at least)" at={54} color={C.teal} />
        <StatRow n={96} label="episodes on the panel" at={78} color={C.orange} />
        <StatRow n={200} prefix="~" label={'times slimed ("maybe")'} at={102} color={C.slime} />
      </div>
      <div style={{ position: "absolute", left: 1180, top: 900 }}>
        <Stamp text="≈ 2 PER SHOW" start={150} color={C.yellow} rotate={-8} fontSize={84} style={{ mixBlendMode: "normal", background: C.ink, borderColor: C.yellow }} />
      </div>
      <CornerLabel title="KENNY: 1 PER EPISODE" sub="Danny was doing doubles" start={195} end={268} corner="tl" accent={C.orange} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 6. Three secret recipes
// ---------------------------------------------------------------------------
const RecipeCard: React.FC<{
  who: string;
  source: string;
  items: string[];
  at: number;
  color: string;
  tilt: number;
}> = ({ who, source, items, at, color, tilt }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 11, 140);
  return (
    <div style={{ transform: `translateY(${(1 - p) * 700}px) rotate(${tilt}deg)` }}>
      <div
        style={{
          width: 500,
          height: 600,
          background: C.cream,
          border: `8px solid ${C.ink}`,
          borderRadius: 24,
          boxShadow: `12px 14px 0 ${C.ink}`,
          overflow: "hidden",
          backgroundImage: `repeating-linear-gradient(transparent 0 58px, ${C.lilac}66 58px 61px)`,
        }}
      >
        <div style={{ background: color, borderBottom: `8px solid ${C.ink}`, padding: "22px 0 10px", textAlign: "center" }}>
          <Chunky size={54} color={C.cream}>{who}</Chunky>
        </div>
        <div style={{ padding: "26px 34px" }}>
          {items.map((it, i) => {
            const t = at + 16 + i * 9;
            const o = interpolate(frame, [t, t + 6], [0, 1], clamp);
            return (
              <div key={i} style={{ opacity: o, transform: `translateX(${(1 - o) * -30}px)`, fontFamily: BODY, fontWeight: 600, fontSize: 38, color: C.ink, lineHeight: "61px", display: "flex", gap: 14 }}>
                <span style={{ color: C.slimeDark }}>●</span>
                {it}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", bottom: 22, width: "100%", textAlign: "center", fontFamily: BODY, fontWeight: 600, fontSize: 24, color: C.purple, opacity: 0.8 }}>
          {source}
        </div>
      </div>
    </div>
  );
};

export const Recipes: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 12, 140);
  const vault = usePop(200, 12, 150);
  return (
    <AbsoluteFill>
      <FootageStandIn />
      <div style={{ position: "absolute", top: 60, width: "100%", textAlign: "center", transform: `scale(${head})` }}>
        <Chunky size={84} color={C.slime}>OFFICIAL SLIME RECIPE</Chunky>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 34, color: C.cream, marginTop: 4 }}>according to three people who sat in it</div>
      </div>
      <div style={{ position: "absolute", top: 260, width: "100%", display: "flex", justifyContent: "center", gap: 60 }}>
        <RecipeCard who="SUMMER" source="MTV News, 2015" color={C.teal} at={20} tilt={-3} items={["Vanilla pudding", "Green coloring", "Refrigerated", '"So freezing"']} />
        <RecipeCard who="LORI BETH" source="Vice, 2014" color={C.orange} at={60} tilt={1.5} items={["Oatmeal", "Applesauce", "Green coloring"]} />
        <RecipeCard who="DANNY" source="Reddit AMA, 2012" color={C.pink} at={100} tilt={-1} items={["Pudding", "Food coloring", "Water", '"Icy cold refreshness"']} />
      </div>
      {frame >= 200 && (
        <AbsoluteFill style={{ background: `rgba(12,6,24,${0.85 * vault})`, alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `scale(${vault})`, display: "flex", gap: 50 }}>
            <Splat size={430} color={C.red} wobble={false}>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 36, color: C.cream }}>Coca-Cola</div>
              <Chunky size={170} color={C.cream}>1</Chunky>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 30, color: C.cream }}>secret formula</div>
            </Splat>
            <Splat size={430} color={C.slime}>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 36, color: C.ink }}>Nickelodeon</div>
              <Chunky size={170} color={C.yellow}>3</Chunky>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 30, color: C.ink }}>secret formulas</div>
            </Splat>
          </div>
          <Stamp text="DANNY ATE ALL OF THEM" start={235} color={C.yellow} rotate={-6} fontSize={64} style={{ marginTop: 560, mixBlendMode: "normal", background: C.ink, borderColor: C.yellow }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 7. Mined from the center of the Earth
// ---------------------------------------------------------------------------
export const CenterOfTheEarth: React.FC = () => {
  const frame = useCurrentFrame();
  const globe = usePop(0, 13, 120);
  const cut = interpolate(frame, [20, 45], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const arrow = usePop(55, 10, 160);
  const rings = [
    { r: 300, c: "#3A7BD5", label: "" },
    { r: 250, c: "#8B5A2B", label: "crust" },
    { r: 190, c: C.orange, label: "mantle" },
    { r: 120, c: C.slime, label: "" },
  ];
  return (
    <AbsoluteFill>
      <Sunburst a="#2b1160" b={C.deep} speed={0.05} />
      <Floaties seed="earth" count={8} opacity={0.35} />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <g transform={`translate(700 560) scale(${globe}) rotate(${frame * 0.15})`}>
          {rings.map((ring, i) => (
            <circle key={i} r={ring.r} fill={ring.c} stroke={C.ink} strokeWidth={8} />
          ))}
          <path d={blobPath(0, 0, 70, 0.12, 5, frame / 8)} fill={C.slimeLight} opacity={0.7} />
        </g>
        {/* ocean/land overlay that slides away to reveal the layers */}
        <g transform={`translate(700 560) scale(${globe})`} opacity={1 - cut}>
          <circle r={300} fill="#3A7BD5" stroke={C.ink} strokeWidth={8} />
          <path d={blobPath(-80, -60, 110, 0.25, 4, 0.7)} fill="#3FAE4A" stroke={C.ink} strokeWidth={6} />
          <path d={blobPath(120, 110, 80, 0.3, 3, 2.1)} fill="#3FAE4A" stroke={C.ink} strokeWidth={6} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 1080, top: 300, width: 760, opacity: arrow, transform: `translateX(${(1 - arrow) * 80}px)` }}>
        <Chunky size={70} color={C.slime}>SLIME ORIGIN:</Chunky>
        <Chunky size={92} color={C.yellow} style={{ marginTop: 10 }}>THE CENTER OF THE EARTH</Chunky>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 38, color: C.cream, marginTop: 24 }}>
          what the kids on set were told
        </div>
        <svg width={360} height={120} style={{ position: "absolute", left: -330, top: 200 }}>
          <path d="M340 20 Q200 10 40 90" stroke={C.yellow} strokeWidth={14} fill="none" strokeLinecap="round" strokeDasharray={420} strokeDashoffset={420 * (1 - arrow)} />
          <path d="M40 90 L 90 88 M40 90 L 62 46" stroke={C.yellow} strokeWidth={14} strokeLinecap="round" opacity={arrow > 0.9 ? 1 : 0} />
        </svg>
      </div>
      <CornerLabel title="LORI BETH DENBERG" sub="Vice, 2014" start={70} end={160} corner="br" accent={C.orange} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 8. Steve Burns label over footage
// ---------------------------------------------------------------------------
export const SteveBurns: React.FC = () => (
  <AbsoluteFill>
    <FootageStandIn note="footage: Steve Burns gets slimed" />
    <CornerLabel title="STEVE BURNS" sub="Blue's Clues · guest panelist" start={6} end={70} />
    <CornerLabel title={'SLIMED FOR: "HAVING A BLUE DOG"'} sub="reported" start={74} end={132} accent={C.teal} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// 9. The misspelled press release
// ---------------------------------------------------------------------------
export const PressRelease: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 14, 130);
  const circle = interpolate(frame, [40, 62], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const billy = usePop(95, 10, 150);
  return (
    <AbsoluteFill>
      <FootageStandIn />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Card width={1200} height={760} enter={enter} bg="#FBFBF7" drip={false} rotate={1.5}>
          <div style={{ padding: "60px 80px", fontFamily: BODY, color: "#333" }}>
            <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: 6, color: C.orange }}>FOR IMMEDIATE RELEASE · 2012</div>
            <div style={{ fontWeight: 700, fontSize: 52, margin: "18px 0 30px", color: C.ink }}>Figure It Out returns to Nickelodeon</div>
            {[92, 80, 88].map((w, i) => (
              <div key={i} style={{ height: 22, width: `${w}%`, background: "#d9d6cf", borderRadius: 6, margin: "16px 0" }} />
            ))}
            <div style={{ position: "relative", display: "inline-block", fontWeight: 600, fontSize: 48, margin: "22px 0", color: C.ink }}>
              Guest panelist: Sherman <span style={{ position: "relative" }}>
                Helmsley
                <svg width={340} height={140} style={{ position: "absolute", left: 0, top: -36, overflow: "visible" }}>
                  <ellipse cx={112} cy={50} rx={124} ry={56} fill="none" stroke={C.red} strokeWidth={9} strokeDasharray={700} strokeDashoffset={700 * (1 - circle)} transform="rotate(-4 112 50)" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            {[70, 85].map((w, i) => (
              <div key={i} style={{ height: 22, width: `${w}%`, background: "#d9d6cf", borderRadius: 6, margin: "16px 0" }} />
            ))}
          </div>
          <div style={{ position: "absolute", right: 30, bottom: 18, fontFamily: BODY, fontWeight: 600, fontSize: 22, color: "#999" }}>recreation</div>
        </Card>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Stamp text="IT'S HEMSLEY" start={68} rotate={-10} fontSize={96} style={{ marginLeft: 560, marginTop: 420 }} />
      </AbsoluteFill>
      {/* Billy peeks in from the right, judging */}
      <div style={{ position: "absolute", right: interpolate(billy, [0, 1], [-420, -60]), top: 300, transform: "rotate(-14deg)" }}>
        <Billy size={300} letters="SIC" />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// The chapter reel
// ---------------------------------------------------------------------------
export const SEGMENTS = [
  { name: "title", dur: 180 },
  { name: "birth", dur: 240 },
  { name: "action", dur: 150 },
  { name: "quote", dur: 210 },
  { name: "meter", dur: 270 },
  { name: "recipes", dur: 300 },
  { name: "earth", dur: 165 },
  { name: "steve", dur: 135 },
  { name: "press", dur: 180 },
] as const;

export const SLIME_FACTORY_FRAMES = SEGMENTS.reduce((a, s) => a + s.dur, 0);

const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    fontsReady.then(() => continueRender(handle));
  }, [handle]);
};

export const SlimeFactoryChapter: React.FC = () => {
  useFonts();
  const d = Object.fromEntries(SEGMENTS.map((s) => [s.name, s.dur]));
  return (
    <AbsoluteFill style={{ backgroundColor: C.deep }}>
      <Series>
        <Series.Sequence durationInFrames={d.title}>
          <TitleCard chapter={3} lines={["THE", "SLIME", "FACTORY"]} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d.birth}>
          <BirthCertificate />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d.action}>
          <SecretSlimeAction />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d.quote}>
          <QuoteCard
            quote="Whatever they could do to slime me at least three times a day."
            name="Danny Tamberelli"
            source="Reddit AMA, 2017"
            initials="DT"
            highlight={["three"]}
          />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d.meter}>
          <DannyMeter />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d.recipes}>
          <Recipes />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d.earth}>
          <CenterOfTheEarth />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d.steve}>
          <SteveBurns />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d.press}>
          <PressRelease />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};

export const TitleCardOnly: React.FC = () => {
  useFonts();
  return <TitleCard chapter={3} lines={["THE", "SLIME", "FACTORY"]} />;
};
