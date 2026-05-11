import { INK, PAPER, ACCENT_INK, FONT_FAMILY } from "./tokens.js";

export function buildCoverCss(): string {
  return `@font-face {
  font-family: "${FONT_FAMILY}";
  src: url("fonts/inter-bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
}
html, body { margin: 0; padding: 0; }
body { font-family: "${FONT_FAMILY}", sans-serif; }
.cover { display: flex; flex-direction: column; height: 100vh; background: ${PAPER}; }
.masthead { display: flex; flex-direction: row; justify-content: space-between; align-items: center; background: ${INK}; padding: 1.2em 1.6em; }
.kicker { color: ${PAPER}; font-size: 0.75em; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; }
.issue { color: ${PAPER}; font-size: 0.65em; font-weight: 700; letter-spacing: 0.2em; opacity: 0.6; }
.title { color: ${INK}; font-family: "${FONT_FAMILY}", sans-serif; font-size: 3.4em; font-weight: 800; line-height: 1.05; letter-spacing: -0.03em; text-transform: uppercase; padding: 1.5em 1.2em 0.5em; margin: 0; flex: 1; }
.footer { display: flex; flex-direction: row; align-items: center; padding: 1em 1.6em; min-height: 5em; }
.byline { color: ${ACCENT_INK}; font-size: 0.9em; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.source { color: ${ACCENT_INK}; font-size: 0.7em; letter-spacing: 0.15em; text-transform: uppercase; margin-top: 0.3em; opacity: 0.85; }`;
}
