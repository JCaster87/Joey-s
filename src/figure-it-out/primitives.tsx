import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BODY, C, DISPLAY } from "./theme";

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const usePop = (start: number, damping = 11, stiffness = 140) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - start,
    fps,
    config: { damping, stiffness, mass: 0.8 },
  });
};

// Smooth closed blob through n points, wobbling radius.
export const blobPath = (
  cx: number,
  cy: number,
  r: number,
  amp: number,
  lobes: number,
  phase: number,
  n = 36,
) => {
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const rr =
      r *
      (1 +
        amp * Math.sin(lobes * t + phase) +
        amp * 0.45 * Math.sin((lobes + 3) * t - phase * 1.7));
    return [cx + rr * Math.cos(t), cy + rr * Math.sin(t)];
  });
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d + " Z";
};

// Rotating two-tone sunburst, like the 90s Nick set walls.
export const Sunburst: React.FC<{
  a?: string;
  b?: string;
  rays?: number;
  speed?: number;
}> = ({ a = C.purple, b = C.deep, rays = 18, speed = 0.12 }) => {
  const frame = useCurrentFrame();
  const R = 1600;
  const step = 360 / rays;
  return (
    <AbsoluteFill style={{ backgroundColor: b }}>
      <svg width={1920} height={1080} viewBox="-960 -540 1920 1080">
        <g transform={`rotate(${frame * speed})`}>
          {Array.from({ length: rays }, (_, i) => {
            const a0 = (i * step * Math.PI) / 180;
            const a1 = ((i * step + step / 2) * Math.PI) / 180;
            return (
              <path
                key={i}
                d={`M0 0 L ${R * Math.cos(a0)} ${R * Math.sin(a0)} L ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`}
                fill={a}
              />
            );
          })}
        </g>
        <defs>
          <radialGradient id="vig">
            <stop offset="0.35" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.55} />
          </radialGradient>
        </defs>
        <rect x={-960} y={-540} width={1920} height={1080} fill="url(#vig)" />
      </svg>
    </AbsoluteFill>
  );
};

// Drifting question marks and puzzle pieces.
export const Floaties: React.FC<{ count?: number; seed?: string; opacity?: number }> = ({
  count = 16,
  seed = "fio",
  opacity = 0.9,
}) => {
  const frame = useCurrentFrame();
  const colors = [C.yellow, C.orange, C.teal, C.slime, C.pink];
  return (
    <AbsoluteFill style={{ opacity }}>
      {Array.from({ length: count }, (_, i) => {
        const x = random(`${seed}x${i}`) * 1920;
        const baseY = random(`${seed}y${i}`) * 1300;
        const size = 50 + random(`${seed}s${i}`) * 90;
        const v = 0.6 + random(`${seed}v${i}`) * 1.2;
        const y = ((baseY - frame * v + 1300) % 1300) - 110;
        const rot =
          Math.sin(frame / 28 + i) * 18 + random(`${seed}r${i}`) * 40 - 20;
        const color = colors[i % colors.length];
        const isPiece = i % 3 === 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `rotate(${rot}deg)`,
            }}
          >
            {isPiece ? (
              <PuzzlePiece size={size} color={color} />
            ) : (
              <span
                style={{
                  fontFamily: DISPLAY,
                  fontSize: size * 1.3,
                  color,
                  WebkitTextStroke: `6px ${C.ink}`,
                  paintOrder: "stroke",
                  textShadow: `5px 6px 0 ${C.ink}`,
                }}
              >
                ?
              </span>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const PuzzlePiece: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path
      d="M20 30 H40 A10 10 0 1 1 60 30 H80 V50 A10 10 0 1 1 80 70 V90 H20 V70 A10 10 0 1 0 20 50 Z"
      fill={color}
      stroke={C.ink}
      strokeWidth={6}
      strokeLinejoin="round"
    />
  </svg>
);

// Slime band across the top with drips that grow over `progress`.
export const SlimeDrip: React.FC<{
  progress: number;
  band?: number;
  seed?: string;
  width?: number;
  color?: string;
  maxLen?: number;
  count?: number;
}> = ({
  progress,
  band = 70,
  seed = "drip",
  width = 1920,
  color = C.slime,
  maxLen = 260,
  count = 14,
}) => {
  const frame = useCurrentFrame();
  const bandH = band * Math.min(1, progress * 3);
  let wave = `M 0 0 H ${width} V ${bandH}`;
  for (let x = width; x >= 0; x -= 40) {
    wave += ` L ${x} ${bandH + Math.sin(x / 70 + frame / 10) * 8}`;
  }
  wave += " Z";
  const drips = Array.from({ length: count }, (_, i) => {
    const x = ((i + 0.5) / count) * width + (random(`${seed}${i}`) - 0.5) * 80;
    const w = 26 + random(`${seed}w${i}`) * 34;
    const delay = random(`${seed}d${i}`) * 0.35;
    const p = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
    const len =
      bandH +
      p * (maxLen * (0.35 + random(`${seed}l${i}`) * 0.65)) +
      Math.sin(frame / 9 + i) * 4 * p;
    return { x, w, len };
  });
  return (
    <svg
      width={width}
      height={band + maxLen + 40}
      style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
    >
      <g fill={color} stroke={C.slimeDark} strokeWidth={5}>
        <path d={wave} />
        {drips.map(({ x, w, len }, i) => (
          <path
            key={i}
            d={`M ${x - w / 2} 0 L ${x - w / 2} ${len} A ${w / 2} ${w / 2} 0 0 0 ${x + w / 2} ${len} L ${x + w / 2} 0 Z`}
          />
        ))}
      </g>
      {/* cover inner seams between band and drips */}
      <path d={wave} fill={color} />
      <g fill="#fff" opacity={0.35}>
        {drips.map(({ x, w, len }, i) =>
          len > bandH + 20 ? (
            <rect
              key={i}
              x={x - w / 4}
              y={bandH}
              width={w / 6}
              height={len - bandH - 4}
              rx={w / 12}
            />
          ) : null,
        )}
        <rect x={0} y={8} width={width} height={6} rx={3} />
      </g>
    </svg>
  );
};

// Full-screen slime pour used as the exit transition.
export const SlimeWipe: React.FC<{ progress: number }> = ({ progress }) => {
  if (progress <= 0) return null;
  const e = Easing.in(Easing.cubic)(progress);
  const band = e * 1300;
  return (
    <AbsoluteFill>
      <SlimeDrip
        progress={1}
        band={Math.max(1, band)}
        maxLen={260}
        seed="wipe"
        count={18}
      />
    </AbsoluteFill>
  );
};

// Billy the Answer Head: a purple stone head with a letter slot.
export const Billy: React.FC<{ size?: number; letters?: string; blink?: boolean }> = ({
  size = 520,
  letters = "?",
}) => {
  const frame = useCurrentFrame();
  const browBob = Math.sin(frame / 12) * 3;
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 400 540">
      <defs>
        <linearGradient id="billyG" x1="0" x2="1">
          <stop offset="0" stopColor={C.violet} />
          <stop offset="0.55" stopColor={C.purple} />
          <stop offset="1" stopColor={C.deep} />
        </linearGradient>
      </defs>
      {/* head */}
      <path
        d="M80 60 Q200 0 320 60 L340 360 Q330 470 260 520 H140 Q70 470 60 360 Z"
        fill="url(#billyG)"
        stroke={C.ink}
        strokeWidth={10}
        strokeLinejoin="round"
      />
      {/* letter slot */}
      <rect x={95} y={70} width={210} height={84} rx={12} fill={C.ink} />
      {letters.split("").map((ch, i, arr) => {
        const w = 200 / arr.length;
        return (
          <g key={i}>
            <rect
              x={100 + i * w + 3}
              y={76}
              width={w - 6}
              height={72}
              rx={8}
              fill={C.yellow}
            />
            <text
              x={100 + i * w + w / 2}
              y={132}
              textAnchor="middle"
              fontFamily={DISPLAY}
              fontSize={54}
              fill={C.purple}
            >
              {ch}
            </text>
          </g>
        );
      })}
      {/* brow */}
      <path
        d={`M70 ${190 + browBob} Q200 ${160 + browBob} 330 ${190 + browBob} L330 ${222 + browBob} Q200 ${196 + browBob} 70 ${222 + browBob} Z`}
        fill={C.deep}
        stroke={C.ink}
        strokeWidth={8}
      />
      {/* eyes */}
      <ellipse cx={140} cy={250} rx={34} ry={20} fill={C.ink} />
      <ellipse cx={260} cy={250} rx={34} ry={20} fill={C.ink} />
      {/* long nose */}
      <path
        d="M185 225 L172 380 Q200 400 228 380 L215 225 Z"
        fill={C.violet}
        stroke={C.ink}
        strokeWidth={8}
        strokeLinejoin="round"
      />
      {/* mouth */}
      <path
        d="M135 440 Q200 425 265 440"
        stroke={C.ink}
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
      />
      {/* stone cracks / highlight */}
      <path d="M95 300 L110 330 L100 360" stroke={C.deep} strokeWidth={5} fill="none" />
      <path d="M110 75 Q130 40 200 34" stroke={C.lilac} strokeWidth={8} fill="none" opacity={0.6} strokeLinecap="round" />
    </svg>
  );
};

// Answer-board letter tile flipping into place.
export const Tile: React.FC<{
  ch: string;
  start: number;
  size: number;
  bg?: string;
  fg?: string;
}> = ({ ch, start, size, bg = C.yellow, fg = C.purple }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - start, fps, config: { damping: 9, stiffness: 160 } });
  const rot = interpolate(s, [0, 1], [-100, 0]);
  if (ch === " ") return <div style={{ width: size * 0.45 }} />;
  return (
    <div style={{ perspective: 900 }}>
      <div
        style={{
          width: size,
          height: size * 1.15,
          margin: size * 0.04,
          borderRadius: size * 0.12,
          background: bg,
          border: `${size * 0.06}px solid ${C.ink}`,
          boxShadow: `${size * 0.06}px ${size * 0.08}px 0 ${C.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotateX(${rot}deg)`,
          transformOrigin: "50% 0%",
          opacity: frame < start ? 0 : 1,
          fontFamily: DISPLAY,
          fontSize: size * 0.9,
          color: fg,
          paddingTop: size * 0.12,
          boxSizing: "border-box",
        }}
      >
        {ch}
      </div>
    </div>
  );
};

// Splat badge (blobby shape with outline + offset shadow).
export const Splat: React.FC<{
  size: number;
  color?: string;
  children?: React.ReactNode;
  wobble?: boolean;
}> = ({ size, color = C.orange, children, wobble = true }) => {
  const frame = useCurrentFrame();
  const phase = wobble ? frame / 14 : 0;
  const d = blobPath(100, 100, 80, 0.07, 7, phase);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ position: "absolute", overflow: "visible" }}>
        <path d={d} fill={C.ink} transform="translate(6 8)" />
        <path d={d} fill={color} stroke={C.ink} strokeWidth={7} />
        <ellipse cx={72} cy={62} rx={22} ry={10} fill="#fff" opacity={0.4} transform="rotate(-30 72 62)" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Rubber stamp slam.
export const Stamp: React.FC<{
  text: string;
  start: number;
  color?: string;
  rotate?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}> = ({ text, start, color = C.red, rotate = -12, fontSize = 80, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 260 } });
  const scale = interpolate(s, [0, 1], [2.6, 1]);
  const opacity = interpolate(frame - start, [0, 3], [0, 0.92], clamp);
  return (
    <div
      style={{
        position: "absolute",
        transform: `rotate(${rotate}deg) scale(${scale})`,
        opacity,
        border: `${fontSize * 0.09}px solid ${color}`,
        borderRadius: fontSize * 0.18,
        padding: `${fontSize * 0.1}px ${fontSize * 0.3}px 0`,
        color,
        fontFamily: DISPLAY,
        fontSize,
        letterSpacing: 2,
        whiteSpace: "nowrap",
        mixBlendMode: "multiply",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// Chunky outlined display text.
export const Chunky: React.FC<{
  children: React.ReactNode;
  size: number;
  color?: string;
  stroke?: number;
  style?: React.CSSProperties;
}> = ({ children, size, color = C.yellow, stroke, style }) => (
  <div
    style={{
      fontFamily: DISPLAY,
      fontSize: size,
      color,
      lineHeight: 1,
      WebkitTextStroke: `${stroke ?? size * 0.08}px ${C.ink}`,
      paintOrder: "stroke",
      textShadow: `${size * 0.05}px ${size * 0.07}px 0 ${C.ink}`,
      paddingTop: size * 0.1,
      ...style,
    }}
  >
    {children}
  </div>
);

// Cream "game card" panel with ink outline, offset shadow and a slime lip.
export const Card: React.FC<{
  width: number;
  height: number;
  enter: number;
  children: React.ReactNode;
  bg?: string;
  rotate?: number;
  drip?: boolean;
}> = ({ width, height, enter, children, bg = C.cream, rotate = -1.5, drip = true }) => {
  const scale = interpolate(enter, [0, 1], [0.6, 1]);
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        transform: `scale(${scale}) rotate(${rotate * enter}deg)`,
        opacity: Math.min(1, enter * 2),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: bg,
          border: `8px solid ${C.ink}`,
          borderRadius: 28,
          boxShadow: `14px 16px 0 ${C.ink}`,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      {drip && (
        <div style={{ position: "absolute", top: -6, left: 0, borderRadius: 28, overflow: "visible" }}>
          <SlimeDrip progress={enter} band={26} maxLen={90} width={width} count={8} seed={`card${width}`} />
        </div>
      )}
    </div>
  );
};

// Stand-in for the darkened, blurred TV-room plate the real edit sits on.
export const FootageStandIn: React.FC<{ note?: string }> = ({
  note = "footage / TV room plays here",
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 45%, #3b2a55 0%, #1d1430 55%, #0c0814 100%)`,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 40,
        bottom: 30,
        fontFamily: BODY,
        fontWeight: 500,
        fontSize: 24,
        color: "rgba(255,255,255,0.28)",
        letterSpacing: 1,
      }}
    >
      {note}
    </div>
  </AbsoluteFill>
);

// Corner label: pop in, settle, clean exit.
export const CornerLabel: React.FC<{
  title: string;
  sub?: string;
  start: number;
  end: number;
  corner?: "bl" | "tl" | "br";
  accent?: string;
}> = ({ title, sub, start, end, corner = "bl", accent = C.slime }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 170 } });
  const outP = interpolate(frame, [end - 8, end], [0, 1], clamp);
  if (frame < start || frame > end) return null;
  const x = interpolate(inS, [0, 1], [-520, 0]) - outP * 520;
  const pos: React.CSSProperties =
    corner === "bl"
      ? { left: 60, bottom: 70 }
      : corner === "tl"
        ? { left: 60, top: 60 }
        : { right: 60, bottom: 70 };
  const dir = corner === "br" ? -1 : 1;
  return (
    <div
      style={{
        position: "absolute",
        ...pos,
        transform: `translateX(${x * dir}px) rotate(${-2 * inS}deg)`,
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <div style={{ width: 22, background: accent, border: `5px solid ${C.ink}`, borderRight: "none", borderRadius: "14px 0 0 14px" }} />
      <div
        style={{
          background: C.purple,
          border: `5px solid ${C.ink}`,
          borderRadius: "0 14px 14px 0",
          boxShadow: `8px 9px 0 ${C.ink}`,
          padding: "14px 30px 12px 24px",
        }}
      >
        <div style={{ fontFamily: DISPLAY, fontSize: 46, color: C.yellow, lineHeight: 1, paddingTop: 6 }}>{title}</div>
        {sub && (
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 28, color: C.cream, marginTop: 6 }}>{sub}</div>
        )}
      </div>
    </div>
  );
};

// Word-by-word reveal.
export const WordReveal: React.FC<{
  text: string;
  start: number;
  perWord?: number;
  style?: React.CSSProperties;
  highlight?: string[];
}> = ({ text, start, perWord = 4, style, highlight = [] }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", ...style }}>
      {words.map((w, i) => {
        const t = frame - start - i * perWord;
        const o = interpolate(t, [0, 5], [0, 1], clamp);
        const y = interpolate(t, [0, 6], [18, 0], { ...clamp, easing: Easing.out(Easing.back(2)) });
        const hl = highlight.includes(w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase());
        return (
          <span
            key={i}
            style={{
              opacity: o,
              transform: `translateY(${y}px)`,
              marginRight: "0.28em",
              color: hl ? C.slimeDark : undefined,
              background: hl ? `linear-gradient(transparent 55%, ${C.slimeLight} 55%)` : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Counter: React.FC<{
  to: number;
  start: number;
  dur?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ to, start, dur = 30, prefix = "", suffix = "", style }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [start, start + dur], [0, to], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <span style={style}>
      {prefix}
      {Math.round(v)}
      {suffix}
    </span>
  );
};
