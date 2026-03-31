# PB-005: URL to Kindle

> Status: Dropped
> Created: 2026-03-05
> Dropped: 2026-03-31
> Reason: Will be approached differently; skill-based approach also removed

## Problem

Users frequently want to send web articles to their Kindle for later reading. Today, Claude must fetch the URL, extract the content, reformat it, and then pass it through `send_to_kindle`. This works but requires multiple manual steps with no standardized workflow.

## Goal

Make "send this URL to my Kindle" a single, reliable action — regardless of how it's implemented under the hood.

## Acceptance Criteria

- User can say "send this article to my Kindle: [url]" and the article arrives on the Kindle
- Title is extracted automatically from the page; user can override it
- Works for standard article pages (blog posts, news articles, documentation)
- Known limitations are documented (paywalls, JS-rendered pages, etc.)

## Scope

The implementation approach is an open question. See `docs/designs/PB-005-url-approach/adr.md` for the decision between server-side extraction vs. skill-driven extraction.
