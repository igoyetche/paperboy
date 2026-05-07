/**
 * Classic flavor thumbnail — Satori node tree for the Kindle library thumbnail.
 *
 * Returns a structural SatoriNode tree (plain object form, no JSX) that Satori
 * can render to SVG. Layout uses flexbox — no manual coordinate math.
 * Font sizes and padding scale proportionally from the canvas width so the
 * same template renders correctly at all three supported resolutions.
 *
 * Implements FR-37 (PB-026) via the CoverFlavor contract.
 */

import type { SatoriNode, ThumbnailInput } from "../../../../domain/ports.js";
import { COLORS, TYPOGRAPHY } from "../_shared/tokens.js";
import { scale } from "../_shared/scale.js";

/** Native design width — proportional scaling is relative to this baseline. */
const DESIGN_WIDTH = 600;

/**
 * Builds a Satori-compatible node tree for the classic cover thumbnail.
 *
 * Layout (top-to-bottom, centered column):
 *   1. Kicker — "PAPERBOY" in accent color, letter-spaced
 *   2. Title lines — one flex row per wrapped line, bold serif
 *   3. Rule — horizontal accent-colored bar
 *   4. Author — italic byline
 *   5. Icon — bundled PNG, centered, optional
 */
export function buildThumbnail(input: ThumbnailInput): SatoriNode {
  const { titleLines, author, iconDataUri, width, height } = input;

  const s = (v: number) => scale(width, DESIGN_WIDTH, v);

  const kickerFontSize = s(18);
  const titleFontSize = s(68);
  const authorFontSize = s(28);
  const paddingH = s(40);
  const paddingTop = s(60);
  const ruleWidth = s(140);
  const ruleHeight = s(2);
  const ruleMarginTop = s(20);
  const ruleMarginBottom = s(20);
  const kickerMarginBottom = s(30);
  const iconSize = s(320);
  const iconMarginTop = s(30);

  // Build title line nodes — one per wrapped line.
  // Each is a single-child flex row so Satori doesn't complain.
  const titleLineNodes: SatoriNode[] = titleLines.map((line) => ({
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        width: "100%",
        fontSize: titleFontSize,
        fontWeight: "bold" as const,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: "#1a1a1a",
        lineHeight: 1.15,
        whiteSpace: "nowrap" as const,
      },
      children: line,
    },
  }));

  // Kicker node
  const kickerNode: SatoriNode = {
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        fontSize: kickerFontSize,
        fontWeight: "bold" as const,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.accent,
        letterSpacing: s(6),
        marginBottom: kickerMarginBottom,
        width: "100%",
      },
      children: "PAPERBOY",
    },
  };

  // Rule divider
  const ruleNode: SatoriNode = {
    type: "div",
    props: {
      style: {
        width: ruleWidth,
        height: ruleHeight,
        backgroundColor: COLORS.accent,
        marginTop: ruleMarginTop,
        marginBottom: ruleMarginBottom,
      },
    },
  };

  // Author byline
  const authorNode: SatoriNode = {
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        fontSize: authorFontSize,
        fontStyle: "italic" as const,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: "#4a4a4a",
        width: "100%",
      },
      children: `by ${author}`,
    },
  };

  // Wrap text content (kicker, title, rule, author) in a flex: 1 container
  // so it stays at the top and the icon stays at the bottom
  const contentNode: SatoriNode = {
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "column" as const,
        alignItems: "center" as const,
        flex: 1,
        justifyContent: "flex-start" as const,
      },
      children: [kickerNode, ...titleLineNodes, ruleNode, authorNode],
    },
  };

  // Build children list: content wrapper + optional icon
  const children: SatoriNode[] = [contentNode];

  // Append icon node only when a data URI is provided
  if (iconDataUri !== undefined) {
    children.push({
      type: "img",
      props: {
        src: iconDataUri,
        width: iconSize,
        height: iconSize,
        style: {
          marginTop: iconMarginTop,
        },
      },
    });
  }

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        width,
        height,
        backgroundColor: COLORS.background,
        paddingTop,
        paddingLeft: paddingH,
        paddingRight: paddingH,
        paddingBottom: paddingH,
      },
      children,
    },
  };
}
