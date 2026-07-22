---
name: CSS import order for Google Fonts
description: Google Fonts must use HTML link tag — @import url() in CSS breaks PostCSS with Tailwind
---

## Rule
Load Google Fonts via `<link rel="stylesheet">` in `index.html`, not via `@import url(...)` in `index.css`.

**Why:** PostCSS processes `@import "tailwindcss"` first, inlining thousands of lines of CSS. Any `@import url()` that follows (even if it's the first line in the source file) violates PostCSS's rule that `@import` must precede all other statements, causing a build error.

**How to apply:** Add `<link rel="preconnect">` and `<link href="...fonts.googleapis.com/...">` in `index.html` `<head>`. Remove any `@import url(...)` from `index.css`.
