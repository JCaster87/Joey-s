import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Figure It Out (Nickelodeon, 1997): purple Billy the Answer Head,
// green slime, orange splats, loud primary accents.
export const C = {
  deep: "#22094F",
  purple: "#5E22B8",
  violet: "#8A4DE6",
  lilac: "#C8A6FF",
  slime: "#7FD81E",
  slimeDark: "#3F8A0A",
  slimeLight: "#D2FF6A",
  orange: "#FF7A00",
  yellow: "#FFD21F",
  teal: "#19C6D6",
  pink: "#FF4FA3",
  cream: "#FFF5DC",
  ink: "#1A0736",
  red: "#E8202A",
  rim: "#BFE6FF",
};

export const DISPLAY = "Luckiest Guy";
export const BODY = "Fredoka";

export const fontsReady = Promise.all([
  loadFont({
    family: DISPLAY,
    url: staticFile("fonts/luckiest-guy-latin-400-normal.woff2"),
  }),
  ...[500, 600, 700].map((w) =>
    loadFont({
      family: BODY,
      url: staticFile(`fonts/fredoka-latin-${w}-normal.woff2`),
      weight: String(w),
    }),
  ),
]);
