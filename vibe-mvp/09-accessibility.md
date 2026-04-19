# 09 · Accessibility

Goal: pass WCAG 2.2 AA on the MVP slice. This is not optional. Roughly 1 in 5 people has a disability that affects how they use software.

## AUTONOMOUS — audit and fix

Run the audit yourself, fix what you find, then summarize for the user.

### 1. Semantic HTML pass

- Every page has exactly one `<h1>`. Heading levels never skip.
- Buttons that look like links use `<button>`. Links that look like buttons use `<a>`. Never the reverse.
- Form inputs have associated `<label>`s (or `aria-label`).
- Lists are `<ul>`/`<ol>`, not divs.
- The main page region is wrapped in `<main>`; the nav in `<nav>`; the footer in `<footer>`.

### 2. Keyboard pass

- Tab through every interactive element on the MVP slice. Every focusable element must show a visible focus ring (Tailwind's `focus-visible:ring-2 focus-visible:ring-primary` is fine).
- No keyboard traps. Modal dialogs return focus to the triggering element on close.
- Custom interactive elements (anything that isn't a native button/link/input) implement the appropriate ARIA role + keyboard handlers, or — better — are rebuilt with native elements.

### 3. Color contrast

- Run the page through a contrast checker (or use Chrome DevTools "Issues" panel).
- Body text: 4.5:1 against background. Large text: 3:1.
- Do not rely on color alone to convey meaning (e.g., red borders for errors must also have a text label).

### 4. Screen reader smoke test

- Page `<title>` is meaningful and unique per route.
- Images have `alt` text; decorative images have `alt=""`.
- Icon-only buttons have `aria-label`.
- Live regions (toasts, async results) use `aria-live="polite"`.

### 5. Motion

- If you used animations, respect `prefers-reduced-motion: reduce` and disable non-essential motion.

## DIALOGUE — confirm with the user

After the fixes, tell the user:
- What you found and fixed (1–2 lines per category).
- One thing you'd like them to test by tabbing through manually.

## Exit criteria

- Chrome DevTools "Issues" panel reports zero accessibility issues on the MVP slice.
- `prefers-reduced-motion` is respected.
- A `# Accessibility` line in `PROJECT.md` records the audit date.

Move on to `10-security.md`.
