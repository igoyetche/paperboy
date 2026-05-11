import { INK, PAPER, ACCENT_INK, FONT_FAMILY } from "./tokens.js";

export function buildCoverCss(): string {
  return `@font-face {
  font-family: "${FONT_FAMILY}";
  src: url("fonts/inter-bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: ${PAPER}; font-family: "${FONT_FAMILY}", Helvetica, Arial, sans-serif; }
.cover { width: 100%; min-height: 100%; background: ${PAPER}; }
.brut-bar { background: ${INK}; color: ${PAPER}; padding: 1.1em 8%; overflow: hidden; }
.brut-bar .edition { float: right; font-size: 0.88em; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: ${PAPER}; opacity: 0.6; padding-top: 0.08em; }
.brut-bar .kicker { display: block; font-size: 1.05em; font-weight: 700; letter-spacing: 0.5em; text-transform: uppercase; color: ${PAPER}; }
.brut-body { padding: 9% 8% 6%; min-height: 15em; }
.title { font-weight: 800; line-height: 1.02; letter-spacing: -0.03em; text-transform: uppercase; color: ${INK}; }
.brut-footer { padding: 1.4em 8%; min-height: 9em; overflow: hidden; }
.brut-footer .icon { float: right; width: 5.4em; height: 5.4em; display: block; }
.byline { padding-top: 0.6em; }
.byline .author { font-size: 1.2em; font-weight: 700; letter-spacing: 0.04em; color: ${ACCENT_INK}; margin: 0 0 0.35em; }
.byline .source { font-size: 0.75em; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: ${ACCENT_INK}; opacity: 0.85; }`;
}
