import type { ChapterInput } from "../../../../domain/ports.js";
import { accentFor, issueNumberFor } from "../_shared/palette.js";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildHtmlChapter(input: ChapterInput): string {
  const { title, author, sourceDomain } = input;

  const seed = sourceDomain ?? title;
  const accent = accentFor(seed);
  const issueNumber = issueNumberFor(seed);

  const hasAuthor = author !== "";
  let primaryByline: string;
  if (hasAuthor) {
    primaryByline = escapeXml(author);
  } else if (sourceDomain === undefined) {
    primaryByline = "";
  } else {
    primaryByline = escapeXml(sourceDomain.toUpperCase());
  }
  const secondaryLine = hasAuthor && sourceDomain !== undefined
    ? `\n    <div class="source">${escapeXml(sourceDomain)}</div>`
    : "";

  return `<div class="cover">
  <header class="masthead">
    <span class="kicker">PAPERBOY</span>
    <span class="issue">№ ${issueNumber}</span>
  </header>
  <h1 class="title">${escapeXml(title)}</h1>
  <footer class="footer" style="background:${accent};">
    <div class="byline">${primaryByline}</div>${secondaryLine}
  </footer>
</div>`;
}
