import type { SatoriNode, ThumbnailInput } from "../../../../domain/ports.js";
import { accentFor, issueNumberFor } from "../_shared/palette.js";
import { scale } from "../_shared/scale.js";
import { INK, PAPER, ACCENT_INK, FONT_FAMILY } from "./tokens.js";

const DESIGN_WIDTH = 600;

function getTitleSizing(wordCount: number): { fontSize: number; lineHeight: number } {
  if (wordCount <= 4) return { fontSize: 104, lineHeight: 1.02 };
  if (wordCount <= 7) return { fontSize: 80, lineHeight: 1.04 };
  if (wordCount <= 10) return { fontSize: 67, lineHeight: 1.05 };
  if (wordCount <= 14) return { fontSize: 56, lineHeight: 1.08 };
  return { fontSize: 48, lineHeight: 1.1 };
}

export function buildThumbnail(input: ThumbnailInput): SatoriNode {
  const { titleLines, author, iconDataUri, width, height, sourceDomain } = input;
  const s = (v: number) => scale(width, DESIGN_WIDTH, v);

  const joinedTitle = titleLines.join(" ");
  const seed = sourceDomain ?? (joinedTitle || author);

  const accent = accentFor(seed);
  const issueNumber = issueNumberFor(seed);

  const wordCount = joinedTitle.split(/\s+/).filter(Boolean).length;
  const { fontSize: titleFontSize, lineHeight: titleLineHeight } = getTitleSizing(wordCount);

  const mastheadNode: SatoriNode = {
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        width: "100%",
        backgroundColor: INK,
        paddingTop: s(30),
        paddingBottom: s(30),
        paddingLeft: s(40),
        paddingRight: s(40),
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex" as const,
              fontSize: s(26),
              fontWeight: 700,
              fontFamily: FONT_FAMILY,
              color: PAPER,
              letterSpacing: s(8),
            },
            children: "PAPERBOY",
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex" as const,
              fontSize: s(22),
              fontWeight: 700,
              fontFamily: FONT_FAMILY,
              color: PAPER,
              letterSpacing: s(4),
              opacity: 0.6,
            },
            children: `№ ${issueNumber}`,
          },
        },
      ],
    },
  };

  const titleLineNodes: SatoriNode[] = titleLines.map((line) => ({
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "row" as const,
        width: "100%",
        fontSize: s(titleFontSize),
        fontWeight: 800,
        fontFamily: FONT_FAMILY,
        color: INK,
        lineHeight: titleLineHeight,
        letterSpacing: -2,
      },
      children: line.toUpperCase(),
    },
  }));

  const titleHeroNode: SatoriNode = {
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "column" as const,
        justifyContent: "flex-start" as const,
        flex: 1,
        paddingTop: s(60),
        paddingBottom: s(20),
        paddingLeft: s(40),
        paddingRight: s(40),
      },
      children: titleLineNodes,
    },
  };

  let primaryByline: string;
  if (author === "") {
    primaryByline = sourceDomain === undefined ? "" : sourceDomain.toUpperCase();
  } else {
    primaryByline = author;
  }

  const bylineChildren: SatoriNode[] = [
    {
      type: "div",
      props: {
        style: { display: "flex" as const },
        children: primaryByline,
      },
    },
  ];

  if (author !== "" && sourceDomain !== undefined) {
    bylineChildren.push({
      type: "div",
      props: {
        style: {
          display: "flex" as const,
          fontSize: s(18),
          letterSpacing: s(4),
          marginTop: s(8),
          opacity: 0.85,
          color: ACCENT_INK,
        },
        children: sourceDomain.toUpperCase(),
      },
    });
  }

  const bylineNode: SatoriNode = {
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "column" as const,
        justifyContent: "center" as const,
        fontSize: s(24),
        fontWeight: 700,
        fontFamily: FONT_FAMILY,
        letterSpacing: s(1),
        color: ACCENT_INK,
      },
      children: bylineChildren,
    },
  };

  const footerChildren: SatoriNode[] = [bylineNode];

  if (iconDataUri !== undefined) {
    const iconContainerSize = s(130);
    const iconPadding = s(10);
    footerChildren.push({
      type: "div",
      props: {
        style: {
          display: "flex" as const,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          backgroundColor: PAPER,
          width: iconContainerSize,
          height: iconContainerSize,
          padding: iconPadding,
        },
        children: {
          type: "img",
          props: {
            src: iconDataUri,
            width: iconContainerSize - iconPadding * 2,
            height: iconContainerSize - iconPadding * 2,
          },
        },
      },
    });
  }

  const footerNode: SatoriNode = {
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        width: "100%",
        backgroundColor: accent,
        paddingTop: s(20),
        paddingBottom: s(20),
        paddingLeft: s(40),
        paddingRight: s(40),
        minHeight: s(160),
      },
      children: footerChildren,
    },
  };

  return {
    type: "div",
    props: {
      style: {
        display: "flex" as const,
        flexDirection: "column" as const,
        width,
        height,
        backgroundColor: PAPER,
        fontFamily: FONT_FAMILY,
      },
      children: [mastheadNode, titleHeroNode, footerNode],
    },
  };
}
