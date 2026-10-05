import fs from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Cloud sessions can't download Remotion's own Chrome, so use the
// preinstalled headless Chromium when it's present. Elsewhere Remotion
// downloads its own browser as usual.
const preinstalledChromium =
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (fs.existsSync(preinstalledChromium)) {
  Config.setBrowserExecutable(preinstalledChromium);
}
