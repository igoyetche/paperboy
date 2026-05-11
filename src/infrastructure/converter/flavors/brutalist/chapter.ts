import type { ChapterInput } from "../../../../domain/ports.js";
import { accentFor, issueNumberFor } from "../_shared/palette.js";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function titleFontSize(title: string): string {
  const wc = title.trim().split(/\s+/).filter(Boolean).length;
  if (wc <= 4) return "6.4em";
  if (wc <= 7) return "4.9em";
  if (wc <= 10) return "4.1em";
  if (wc <= 14) return "3.4em";
  return "2.9em";
}

export function buildHtmlChapter(input: ChapterInput): string {
  const { title, author, sourceDomain, iconDataUri } = input;

  const seed = sourceDomain ?? title;
  const accent = accentFor(seed);
  const issueNumber = issueNumberFor(seed);
  const hasAuthor = author !== "";
  const fontSize = titleFontSize(title);

  let authorLine: string;
  let sourceLine: string;
  if (hasAuthor) {
    authorLine = `<p class="author">${escapeXml(author)}</p>`;
    sourceLine = sourceDomain !== undefined
      ? `\n      <p class="source">${escapeXml(sourceDomain)}</p>`
      : "";
  } else {
    authorLine = sourceDomain !== undefined
      ? `<p class="author">${escapeXml(sourceDomain.toUpperCase())}</p>`
      : "";
    sourceLine = "";
  }

  const iconHtml = iconDataUri !== undefined
    ? `\n    <img class="icon" src="${iconDataUri}" alt="" />`
    : "";

  return `<div class="cover">
  <div class="brut-bar">
    <span class="edition">&#x2116; ${issueNumber}</span>
    <span class="kicker">Paperboy</span>
  </div>
  <div class="brut-body">
    <h1 class="title" style="font-size:${fontSize};">${escapeXml(title)}</h1>
  </div>
  <div class="brut-footer" style="background:${accent};">${iconHtml}
    <div class="byline">
      ${authorLine}${sourceLine}
    </div>
  </div>
</div>`;
}
