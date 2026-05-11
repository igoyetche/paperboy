# PB-008 Bugfix: Cover Icon Breaks Document Image Ordering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a bug where document images appear shifted by one position and the last image is missing when an EPUB contains both a cover chapter and inline document images.

**Architecture:** The cover chapter HTML uses `<img src="data:image/png;base64,...">` for the paperboy icon. epub-gen-memory's `fixHTML` processes every `<img>` tag unconditionally — including data URIs — which adds a phantom entry at index 0 in the internal image list. The sequential fallback in `epub-with-images.ts` then assigns the first document image buffer to that phantom entry, shifting all others by one and leaving the last with no data. Fix 1 removes the `<img>` from the cover HTML by switching to a CSS `background-image` on a `<div>` (epub-gen-memory only scans `<img>` tags, not CSS). Fix 2 adds a defensive guard in the sequential loop to skip any image whose `url` starts with `data:`.

**Tech Stack:** TypeScript, Vitest, epub-gen-memory (internal `fixHTML` in `dist/lib/util/html-parse.js`), sharp (unchanged).

---

## Root Cause Reference

epub-gen-memory's `html-parse.js` `fixHTML`:
```javascript
// line 34–41 — processes every <img> src without exception
(0, css_select_1.selectAll)(allImages, document).forEach(function (element) {
  if (!element.attribs.src)
    removeElement(element);
  else
    element.attribs.src = imgCB.call(_this, element.attribs.src); // calls imgSrc()
});
```

`imgSrc()` adds any unseen `src` value to `this.images` and returns a `"images/<uuid>.<ext>"` path. For a data URI: `mime.getType("data:image/png;base64,...")` returns `''`, so extension is `''`, resulting in `images/<uuid>.` (broken path). This phantom entry is index 0 in `this.images`.

---

## File Map

| Action | Path | Change |
|--------|------|--------|
| Modify | `test/infrastructure/converter/cover-generator.test.ts` | Update icon test: expect CSS background-image, not `<img>` |
| Modify | `src/infrastructure/converter/cover-generator.ts` | Replace `<img src="data:...">` with `<div>` using CSS `background-image` |
| Modify | `src/infrastructure/converter/epub-with-images.ts` | Skip `data:` URI entries in sequential matching loop |

---

## Task 1: Update the failing test (TDD first)

**Files:**
- Modify: `test/infrastructure/converter/cover-generator.test.ts:94-98`

The test at lines 94–98 currently asserts that the cover HTML contains an `<img>` tag. After the fix it should assert the opposite: no `<img>` tag, but a CSS `background-image` containing the base64 data URI.

- [ ] **Step 1.1: Update the icon test in `cover-generator.test.ts`**

Open `test/infrastructure/converter/cover-generator.test.ts`. Find this block (lines 94–98):

```typescript
  it("includes an img tag for the icon", () => {
    const html = generator.generateHtmlChapter("Title", "Claude");
    expect(html).toContain("<img");
    expect(html).toContain("data:image/png;base64,");
  });
```

Replace it with:

```typescript
  it("embeds the icon as a CSS background-image, not an img tag", () => {
    const html = generator.generateHtmlChapter("Title", "Claude");
    expect(html).not.toContain("<img");
    expect(html).toContain("background-image");
    expect(html).toContain("data:image/png;base64,");
  });
```

- [ ] **Step 1.2: Run the test to confirm it fails**

Run from the worktree root (`C:/projects/experiments/paperboy/.worktrees/pb-008-epub-cover`):

```bash
npm test -- --reporter=verbose test/infrastructure/converter/cover-generator.test.ts
```

Expected: the new test fails with something like `expect(html).not.toContain("<img")` — received string that contains `<img`. All other tests in this file should still pass.

---

## Task 2: Fix `cover-generator.ts` — use CSS background-image for icon

**Files:**
- Modify: `src/infrastructure/converter/cover-generator.ts:150,158`

Two lines inside `generateHtmlChapter` need updating.

- [ ] **Step 2.1: Update the `.icon` CSS rule (line 150)**

Find this line in the `<style>` block inside `generateHtmlChapter`:

```typescript
  .icon { width: 120px; height: 120px; margin-bottom: 36px; }
```

Replace with (note: `iconDataUri` is already defined earlier in the method):

```typescript
  .icon { width: 120px; height: 120px; margin-bottom: 36px; background-image: url('${iconDataUri}'); background-size: contain; background-repeat: no-repeat; background-position: center; }
```

- [ ] **Step 2.2: Replace the `<img>` tag with a `<div>` (line 158)**

Find this line in the `<body>` section:

```typescript
  <img class="icon" src="${iconDataUri}" alt="Paperboy"/>
```

Replace with:

```typescript
  <div class="icon" role="img" aria-label="Paperboy"></div>
```

- [ ] **Step 2.3: Run the cover-generator tests to confirm they all pass**

```bash
npm test -- --reporter=verbose test/infrastructure/converter/cover-generator.test.ts
```

Expected: all tests pass, including the updated icon test.

- [ ] **Step 2.4: Commit**

```bash
git -C /c/projects/experiments/paperboy/.worktrees/pb-008-epub-cover add src/infrastructure/converter/cover-generator.ts test/infrastructure/converter/cover-generator.test.ts
git -C /c/projects/experiments/paperboy/.worktrees/pb-008-epub-cover commit -m "fix: PB-008 use CSS background-image for cover icon to prevent epub-gen-memory from treating data URI as downloadable image"
```

---

## Task 3: Add defensive guard in `epub-with-images.ts`

**Files:**
- Modify: `src/infrastructure/converter/epub-with-images.ts:70`

This is defense-in-depth. Even though the cover HTML no longer has a `<img>` data URI, any future caller that passes data URIs in chapter HTML would hit the same bug. Add a `continue` guard at the top of the image matching loop.

- [ ] **Step 3.1: Add the data URI guard**

Open `src/infrastructure/converter/epub-with-images.ts`. Find this loop (around line 70):

```typescript
      for (const image of this.images) {
        // Try exact filename match first
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        let bufferData = imageBufferMap.get(image.filename || "");
```

Add one line at the start of the loop body, immediately after `for (const image of this.images) {`:

```typescript
      for (const image of this.images) {
        // epub-gen-memory processes all <img> src attrs including data: URIs — skip them
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (typeof image.url === "string" && image.url.startsWith("data:")) continue;

        // Try exact filename match first
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        let bufferData = imageBufferMap.get(image.filename || "");
```

- [ ] **Step 3.2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass with no regressions.

- [ ] **Step 3.3: Build to verify TypeScript compiles cleanly**

```bash
npm run build
```

Expected: zero TypeScript errors, no output.

- [ ] **Step 3.4: Commit**

```bash
git -C /c/projects/experiments/paperboy/.worktrees/pb-008-epub-cover add src/infrastructure/converter/epub-with-images.ts
git -C /c/projects/experiments/paperboy/.worktrees/pb-008-epub-cover commit -m "fix: PB-008 skip data URI entries in epub-with-images sequential image matching"
```

---

## Completion Checklist

- [ ] `npm test` passes with 0 failures
- [ ] `npm run build` exits with no TypeScript errors
- [ ] Cover chapter HTML contains no `<img>` tag (icon rendered via CSS)
- [ ] Cover chapter HTML contains `background-image` and `data:image/png;base64,`
- [ ] `epub-with-images.ts` skips any image whose `url` starts with `data:`
