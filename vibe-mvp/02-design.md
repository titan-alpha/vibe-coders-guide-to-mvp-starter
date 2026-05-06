# 02 · Design

Goal: lock in a visual direction *before* writing UI components. Re-skinning later is the most expensive thing a vibe coder can do.

## DIALOGUE — ask the user

1. **Mood.** "Pick two: minimal · playful · serious · luxurious · technical · friendly · brutalist · soft." Then ask why, in one sentence.
2. **Reference.** "Name one site or app whose aesthetic you'd be proud to be compared to." If they can't name one, suggest 3 from different ends of the spectrum (e.g., Linear, Stripe, Notion, Are.na, Vercel) and ask which feels right.
3. **Density.** "Spacious and breathable, or dense and informational?"
4. **Color.** "Do you want a single accent color, or a gradient identity? Any colors you absolutely want or want to avoid?"
5. **Theme modes.** *Default is **both light and dark**, respecting the user's system preference, with a manual toggle in the header.* Confirm with the user — they can opt for light-only or dark-only if there's a strong product reason (e.g., a dev tool that's "always dark"). The default is not a question; it's a sensible default the user can override.

## Order of decisions (do these in sequence)

*Color and font set the platform's voice subconsciously; the logo references both. Doing them in this order means the logo doesn't fight the surrounding language.*

1. Re-read `PROJECT.md`'s `# Idea` and `# Audience` and pick a tone label from this list: **editorial · tech · friendly · luxurious · playful · brutalist**.
2. Pick the color scheme &mdash; informed by color-theory analysis (six dimensions, see Item #2 below), then propose 2 palettes, user picks.
3. Pick the display font &mdash; from the curated list, matched to tone.
4. Pick the logo (see item #10 below).
5. Build the header with the up-to-5-element rule (see item #11 below).
6. Then everything else &mdash; type scale, spacing, components.

Items 2&ndash;4 are creative decisions; the user always sees and picks. Item 5 is mechanical; the agent just builds it.

## AUTONOMOUS — set up the design system

1. **Stack:** Next.js 15 (App Router) + Tailwind v4 + DaisyUI. If the project is not yet scaffolded, run `npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --turbopack --import-alias "@/*"`, then install DaisyUI: `npm install -D daisyui@latest` and add `@plugin "daisyui";` to `app/globals.css`.
2. **Theme:** generate a custom DaisyUI theme that reflects the mood and color answers, **anchored to the tone label picked in the Order of decisions step**. **Always produce both a light and a dark variant** (unless the user explicitly opted for one-only in DIALOGUE Q5). Put the theme in `globals.css` via `@plugin "daisyui/theme"`. Use **OKLCH** values throughout.

   The dark variant is not a recoloring of the light one — both must be palette-aware: pick swap-pairs so primary/accent stay readable against `base-100` in either mode (i.e., dark mode primary often needs +0.10 L; surface needs to drop from ~0.98 L to ~0.18 L). Re-run the WCAG AA contrast check on **both** variants — every text/background pair has to clear 4.5:1 in both.

   **System preference is the default**; users get whatever their OS is set to. Wire the manual toggle in the header (see Item #11) so users can override per-session, persisted to `localStorage`. The toggle pattern:

   ```tsx
   // components/ThemeToggle.tsx
   'use client';
   import { useEffect, useState } from 'react';
   import { Moon, Sun, Monitor } from 'lucide-react';

   type Mode = 'light' | 'dark' | 'system';

   export function ThemeToggle() {
     const [mode, setMode] = useState<Mode>('system');
     useEffect(() => {
       const saved = (localStorage.getItem('theme') as Mode | null) ?? 'system';
       apply(saved); setMode(saved);
     }, []);
     function apply(m: Mode) {
       const dark = m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
       document.documentElement.dataset.theme = dark ? 'vibedark' : 'vibelight';
       localStorage.setItem('theme', m);
     }
     function next() {
       const order: Mode[] = ['system', 'light', 'dark'];
       const m = order[(order.indexOf(mode) + 1) % order.length];
       setMode(m); apply(m);
     }
     const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;
     return (
       <button onClick={next} className="btn btn-ghost btn-sm btn-square" aria-label={`Theme: ${mode}`} title={`Theme: ${mode}`}>
         <Icon className="w-4 h-4" />
       </button>
     );
   }
   ```

   To prevent a flash-of-wrong-theme on first paint, set `data-theme` from a tiny inline `<script>` in `app/layout.tsx`'s `<head>` that reads `localStorage` synchronously (bog-standard pattern; the agent writes it).

   Color rubric by tone &mdash; agent proposes 1&ndash;2 palettes, user picks:
   - **Editorial** &mdash; muted neutrals + one strong accent (often a deep blue, oxblood, or forest green).
   - **Tech** &mdash; cool/neutral base + electric accent (purple, cyan, lime).
   - **Friendly** &mdash; warm base + saturated accent (coral, sage, butter yellow).
   - **Luxurious** &mdash; near-black + gold, or off-white + deep brown.
   - **Playful** &mdash; high-saturation palette, **3 colors not 1**.
   - **Brutalist** &mdash; black + white + one neon (yellow, red, magenta).

   State the proposed palette(s) and reasoning before applying. The user can override.

   ### Color theory analysis (do this before proposing the palette)

   The per-tone rubric above is the *quick fallback*. Before proposing palettes, walk through these six dimensions of established color theory and write a short note on each. This makes the palette a reasoned choice, not a vibe.

   1. **Color psychology by audience.** Warm hues (red, orange, yellow) bias the viewer toward arousal, urgency, appetite. Cool hues (blue, green, purple) bias toward calm, trust, focus. Neutrals (gray, beige, off-white) bias toward neutrality and let other elements speak. Pick a base orientation that matches the *intended emotional state* of the user when they're using the product. *(Research basis: Mehta &amp; Zhu 2009; Elliot &amp; Maier 2014; Labrecque &amp; Milne 2012.)*

   2. **Cultural color associations for the target audience.** Re-read `PROJECT.md`'s `# Audience` section. If the audience is global or non-Western, check the dominant region's color associations:
      - **White** &mdash; purity (US/EU); mourning (parts of East Asia).
      - **Red** &mdash; passion / danger (US/EU); luck / celebration (China); mourning (parts of Africa).
      - **Yellow** &mdash; caution / cheer (US/EU); royalty (Southeast Asia); mourning (Egypt).
      - **Green** &mdash; nature / money / "go" (US); Islam / luck (Middle East / Ireland).
      - **Purple** &mdash; luxury / royalty (most cultures); mourning (Latin America / Thailand).
      - **Blue** &mdash; trust / corporate (most cultures, the most-universally-liked hue).

      When in doubt, lean blue &mdash; it's the most cross-culturally safe.

   3. **Color harmony scheme.** Pick one of the five canonical harmonies (Itten / Munsell color theory):
      - **Monochromatic** &mdash; single hue, multiple lightness/saturation values. Calm, focused, easy to balance. Default for editorial / luxurious / brutalist.
      - **Analogous** &mdash; 3 adjacent hues on the color wheel (e.g., blue, blue-green, green). Harmonious and natural. Good for friendly / wellness / lifestyle.
      - **Complementary** &mdash; two hues opposite on the wheel (e.g., blue + orange). High contrast, bold, energetic. Use sparingly &mdash; easily becomes loud.
      - **Triadic** &mdash; three hues evenly spaced (e.g., red, yellow, blue). Vibrant. Default for playful.
      - **Split-complementary** &mdash; base hue + the two hues adjacent to its complement. Like complementary but softer. Versatile, modern. Good default for tech / SaaS.

   4. **Contrast budget.** WCAG 2.2 AA requires &ge; 4.5:1 contrast for body text and &ge; 3:1 for large text and UI components. Pick foreground/background pairs that *start* above 7:1 (AAA) so the design has headroom for nuance without breaking accessibility. Use OKLCH lightness deltas &mdash; pairs whose `L` values differ by at least 0.50 reliably hit 4.5:1.

   5. **60-30-10 distribution rule.** Healthy palettes follow ~60% neutral / dominant base, ~30% secondary, ~10% accent. Map this to DaisyUI's tokens explicitly:
      - **60%**: `base-100` (background) and `base-200` (cards / surfaces).
      - **30%**: `base-content` (text), `neutral` (borders, secondary buttons).
      - **10%**: `primary` (CTAs, brand moments). Plus tiny doses of `accent` for state highlights (success / warning / error already covered by DaisyUI's `success` / `warning` / `error` semantic tokens &mdash; keep them).

   6. **Vertical / brand-color research.** Quickly think about the dominant color in the product's vertical:
      - Fintech / banking &rarr; blues, deep greens (trust + money associations).
      - Healthcare / wellness &rarr; calming greens, soft blues, warm neutrals.
      - Developer tools &rarr; cool dark themes, electric accents (purple, cyan, lime).
      - Food / hospitality &rarr; warm earth tones, appetite-stimulating reds/oranges (avoid blue &mdash; research shows blue suppresses appetite).
      - Fashion / luxury &rarr; near-black + metallic accent.
      - Children / education &rarr; bright primaries; high saturation.

      *Don't blindly conform &mdash; sometimes contrarian color (e.g., a fintech that goes warm) is the brand differentiator. Note the convention, then decide intentionally.*

   After working through these six points, **propose 2 candidate palettes** in chat as small inline color swatches:

   ```
   Palette A — "Trust-forward fintech"
     Primary  oklch(0.55 0.18 240)   #2563eb   ▮ deep electric blue
     Accent   oklch(0.78 0.15 50)    #f59e0b   ▮ amber
     Neutral  oklch(0.20 0.01 240)   #0f172a   ▮ near-black slate
     Surface  oklch(0.98 0.005 240)  #f8fafc   ▮ off-white

   Palette B — "Warmer, optimistic"
     Primary  oklch(0.55 0.18 240)   ▮ same blue
     Accent   oklch(0.72 0.20 25)    ▮ coral
     Neutral  oklch(0.30 0.02 60)    ▮ warm dark brown
     Surface  oklch(0.97 0.01 90)    ▮ ivory
   ```

   Then ask:

   > *"Both pass AA contrast and follow the 60-30-10 rule. **A** leans cooler / more authoritative; **B** leans warmer / more approachable. Which fits the audience better &mdash; or want me to iterate on either?"*

   User picks one. Apply it. Note the choice and the reasoning in `STATE.yaml # Decisions`.
3. **Icons:** install **Lucide React** (`npm install lucide-react`) and use it for every icon. It has 1400+ icons, perfect stroke consistency, and tree-shakes per-import so bundle stays tiny. Don't mix icon libraries; don't hand-roll SVGs for icons that Lucide already has.
   ```tsx
   import { ArrowRight, Check, Copy } from 'lucide-react';
   <ArrowRight className="w-4 h-4" />
   ```
4. **Self-documenting via `<Tooltip>`.** Per the SKILL.md operating rule, every non-obvious interactive element gets a tooltip explaining what it does. Ship the component now in `components/Tooltip.tsx` so every later skill can wrap things with it.

   ```tsx
   'use client';
   import { useState } from 'react';

   export function Tooltip({ children, label, side = 'bottom' }: {
     children: React.ReactNode;
     label: string;
     side?: 'top' | 'bottom' | 'left' | 'right';
   }) {
     const [open, setOpen] = useState(false);
     // Respect the global "hide tooltips" setting (set in /settings).
     if (typeof window !== 'undefined' && localStorage.getItem('tooltips') === 'off') {
       return <span title={label}>{children}</span>;     // accessible fallback only
     }
     return (
       <span className="relative inline-block"
             onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
             onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
         <span title={label}>{children}</span>
         {open && (
           <span role="tooltip" className={`absolute z-50 px-2 py-1 rounded-md bg-base-200 border border-base-300/60 text-xs shadow-lg whitespace-nowrap pointer-events-none ${
             side === 'top' ? 'bottom-full mb-1 left-1/2 -translate-x-1/2'
             : side === 'left' ? 'right-full mr-1 top-1/2 -translate-y-1/2'
             : side === 'right' ? 'left-full ml-1 top-1/2 -translate-y-1/2'
             : 'top-full mt-1 left-1/2 -translate-x-1/2'
           }`}>
             {label}
           </span>
         )}
       </span>
     );
   }
   ```

   Then add a "Hide tooltips" toggle in `/settings`:

   ```tsx
   // app/settings/page.tsx — extend with a tooltip-toggle
   <label className="label cursor-pointer justify-start gap-2">
     <input type="checkbox" defaultChecked={typeof window !== 'undefined' && localStorage.getItem('tooltips') !== 'off'}
       onChange={(e) => localStorage.setItem('tooltips', e.target.checked ? 'on' : 'off')}
       className="toggle toggle-primary" />
     <span className="label-text">Show hover tooltips on icons + status badges</span>
   </label>
   ```

   **Tooltips reinforce, never replace.** Labels and clear icons come first; tooltips add the *why* / *what happens*. If the agent finds itself wrapping a `<button>Save</button>` with a tooltip "Save your changes," cut the tooltip — the label is the explanation.
5. **Type scale:** one **deliberately picked** display font + system-stack body font, at 56/40/28/20/**16**. **16px is the floor.** No body text, caption, label, or nav item smaller than 16px (`text-base`). The only allowed exceptions are technical metadata like timestamps, version numbers, or inline code badges &mdash; and even those should prefer 14px (`text-sm`) over smaller. Never ship `text-xs` for readable content. No more than two font weights.

   **Display font is a tone decision, not a default.** The agent picks based on the platform's emotional tone (audience, mood, vertical from sub-skill 01). Body font stays as the system stack. The picked display font goes in `globals.css` via `@font-face` from Google Fonts (weight subset only).

   Curated display fonts by tone:
   - **Editorial / serious / publication-like** &mdash; Fraunces (variable serif) or Spectral. Trustworthy, considered.
   - **Tech / dev tool / SaaS** &mdash; Inter Tight, Geist, or Space Grotesk. Crisp, modern.
   - **Friendly / consumer / lifestyle** &mdash; General Sans, Plus Jakarta Sans, or DM Sans. Warm, rounded.
   - **Luxurious / premium** &mdash; Cormorant Garamond or Playfair Display. Elegant, high-contrast.
   - **Playful / creative** &mdash; Recoleta, S&ouml;hne, or Bricolage Grotesque. Distinctive, expressive.
   - **Brutalist / technical / raw** &mdash; JetBrains Mono or IBM Plex Mono used as display. Industrial.

   State the choice and reasoning to the user before applying. The user can override.
6. **Text content is minimal wherever possible.** Cut every word that isn't earning its place. One-sentence descriptions beat paragraphs. Button labels are verbs (`Save`, `Send`, `Create`), not phrases. Headings are the shortest fragment that names the section. Use whitespace and hierarchy instead of prose to convey structure.
7. **No gradients on buttons or titles.** Solid theme colors only. Gradient backgrounds on interactive elements or headings read as dated and reduce contrast predictability across themes. Gradients are fine for purely decorative background layers (hero glow, illustration accents) &mdash; not for anything the user reads or clicks.
8. **Spacing:** stick to Tailwind's default scale &mdash; do not invent custom spacing values.
9. **Component primitives:** build only what you need from DaisyUI (`btn`, `card`, `badge`, `input`, `alert`, `navbar`). Do not pre-build a component library.
10. **Logo + favicon (same file).** Every product needs a simple mark. The logo you design *is* the favicon &mdash; one SVG, no variants.

   **Design process:**
   1. **DIALOGUE:** ask the user one question: *"If I had to express what this project does in a single visual idea, what would it be? A letter, a shape, an object, or a metaphor?"* Re-read `PROJECT.md` for the audience and MVP slice before proposing.
   2. **Propose 2&ndash;3 concepts** as inline SVG sketches in chat. Pick from these approaches (don't overthink):
      - **Monogram** &mdash; the first letter (or two) of the project name, styled distinctively (weight, cutout, angle).
      - **Abstract symbol** &mdash; a geometric mark evocative of the domain (e.g., sprout for a garden app, waveform for audio, spiral for knowledge).
      - **Object icon** &mdash; a Lucide-style line icon of the most obvious object in the domain, simplified.
   3. **User picks one.** Iterate max twice. Ship.

   **Constraints (non-negotiable):**
   - `viewBox="0 0 64 64"`, centered composition.
   - **Works at 16&times;16 pixels.** Test by opening at that size; if details vanish, simplify until they don't.
   - **1&ndash;2 solid theme colors.** No gradients on the logo if it will ever appear as a favicon on a white browser-tab bar (gradient tints disappear at 16px). A single primary color almost always reads best.
   - Transparent background. No outer frame rectangle, no pill, no rounded-square backdrop &mdash; the browser / OS composites the logo onto whatever surface it sits on. A backdrop fights the host context.
   - No text inside the logo at favicon sizes (text becomes unreadable). Save wordmarks for the header next to the logo.

   **Files to produce:**
   - `public/favicon.svg` &mdash; the exact logo SVG. This is also what the site renders inline (imported or via `<img src="/favicon.svg">`) for the header and OG image.
   - `app/layout.tsx` metadata:
     ```ts
     export const metadata: Metadata = {
       icons: { icon: '/favicon.svg' },
       title: '…',
       description: '…',
     };
     ```
   - Header: render the same SVG inline at ~28&ndash;40px next to the wordmark. Same file, same paths, same colors.

   **Non-goals at v1:** multiple sizes, animated logos, dark/light variants. One file. Ship.

11. **Header and footer architecture &mdash; positioning, sizing, content rules.** Modern design theory separates the *working surface* (header) from the *reference surface* (footer). Each has different positioning and a different scope of content. Both are non-negotiable architectural decisions, not aesthetic ones &mdash; **the agent enforces them across every page**.

    ### Header

    **Position: sticky to the top. Never scrolls with content. Always visible. This is non-negotiable.**

    Implementation: `position: sticky; top: 0;` (or `position: fixed; top: 0;` with a body offset to compensate). The header lives in a single shared layout component (Next.js `app/layout.tsx`'s `<header>`); every page renders inside it; no page renders without it.

    **Height: 56px (Tailwind's `h-14`) on every page.** Same height across landing, app shell, admin, /settings, /404, modals. A user navigating between routes should not see the header jump.

    **Content: up to 5 elements, in this order. No exceptions.**

    1. **Platform logo** &mdash; left, links to `/`.
    2. **Platform title** &mdash; next to the logo, semibold, in the curated display font.
    3. **Theme toggle** &mdash; right-aligned, icon-only (sun / moon / monitor). Cycles light → dark → system. Skip only if the user opted for a single-mode product in DIALOGUE Q5.
    4. **Bell icon** &mdash; right of the theme toggle. **ONLY** rendered if the project has a notification center (sub-skill 07's Notifications tab). Shows unread count as a small badge. Click &rarr; dropdown with the 10 most recent notifications + a "View all" link.
    5. **Hamburger menu** &mdash; rightmost. Opens a dropdown containing every top-level page, plus a **"Settings"** link at the bottom (which goes to `/settings` &mdash; a per-user page where signed-in users edit name, password, notification preferences). For projects without auth, omit Settings. **Plus a "Feedback" item** (when sub-skill 07's feedback collection is enabled). Click opens the feedback modal &mdash; see sub-skill 07 for the form spec.

    **Don't add nav links to the header itself &mdash; all of those go in the hamburger.** The header stays clean: identity (logo + title) on the left, controls (theme + bell + hamburger) on the right. This rule supersedes any older "2&ndash;5 primary product surfaces in the header" guidance.

    ### Footer

    **Position: at the bottom of every page. Scrolls with content (NOT sticky, NOT fixed). This is non-negotiable.**

    Implementation: the footer is a normal block element at the end of `<main>` (or right after it) inside the shared layout. On short pages it sits below the content; on tall pages the user scrolls past content first then reaches the footer. Use a sticky-footer pattern (`min-h-dvh flex flex-col` on the body, `flex-1` on `<main>`) so on short pages the footer hugs the bottom of the viewport rather than floating mid-page &mdash; but it still scrolls when the page content is tall.

    **Height: uniform across every page** (e.g., `~96px` on desktop, `~140px` on mobile when items wrap). Same on landing, app, admin, errors, /settings. Like the header, it must not jump between routes.

    **Content scope &mdash; what belongs in the footer:**

    The footer holds the *reference surface*: things the user is more likely to need once (look up the policy, find the about page, contact someone) than to use daily. Per-class breakdown:

    | Class | Items | Notes |
    | --- | --- | --- |
    | **Identity / copyright** | `&copy; <YEAR> <Product Name>.` | Always present. Year is computed at build time, not hardcoded. Single line, left-aligned (or centered on mobile). |
    | **Informational** | About, FAQ | Always present whenever an `/about` and `/faq` route exists (sub-skills 02 and 17 typically produce these). Right-aligned (or below copyright on mobile). |
    | **Legal** | Terms, Privacy, "Do Not Sell or Share" | Always present whenever sub-skill 03 (compliance) ran. The CCPA "Do Not Sell or Share" link is required only if the comply path was chosen and CCPA applies; otherwise drop it. |
    | **Discoverable but optional** | Contact, Docs, Changelog, Press | Only if those surfaces actually exist. Don't add a "Contact" link that goes to a 404. |
    | **Social** | X / Bluesky / GitHub icons | Only if the brand has a real social presence. Do not add empty "Coming soon" social cards. |

    **What does NOT belong in the footer:**

    - Primary product nav (those go in the hamburger inside the header).
    - User-account controls (those live in the header's hamburger Settings item or in the sign-in/out flow).
    - Calls-to-action (signup, buy now). Footer-CTA fatigue is real and the conversion delta is negligible.
    - Long marketing-driven sitemaps. If your audience needs a 4-column footer with 30 links, you are not at MVP scope.

    **Order rule for footer items**: when there's a wrap, the order from left to right is identity → informational → legal → optional → social. On mobile the footer stacks; the order top-to-bottom matches.

    The principle &mdash; same as the header &mdash; is: **if the user is more likely to *need it once* than to *use it daily*, it belongs in the footer.** If the user *needs it daily*, it belongs in the hamburger menu inside the header. Items don't appear in both.

    ### Reference implementation

    ```tsx
    // app/layout.tsx — the shape every project ships
    export default function RootLayout({ children }: { children: React.ReactNode }) {
      return (
        <html lang="en" data-theme="vibelight">
          <body className="min-h-dvh flex flex-col">
            <header className="sticky top-0 z-30 h-14 border-b border-base-300/50 bg-base-100/70 backdrop-blur">
              {/* logo · title · theme toggle · bell · hamburger */}
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-base-300/50 bg-base-100/70 px-6 py-6 text-sm">
              <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center justify-between">
                <span className="opacity-70">&copy; {new Date().getFullYear()} {PRODUCT_NAME}.</span>
                <nav className="flex flex-wrap gap-x-4 gap-y-2 opacity-80">
                  <a href="/about">About</a>
                  <a href="/faq">FAQ</a>
                  <a href="/terms">Terms</a>
                  <a href="/privacy">Privacy</a>
                  {/* "Do Not Sell or Share" only if sub-skill 03 chose CCPA comply path */}
                </nav>
              </div>
            </footer>
          </body>
        </html>
      );
    }
    ```

12. **One landing/home page first.** Ship a minimal, on-brand landing route before building any feature surface. This anchors the visual direction so everything after it inherits the same language.

## AUTONOMOUS — critical review of user flow

Once the landing page and basic component library exist, **stop and audit before building feature surfaces.** Rushed information architecture is the most expensive mistake a vibe coder can make. Take 10 minutes to reason through the experience as the target user would, then talk it through with the user.

### 1. Classify the platform

Name the product type out loud. Each type has conventions &mdash; leaning into them cuts friction; fighting them adds it.

| Type | Convention to respect |
| --- | --- |
| Single-purpose consumer tool | One big CTA on landing, instant value; no upfront signup if you can avoid it |
| Content / media platform | Grid or feed on the landing; search prominent; auth optional until an action needs it |
| Marketplace (two-sided) | Two clear entry paths ("I'm buying" / "I'm selling") on landing; split shells post-auth |
| SaaS tool (daily use) | Sidebar nav with persistent workspace; search + command palette (⌘K); app shell, not marketing layout |
| Community / social | Feed-centric; post composer always reachable; profile top-right |
| Admin / dashboard | Sidebar sections; dense tables; filters prominent; charts above tables |

### 2. Map the core user journey

Write it as one sentence: *"A user wants to \_\_\_, starting from \_\_\_, and leaves with \_\_\_."* This is the MVP slice from `PROJECT.md`. Everything else is noise for now.

Sequence the minimum user actions from landing to value. Example (note-taking app): **land &rarr; sign up &rarr; create first note &rarr; share**. That's four steps. If you have seven, three of them are probably removable or mergeable.

### 3. For each step, reason through it

Ask these questions out loud for every step. Write the answers in a short scratch note. If an answer is weak, that step needs redesign.

- **Intent.** What is the user trying to do at this moment? State it as a verb.
- **Cognitive load.** How many fields, choices, or pieces of information are on screen? The answer for an MVP step should be small.
- **Mental model fit.** Does the UI match what this user &mdash; given their background &mdash; expects? If the audience is used to "Save" buttons, don't invent autosave without a visible indicator. If they're used to autosave (most modern apps), don't make them click Save.
- **Removability.** Can this step be collapsed into the previous one? Can we default to a reasonable value instead of asking? Can we defer it to after they've seen value?
- **Reversibility.** If they make a wrong choice here, how do they undo it? If they can't, the step is higher-stakes and needs more affordance.

### 4. Audit the information architecture of each page

Walk each page the user will see and answer:

- **Where does the eye land first?** Hero copy, primary CTA, the form, a chart? Is that what you *want* them to see first?
- **Is the primary action the most visually prominent thing?** (`btn-primary`, larger, above-the-fold.)
- **Are secondary actions visually secondary?** (Ghost buttons, smaller, footer position, or hidden in a menu.)
- **Does the page shape match the content?** Marketing pages: centered, single column, generous whitespace. App pages: full-bleed, two-column or sidebar+main, dense.
- **Is the right surface doing the work?** Header for doing, footer for learning, sidebar for navigating, modal for focused decisions. Don't put information-architecture items in the header or primary-action items in the footer.

### 5. Platform-specific checks

- **Mobile users are the majority for most MVPs.** If the audience skews mobile, the primary nav often belongs in a bottom tab bar, not a top hamburger. Thumb reach matters.
- **Desktop-first SaaS:** sidebar nav, keyboard shortcuts (⌘K for command palette), multi-pane layouts for persistent workspaces.
- **Forms:** a single form for &le; 4 fields; multi-step wizard for 5+. Never a 30-field form on one page.
- **Empty states, error states, loading states** &mdash; sketch them for the core flow. Empty states especially: they're the first thing new users see and they're usually an afterthought.

### 6. Write the critique

Produce a short doc &mdash; 5&ndash;10 bullets max &mdash; structured as:

- **What's working and why** (so we don't break it).
- **What feels wrong and why**, each with a proposed fix: *"Signup asks for first + last name before showing value &mdash; defer to account settings, make signup one field (email)."*
- **The single biggest opportunity to simplify.** Pick one.

### 7. DIALOGUE with the user

Share the critique. Ask: *"Want me to apply these now, or keep what's there and iterate after first users try it?"* Let them choose. An opinionated suggestion the user rejects is better than a silent compromise.

Apply what's agreed. Keep rejected suggestions under `# Open questions` in `PROJECT.md` &mdash; they often come back after user testing.

## AUTONOMOUS — brand voice (how the product speaks)

Tone (sub-skill 02 DIALOGUE Q1) is the visual + emotional register: friendly, editorial, brutalist. **Voice** is something different: it's the actual word choices the product uses across every surface — buttons, error messages, empty states, marketing copy, transactional emails. Every product has one whether it's intentional or not. The agent makes it intentional.

### Pick the voice axes

Four sliders, each scored 1–5:

- **Formal ↔ Casual** (1 = "We have received your application." | 5 = "Got it!")
- **Spare ↔ Generous** (1 = "Saved." | 5 = "Saved! Your changes are live and we've kicked off the email — you're all set 🎉")
- **Sincere ↔ Witty** (1 = "Account deactivated." | 5 = "Your account is sleeping. Wake it up anytime.")
- **Authoritative ↔ Conversational** (1 = "Authentication required." | 5 = "Sign in real quick?")

The agent reads the tone label + audience + product type and proposes scores. For example:

- **Recipe app for casual home cooks**: Casual 4 / Spare 3 / Sincere 4 / Conversational 5.
- **Dev tool for backend engineers**: Formal 2 / Spare 5 / Sincere 5 / Authoritative 4.
- **Fintech for small-business owners**: Formal 3 / Spare 4 / Sincere 5 / Authoritative 4.

Confirm with the user. The scores get committed to `STATE.yaml decisions.voice_axes` so every skill that writes user-facing text can reference them.

### Voice rules — concrete words

For each tone × voice combo, encode 3–5 specific rules as a writing guide. Examples:

- **Use** active voice ("We saved your post"), not passive ("Your post has been saved").
- **Use** "you" + "we"; avoid "users" (clinical) or "the system" (machine-like).
- **Avoid** these specific words for *this* voice (e.g., "platform", "leverage", "synergy" for casual voices; "awesome", "🎉" for formal voices).
- **Length cap** for body microcopy: 1 sentence in spare voices, 2 in generous.
- **Punctuation**: exclamation points used sparingly (one max per page) in spare/formal voices; allowed in casual/generous.

The agent writes these to `PROJECT.md # Voice` so every later copy decision can point at them.

### Apply — copywriting templates the agent generates

The agent uses the voice rules to write the user-facing strings the product needs. It does this **proactively**, presenting options for each, not waiting to be asked:

- **Landing page**:
  - Headline (8–12 words; states the value, not the feature).
  - Sub-headline (one sentence; states the audience and the differentiator).
  - Primary CTA button label (a verb phrase: "Save your first recipe", not "Get started").
- **Auth pages**: sign-in / sign-up button labels, success toasts, error messages (per validation case: "We've used that email already" not "Email already exists").
- **Empty states** for every list / dashboard / search-with-no-results — first impression for new users.
- **Error pages**: 404, 500, "you've been deactivated", "rate limited".
- **Transactional emails** (signup confirmation, password reset, invite, etc.) — voice-consistent with the product.
- **Loading / pending states** ("Working on it…" vs "Loading…" vs "Crunching the numbers…").

For each, propose 2–3 variants matching the voice axes and let the user pick. The configurator's `component_pick` and `multiple_choice` message types (sub-skill SKILL.md "Build channel protocol") are the right surface when in Path B.

**Anti-patterns**:
- **Using framework defaults.** "Welcome to Next.js" / generic 404 / "Loading…" are tells. Replace every default the user might see.
- **Voice that doesn't match audience.** A children's-education product written in the voice of a dev tool is jarring. Read the audience back through the voice rules to sanity-check.
- **Writing copy that the user can't pronounce.** If the founder reads the page out loud and stumbles, the voice is wrong. Read it out loud.

## AUTONOMOUS — engineered activation (the first 60 seconds)

Most MVPs lose users in the first 90 seconds, not at week 3. Activation is the path from "I just landed" or "I just signed up" to "oh, I get it." It's a separate concern from auth (which is just plumbing) — and the agent designs it explicitly.

### 1. Define the "aha" moment

Read `PROJECT.md`'s MVP slice + audience. The aha moment is the **single experience** that makes the user understand the value. Examples:

- Recipe app: the user sees their first recipe rendered cleanly without a life-story intro. *(Aha: "this is what I came for.")*
- Note-taking app: the user types and the note auto-saves with a visible indicator. *(Aha: "I don't have to think about saving.")*
- Marketplace: the user sees 3 relevant listings on the homepage without filtering. *(Aha: "there's actually supply here.")*
- AI tool: the user runs the AI on their own input and gets a useful result. *(Aha: "this works for my case.")*

The agent proposes the aha for the user's product, then asks: *"Is this the moment that makes them get it? Or is there a different one?"*

### 2. Time-to-value budget — under 60 seconds

From landing to aha must take **under 60 seconds for a first-time user, including signup**. Anything longer and most people leave. This constrains everything downstream:

- Signup is one screen, not three.
- The first authed page is the aha-producing page, not a generic dashboard with empty states.
- Optional fields (intended-use, profile photo, etc.) come AFTER the aha, not before.
- Onboarding tours that block content are forbidden — they push aha further away.

Test it: Playwright scripts a brand-new user from `/` to the aha screen and asserts wall-clock time < 60s on a slow-3G profile. The test lives in `tests/e2e/activation.spec.ts`.

### 3. The four activation states the agent designs

For every product:

| State | What the user sees | What the agent designs |
| --- | --- | --- |
| **Cold landing** (no account) | Public landing page | Single primary CTA leading toward aha; secondary "see an example" link bypasses signup for browse-able products |
| **Just signed up** (empty account) | Authed shell | First-action prompt, NOT empty dashboard. "Save your first recipe" / "Create your first note" / etc. — verb + concrete object |
| **First action complete** (one record exists) | Aha state | The thing that makes them get it. May include a small "what's next" hint but doesn't force one. |
| **Returning, day 2+** | Authed shell with content | Different from "just signed up" — usually shows the user's own most recent thing front-and-center. Reduces re-orientation cost. |

Each state gets its own visual baseline screenshot (sub-skill 02 test rig + sub-skill 16 visual regression).

### 4. Activation copy is the highest-leverage copy

The empty-state copy on the just-signed-up screen is the single most-important sentence in the product. The agent writes it explicitly using the voice rules from "Brand voice" above — and tests 2 variants if possible (sub-skill 08 analytics will tell you which converts).

### Exit criteria for activation

- The aha moment is named in `PROJECT.md # Activation` and `STATE.yaml decisions.aha_moment`.
- A Playwright test asserts time-to-aha < 60s for a brand-new user.
- The four state-specific screens have visual baselines.
- The "just signed up" empty-state copy is voice-consistent and verb-led.

## AUTONOMOUS — seed the platform with real-feeling content (before launch)

For any product where the user expects to see SOMETHING on first visit, the agent ships with a stocked database. A recipe app with 0 recipes feels broken; a marketplace with 0 listings looks abandoned; a community with 0 threads is dead. Empty states are for "you have no items yet" — they are NOT for the product as a whole.

### What to seed (depends on category — see patterns/<category>.md)

The agent reads `STATE.yaml decisions.product_category` and the loaded `patterns/<category>.md` to know what content the platform expects. Examples:

| Category | Seed content |
| --- | --- |
| Marketplace | 20-100 listings spanning categories, with realistic-looking images, prices, descriptions, and reviews |
| Content platform | 10-50 starter articles / recipes / guides / podcasts — actual quality content, not placeholders |
| Community | 30-100 starter posts across topics; agent-generated AND clearly labeled as such |
| Productivity tool | Sample data within the user's first workspace (3 demo notes, 5 demo tasks) — labeled as samples, dismissible |
| SaaS dashboard | Demo organization with sample customers / invoices / records — dismissible after first real-data add |
| Dev tool | Example projects, code samples in docs, API responses for the playground |

### How to generate it

Three approaches, in order of preference:

1. **Recruit real content** (best). For marketplaces: pre-launch outreach to 10-20 suppliers; for content platforms: write the first 20 pieces yourself or commission them. The seed becomes durable user-facing value. **Always best when feasible.**
2. **Agent-generate with explicit labeling** (good for content / community / sample data). Use `aiCall` to generate content matching the platform's voice (sub-skill 02 brand voice rules), seed via a one-time migration. Label each item: `metadata: { seeded: true, seeded_at: '...', generated_by: 'agent-v0.3.0' }`. Display a small "Sample" badge in the UI on seeded items. Users can hide them via a setting once they have their own.
3. **Public-domain or licensed content** (good for niche knowledge bases). Wikipedia for articles; OpenLibrary for book metadata; Wikidata for entities. License-check each source.

The agent **does not** ship a product to public users with empty seed if approach 1 or 2 was viable. The seed is part of the launch.

### Seed spec — write before generating

Write a `seed/spec.md` documenting:

```markdown
# Seed Plan

- Category: `<from STATE.yaml>`
- Target counts: 50 recipes, 0 users (no fake users), 0 reviews (will accumulate)
- Content sources: agent-generated via `lib/ai.ts` with the prompt template at `seed/recipe-prompt.md`
- Voice: per `PROJECT.md # Voice`
- Image strategy: hero images from Unsplash API (free tier, attribution in footer)
- Labeling: every seeded recipe has `metadata.seeded = true`; UI shows small "Curated" badge
- Removal plan: founder can convert seeded items to "owned" or remove them via `/admin/seed`
```

### Seed migration script

```ts
// scripts/seed.ts — run with `npx tsx scripts/seed.ts`
import 'dotenv/config';
import { db } from '@/lib/db';
import { recipes, serviceUsageDaily } from '@/lib/db/schema';
import { aiCall } from '@/lib/ai';
import { z } from 'zod';

const Recipe = z.object({
  title: z.string(), description: z.string(), ingredients: z.array(z.string()),
  steps: z.array(z.string()), category: z.string(), prep_minutes: z.number(),
});

const SEED_PROMPTS = [
  "A simple weeknight pasta with garlic and chili",
  "A 30-minute one-pot lentil soup",
  // ... 50 prompts ...
];

(async () => {
  for (const prompt of SEED_PROMPTS) {
    const r = await aiCall({ schema: Recipe, schemaName: 'recipe', instructions: 'Generate a clean, no-blog-intro recipe.', input: prompt });
    await db.insert(recipes).values({
      ...r, slug: r.title.toLowerCase().replace(/\W+/g, '-'),
      metadata: { seeded: true, seeded_at: new Date().toISOString(), generated_by: 'agent-seed-v1' },
    });
  }
  console.log(`Seeded ${SEED_PROMPTS.length} recipes.`);
})();
```

### Cost awareness

Agent-generated seed costs real money. For 100 recipes via gpt-5-nano: ~$0.05. For 100 substantial articles via gpt-5-mini: ~$2. **Run the seed once locally**, commit the resulting data as a SQL dump or JSON in `seed/data/`, then deploy reads from there — don't re-run AI generation on every deploy.

```bash
# After local seed:
pg_dump --data-only --table=recipes $DATABASE_URL > seed/data/recipes.sql
git add seed/data/recipes.sql
```

Production seed step (sub-skill 14 deploy): `psql $DATABASE_URL < seed/data/recipes.sql` runs once on first deploy.

### Anti-patterns

- Shipping a public product with 0 items in the catalog. The launch fails.
- Generating seed at runtime on every deploy. Wastes money + makes deploys slow + gives different data each time.
- Hiding the "this is sample data" labeling. Users feel deceived when they figure it out. Honesty + dismissibility = trust.
- Letting agent-generated seed be the only content forever. Real content from real users replaces it as the platform grows.

Record in `STATE.yaml decisions.seeding_plan` (one line summary) + `decisions.seeded_at`.

## AUTONOMOUS — forms beyond signup (multi-step, draft recovery, save-as-you-type)

The signup form is solved (sub-skill 04). But most products have at least one substantial form beyond signup — configuration, application, listing creation, profile setup, settings, content composition. Form-state patterns are universal and the agent applies them consistently.

### Pattern 1: Multi-step wizard for forms with > 5 fields

Don't show 12 fields on one screen. Break into 3 steps of 4 fields each, with progress indicator at top:

```tsx
// app/onboarding/page.tsx — pattern
'use client';
import { useState } from 'react';

const STEPS = ['Basics', 'Preferences', 'Goals'] as const;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<FormShape>>({});

  // Save draft to localStorage on every change so a refresh / accident doesn't lose work.
  useEffect(() => {
    localStorage.setItem('onboarding-draft', JSON.stringify(data));
  }, [data]);

  // Restore draft on mount.
  useEffect(() => {
    const saved = localStorage.getItem('onboarding-draft');
    if (saved) setData(JSON.parse(saved));
  }, []);

  return (
    <div className="max-w-md mx-auto p-6">
      <ol className="flex gap-2 text-xs mb-6">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-1 py-1 text-center rounded ${
            i < step ? 'bg-success/20 text-success' :
            i === step ? 'bg-primary/20 text-primary font-medium' :
            'bg-base-200 opacity-60'
          }`}>{s}</li>
        ))}
      </ol>
      {/* render the current step's fields */}
      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-ghost">Back</button>
        <button onClick={() => step === STEPS.length - 1 ? submit(data) : setStep(s => s + 1)} className="btn btn-primary">
          {step === STEPS.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
```

### Pattern 2: Save-as-you-type for editor-shaped forms

For any form where the user is composing content (notes, posts, drafts, listings), don't make them click "Save." Save automatically with a debounce + visible indicator:

```tsx
const [draft, setDraft] = useState('');
const [savedAt, setSavedAt] = useState<Date | null>(null);
const [saving, setSaving] = useState(false);

useEffect(() => {
  if (!draft) return;
  setSaving(true);
  const t = setTimeout(async () => {
    await fetch('/api/drafts', { method: 'PUT', body: JSON.stringify({ body: draft }) });
    setSavedAt(new Date()); setSaving(false);
  }, 1500);
  return () => { clearTimeout(t); setSaving(false); };
}, [draft]);

return (
  <>
    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="textarea textarea-bordered w-full h-96" />
    <div className="text-xs opacity-60 mt-2">
      {saving ? 'Saving…' : savedAt ? `Saved ${formatRelative(savedAt)}` : ''}
    </div>
  </>
);
```

### Pattern 3: Draft recovery from accidental navigation

For any non-trivial form (signup is the exception — keep that one short and submit-or-cancel), warn before unload if there are unsaved changes:

```tsx
useEffect(() => {
  if (!hasUnsavedChanges) return;
  const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [hasUnsavedChanges]);
```

Combined with localStorage draft saving (Pattern 1's `localStorage.setItem`), the user can navigate away and come back to find their draft restored. Combine both — they're complementary.

### Pattern 4: Inline validation, not modal popups

When validation fails on submit OR on field blur:

```tsx
// Anti-pattern: alert("Email is invalid")
// Right pattern: inline error below the field
<label className="form-control">
  <input name="email" type="email" required
    aria-invalid={!!emailError}
    aria-describedby="email-error"
    className={`input input-bordered ${emailError ? 'input-error' : ''}`}
  />
  {emailError && <span id="email-error" className="label-text-alt text-error mt-1">{emailError}</span>}
</label>
```

Use the platform's voice (sub-skill 02 brand voice) for the error message. "We've used that email already" not "Email already exists."

### Pattern 5: Honest submit-button states

```tsx
const { pending } = useFormStatus();
<button type="submit" disabled={pending} className="btn btn-primary">
  {pending ? <><span className="loading loading-spinner loading-xs" /> Saving…</> : 'Save'}
</button>
```

Disable during submit (also blocks double-submit — see sub-skill 16 race-condition tests).

### What the agent does for every new form

1. Count the fields. If > 5, multi-step wizard. If ≤ 5, single screen.
2. If editor-shaped (composing content), wire save-as-you-type. If transactional, wire submit-button + warn-before-unload.
3. Wire inline validation per field; use voice-consistent error messages.
4. Wire `useFormStatus` for the submit button.
5. Wire localStorage draft for any form with > 3 fields.
6. Wire draft recovery on mount.

Append a one-line note to `STATE.yaml decisions.form_patterns_applied` per form built so the founder has visibility.

## AUTONOMOUS — sharing / collaboration patterns (when artifacts are shareable)

Most products have at least one shareable artifact: a recipe to share with a friend, a doc to collaborate on, a listing to send to someone, a profile to show off. Sharing UX is conventional but easy to ship wrong.

### Decision: which sharing modes do you need?

The agent asks once based on `STATE.yaml decisions.product_category` and the platform shape:

> *"For your <product>, the things users will want to share are <items>. Three sharing modes:*
> *(a) **Public link** — anyone with the URL can view (no signup). Simplest. Good for content + listings.*
> *(b) **Permissioned link** — link includes a token; permission level (view / comment / edit) baked in. Optional expiry.*
> *(c) **Per-user invite** — share with a specific email; receiver sees it in their authed shell.*
>
> *Most MVPs need (a) at minimum. Add (b) if collaboration matters; add (c) for B2B / team products. Which?"*

Default for most consumer MVPs: (a). Default for B2B: (b) + (c).

### Public link pattern

```ts
// schema.ts
export const items = pgTable('items', {
  // ... existing fields ...
  visibility: text('visibility').notNull().default('private'),  // 'private' | 'public'
  publicSlug: text('public_slug').unique(),                      // generated when made public; URL-safe
});

// Toggle in UI:
<label className="label cursor-pointer">
  <input type="checkbox" checked={item.visibility === 'public'}
    onChange={async () => {
      await fetch(`/api/items/${item.id}/visibility`,
        { method: 'PUT', body: JSON.stringify({ visibility: item.visibility === 'public' ? 'private' : 'public' }) });
    }}
    className="toggle toggle-primary" />
  <span>Anyone with the link can view</span>
</label>

{item.visibility === 'public' && (
  <div className="mt-2 flex gap-2">
    <input value={`https://<domain>/p/${item.publicSlug}`} readOnly className="input input-bordered input-sm flex-1 font-mono text-xs" />
    <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(`...`)}>Copy</button>
  </div>
)}
```

Public route: `/p/<slug>` — no auth, fetches the item if `visibility === 'public'`, returns 404 otherwise. Apply rate limiting (sub-skill 11) to prevent enumeration.

### Permissioned link pattern (token-based)

```ts
// schema.ts
export const itemShares = pgTable('item_shares', {
  tokenHash: text('token_hash').primaryKey(),     // sha256 of the actual token
  itemId: uuid('item_id').notNull().references(() => items.id),
  permission: text('permission').notNull(),        // 'view' | 'comment' | 'edit'
  expiresAt: timestamp('expires_at'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Generate share link:
const token = crypto.randomBytes(24).toString('base64url');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
await db.insert(itemShares).values({ tokenHash, itemId, permission, expiresAt });
const url = `https://<domain>/items/${itemId}?share=${token}`;

// Receiver-side: middleware reads ?share=, verifies sha256, grants permission for the request.
```

Show all active shares per item with revoke button + expiry status. UI:

```tsx
{shares.map(s => (
  <li key={s.tokenHash} className="flex items-center gap-2 text-sm">
    <span className={`badge badge-sm ${s.permission === 'edit' ? 'badge-warning' : 'badge-ghost'}`}>{s.permission}</span>
    <span className="opacity-70">expires {s.expiresAt ? formatRelative(s.expiresAt) : 'never'}</span>
    <button className="btn btn-xs btn-ghost ml-auto" onClick={() => revokeShare(s.tokenHash)}>Revoke</button>
  </li>
))}
```

### Per-user invite pattern (B2B / teams)

For multi-user workspaces (sub-skill 04 B2B section), invite via email — the receiver sees the item in their authed shell on next sign-in:

- `itemInvites` table: `itemId`, `inviteeEmail`, `permission`, `acceptedAt`, `expiresAt`, `inviterId`.
- On invite: send an email via `sendEmail` (sub-skill 04) with a link to the item.
- On the receiver's first authed visit to the item: check `itemInvites` for a row matching their email; if found and not expired, grant the permission and mark `acceptedAt`.

### Social meta tags per shared item

When a user shares a public link, the receiver pastes it into iMessage / Slack / Twitter — the preview that renders matters. Every shared route needs:

```tsx
// app/p/[slug]/page.tsx
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const item = await fetchPublicItem(params.slug);
  return {
    title: `${item.title} — <Product>`,
    description: item.description.slice(0, 155),
    openGraph: {
      title: item.title,
      description: item.description.slice(0, 155),
      images: [{ url: `/api/og/items/${item.id}`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
  };
}
```

Generate per-item OG images dynamically with `next/og` — each shared item gets a tailored card.

### Anti-patterns

- Sharing as a v2 feature. Most users want to share early — even basic public-link sharing is cheap to ship.
- Public links without rate limiting. Enumeration via `/p/<slug>` walking shouldn't reveal everyone's items. Sub-skill 11 rate limit covers this; or use longer slugs (12+ chars).
- Storing raw share tokens in the DB. Always sha256-hash; the URL is the credential.
- Forever-tokens with no UI to revoke. Users want to take back access.
- No preview when shared in iMessage / Slack. Every public route needs OG tags.

Cross-references:
- B2B / team products: `04-auth.md` B2B section for the multi-user model.
- Public route security (rate limiting, no enumeration) → `11-security.md`.
- OG image generation → `12-performance.md` SEO surface.

## AUTONOMOUS — feedback design system (loading / toast / error / motion)

Founders end up with three different loading-spinner styles, mixed error language, ad-hoc toast positioning, and no motion language. The agent codifies the patterns once in `02-design` so every later skill applies them consistently.

### Loading states — three patterns

| Pattern | When to use | Example |
| --- | --- | --- |
| **Skeleton** | Predictable layout known in advance, > 200ms wait | Dashboard cards loading; list rows; profile pages |
| **Spinner** | Layout unknown OR < 200ms wait OR small in-place action | Submit buttons, mid-page refreshes |
| **Progress bar** | Long operation with measurable progress | File uploads, multi-step migrations, AI generation with token count |

```tsx
// components/Skeleton.tsx — use everywhere a card/row will render
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-base-200 animate-pulse rounded ${className}`} />;
}

// Usage:
{loading ? (
  <div className="grid gap-3">
    <Skeleton className="h-24" />
    <Skeleton className="h-24" />
    <Skeleton className="h-24" />
  </div>
) : (
  items.map(...)
)}
```

Skeleton dimensions match the final-rendered element's dimensions — no layout shift when real data arrives.

### Toast / ephemeral notification pattern

Use a single `<Toaster />` mount in `app/layout.tsx`. The agent picks **sonner** (`npm install sonner`) — small, accessible, theme-aware:

```tsx
// app/layout.tsx
import { Toaster } from 'sonner';
<Toaster position="bottom-right" richColors closeButton />

// Anywhere:
import { toast } from 'sonner';
toast.success('Recipe saved');
toast.error("Couldn't save — try again?");
toast('You have 3 unread messages', { action: { label: 'View', onClick: () => router.push('/messages') } });
```

**Voice rules** (per sub-skill 02 brand voice):
- Success toasts: short verb-led ("Saved" / "Sent" / "Created"). Don't add unnecessary words ("Successfully saved your recipe!" — drop "successfully" + "your recipe").
- Error toasts: tell the user what to do next, not just what went wrong. "Couldn't save — try again?" beats "Save failed."
- Toasts auto-dismiss after 4 seconds for success / info; **stay until dismissed for error** (user needs to read it).
- One toast at a time when possible; sonner handles stacking.

### Inline error pattern (forms — see also Forms section above)

Per-field error shown below the field, in the platform's error color, with `aria-describedby` for screen readers. NEVER use browser-default `alert()`. NEVER use a modal popup for a single-field error.

### Motion language — pick three durations and stick to them

Inconsistent motion is one of the loudest "this feels amateur" signals. The agent picks once and applies everywhere:

```css
/* globals.css — append to the design system tokens */
:root {
  --motion-instant: 80ms;       /* hovers, focus rings, color transitions */
  --motion-quick:   180ms;       /* state changes — toggles, expands, slide-ins */
  --motion-deliberate: 320ms;    /* page transitions, modal opens, large reveals */
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

Use one of these three CSS custom properties for every transition. No `200ms` or `400ms` floating around — they make the product feel inconsistent.

**Easings** — pick two:
- `cubic-bezier(0.22, 1, 0.36, 1)` — ease-out, the default for things appearing.
- `cubic-bezier(0.4, 0, 0.2, 1)` — material standard, for things moving on the page.

### Reduced motion respected globally

The CSS rule above + the agent never relying on motion to convey meaning (e.g., a fade-in to indicate "new" — also add a badge / color signal).

### Anti-patterns

- Three different spinner libraries in one app.
- Toast positions that change between routes (top on landing, bottom on dashboard).
- Errors as `alert()`. Confirms not even basic UX hygiene was applied.
- Animation durations all over the map (200ms here, 350ms there, 500ms over there). Pick three; use them.
- Animations that block interaction. The user clicks "Save"; the success animation runs for 600ms; meanwhile they can't click anything. Cap blocking animations at 200ms.

## AUTONOMOUS — set up the test rig (do this BEFORE leaving 02)

Sub-skill 02 is the last skill where the project is "small enough to install dev tooling without breaking anything." Every later skill writes tests against this rig.

This section is non-negotiable. The user does not test the product (see SKILL.md operating rules); the agent does. The rig must be in place before that work begins.

### 1. Install

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @playwright/test playwright @axe-core/playwright
npx playwright install chromium firefox webkit
```

### 2. Directory layout (create these now, even if empty)

```
project-root/
├── tests/
│   ├── unit/                          # Vitest, isolated logic + components
│   │   └── .gitkeep
│   ├── integration/                   # Vitest, hits DB / external SDKs
│   │   └── .gitkeep
│   └── e2e/                           # Playwright
│       ├── routes.ts                  # shared route manifest (used by crawl + visual + a11y)
│       ├── helpers/                   # auth fixtures, factories, test users
│       ├── flows/                     # journey specs (signup → core → sign-out)
│       │   └── .gitkeep
│       ├── crawl.spec.ts              # added by 16-e2e-testing
│       ├── a11y.spec.ts               # added by 09-accessibility (was 10-accessibility — confirm via STATE.yaml's mode plan)
│       └── visual.spec.ts             # screenshot regression
└── tests/e2e/visual.spec.ts-snapshots/  # baseline screenshots, committed to git
```

The `-snapshots` directory naming is Playwright's built-in convention for `toHaveScreenshot()`. Don't rename it.

### 3. Configs

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
```

Add a separate `vitest.integration.config.ts` for `tests/integration/**` that uses `environment: 'node'` and a real DB connection from `.env.test` — the integration suite is allowed to be slow (≥ a few seconds per test) because it's catching real-boundary bugs.

`playwright.config.ts` (extend the one from sub-skill 16):
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  // 5 breakpoints — see 16-e2e-testing.md for why these specific viewports.
  projects: [
    { name: 'mobile-sm', use: { ...devices['iPhone SE'] } },
    { name: 'mobile-lg', use: { ...devices['iPhone 14'] } },
    { name: 'tablet',    use: { ...devices['iPad Mini'] } },
    { name: 'desktop',   use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'wide',      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
  // Visual regression tolerance: pixel-diff with a strict threshold.
  // 0.01 = up to 1% of pixels may differ before failing. Sub-pixel font
  // anti-aliasing on different OSes can cause false positives below this.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
});
```

### 4. npm scripts (paste into `package.json`)

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:unit:watch": "vitest --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:visual": "playwright test tests/e2e/visual.spec.ts",
    "test:visual:update": "playwright test tests/e2e/visual.spec.ts --update-snapshots",
    "test:a11y": "playwright test tests/e2e/a11y.spec.ts",
    "test:crawl": "playwright test tests/e2e/crawl.spec.ts"
  }
}
```

### 5. The first visual baseline (lock the design surface BEFORE any feature code)

Before exiting 02, the agent runs:

```bash
npm run test:visual
```

The first run has no baselines, so Playwright captures and saves. The agent commits these baselines to git:

```bash
git add tests/e2e/visual.spec.ts-snapshots/
git commit -m "02-design: lock visual baselines for landing + theme toggle"
```

These become the reference every later skill diffs against. When a skill intentionally changes the UI, the agent runs `npm run test:visual:update` only **after inspecting each diff** to confirm the change was wanted (see SKILL.md's Visual regression workflow rule).

### 6. The first three tests (templates every later skill copies)

Write these three before exiting 02 so subsequent skills have a pattern to follow. Each is the simplest possible example of its layer.

```ts
// tests/unit/format.test.ts — unit test template
import { describe, it, expect } from 'vitest';
import { formatPrice } from '@/lib/format';

describe('formatPrice', () => {
  it('formats cents as dollars', () => {
    expect(formatPrice(2000)).toBe('$20.00');
  });
});
```

```ts
// tests/integration/db.test.ts — integration test template
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

beforeAll(async () => {
  // Reset to a known state; uses .env.test DATABASE_URL pointing at a sandbox DB.
  await db.delete(users);
});

describe('users table', () => {
  it('round-trips an insert', async () => {
    const [u] = await db.insert(users).values({
      email: 't@example.com', firstName: 'T', lastName: 'T',
    }).returning();
    expect(u.email).toBe('t@example.com');
  });
});
```

```ts
// tests/e2e/visual.spec.ts — visual regression template
import { test, expect } from '@playwright/test';
import { ROUTES } from './routes';

for (const route of ROUTES.filter(r => !r.auth)) {
  test(`visual: ${route.path}`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState('networkidle');
    // The toHaveScreenshot matcher captures on first run, diffs on later runs.
    // Filename is auto-derived: tests/e2e/visual.spec.ts-snapshots/<test name>-<project>.png
    await expect(page).toHaveScreenshot();
  });
}
```

### 7. Tell the user (one line, then exit)

> *"Test rig is set up. From here on, every skill writes its own tests as it builds — you won't need to test anything except subjective things like 'does this email look right?' I'll run the suite and only flag things that need your eye."*

## Anti-patterns to avoid

- Inventing custom color tokens before the theme is locked.
- Adding a UI component library *and* DaisyUI ("just in case").
- **Gradient buttons or gradient headings.** Solid colors only.
- **Text under 16px** for anything the user is expected to read.
- Verbose copy. Cut every word that isn't earning its place.
- Animations on every element. Reserve motion for state changes (reveal, success, error).
- Stock illustrations. Use type, color, and whitespace instead.
- Mixing icon libraries &mdash; one of anything is fine, two of anything is a smell.
- Putting nav links directly in the header. Top-level pages live inside the hamburger dropdown; the header has at most 5 elements (logo, title, theme toggle, bell-if-notifications, hamburger).
- Letting the header scroll with content. Header is `sticky top-0` and always visible; never `position: static` and never inside `<main>`. If the header disappears when the user scrolls, that's a bug.
- Making the footer sticky / fixed. Footer scrolls with content — it's a reference surface, not an always-visible chrome. Sticky footers steal viewport real estate that belongs to content.
- Variable header or footer height between routes. Both must be the same height on every page (header: 56px; footer: ~96px desktop, ~140px mobile when items wrap). A jumping header on navigation is jarring and fixable in one shared layout component.
- Footer CTAs (signup buttons, "buy now" cards). The footer is reference, not conversion — these belong on the page itself, not the footer of every page.
- A "footer that holds primary nav." If the user needs it daily, it's not footer material. Move it into the hamburger.
- Shipping a single-theme product without explicit user confirmation. Both light and dark are the default; only deviate when the user has a strong product reason.
- Building the dark variant by inverting the light one. Dark themes need their own L-curve adjustments; recoloring with negative-of-light produces low-contrast surfaces.
- Defaulting to the system stack as the display font, or picking a color palette before the tone label is named. Tone first, then palette and font.
- Picking colors by feel without checking contrast ratios or cultural connotations. The agent always proposes palettes that pre-pass WCAG AA &mdash; accessibility is a *constraint* on color choice, not a follow-up audit.
- Shipping the framework's default empty / 404 / loading copy. These are dead giveaways and tank trust.
- A voice that doesn't match the audience (children's education in dev-tool voice, fintech in playful-app voice). Read the audience back through the voice rules.
- An activation flow longer than 60 seconds for a first-time user. Cut every step that doesn't earn its place.
- Tooltips as the only way to understand a control. Labels + clear icons first; tooltips add reinforcement, not basic comprehension.
- Shipping a public product with empty seed (0 listings, 0 articles, 0 starter content). The launch fails on first visit.
- Forms beyond signup with no draft recovery, no inline errors, no save-as-you-type for editor-shaped flows.
- Sharing as a v2 feature. Even basic public-link sharing is cheap to ship and most users want it on day 1.
- Three different loading patterns / toast positions / motion durations across the app. Pick once; reuse.

## Exit criteria

- The user has approved the landing page screenshot or has clicked through it on `localhost`.
- `globals.css` contains the locked theme (OKLCH values) and the chosen display font loaded via `@font-face` from Google Fonts.
- `public/favicon.svg` exists and renders correctly as both the favicon (browser tab) and the inline header logo.
- A tone label has been picked from the curated list, and color palette + display font were chosen against that tone with the user's approval.
- Color palette was selected via the color-theory analysis (six dimensions), passes WCAG AA contrast, and is recorded in `STATE.yaml # Decisions` with the reasoning.
- **Header**: `position: sticky; top: 0` (never scrolls), uniform height of 56px on every page, up to 5 elements (logo, title, theme toggle, bell if notifications, hamburger). The hamburger contains every top-level page plus Settings (when auth exists).
- **Footer**: scrolls with content (NOT sticky), uniform height across every page, holds only the defined classes — identity (©  YYYY  Product), informational (About, FAQ), legal (Terms, Privacy, "Do Not Sell or Share" if CCPA-comply path), optional links if those surfaces actually exist, social if real presence. No primary nav, no CTAs, no user-account controls in the footer.
- Hamburger menu includes a "Feedback" item when feedback collection is enabled in sub-skill 07. The item opens the modal defined there.
- Both light and dark themes ship by default and pass WCAG AA contrast in both modes. The header theme toggle cycles light → dark → system and persists to `localStorage`.
- The user-flow critique has been written, discussed with the user, and applied where agreed.
- A `# Design` section in `PROJECT.md` captures the chosen tone label, color decisions, display font, logo concept, theme modes (light/dark/both), the core user journey sentence, and any flow-critique items deferred to post-MVP.
- Test rig is scaffolded: Vitest (unit + integration), Playwright (e2e), axe-core, baseline screenshot dir under `tests/e2e/visual.spec.ts-snapshots/`. The three template tests (unit, integration, visual) exist and pass. `npm run test` runs the full suite. Visual baselines for the landing page in both light and dark are committed to git.
- `<Tooltip>` component shipped in `components/Tooltip.tsx`; `/settings` has the global hide-tooltips toggle.
- Voice axes scored (Formal/Casual, Spare/Generous, Sincere/Witty, Authoritative/Conversational) and recorded in `STATE.yaml decisions.voice_axes`.
- Voice rules and word-list captured in `PROJECT.md # Voice`.
- Aha moment named; time-to-aha < 60s asserted by `tests/e2e/activation.spec.ts`; the four activation-state screens have visual baselines.
- For products with public-facing content surfaces: seed plan documented in `seed/spec.md`, seed migration runs from `seed/data/`, `STATE.yaml decisions.seeding_plan` and `seeded_at` set.
- Form patterns applied to every form > 5 fields (multi-step) and every editor-shaped form (save-as-you-type + draft recovery + warn-before-unload). Inline validation everywhere; submit buttons honor `useFormStatus`.
- Sharing modes wired per the dialogue (public-link / permissioned / per-user invite). Each shared route has OG tags + dynamic OG image generation.
- Feedback design system codified: skeleton + spinner + progress bar patterns, single Toaster mount with sonner, motion language with --motion-instant / --motion-quick / --motion-deliberate tokens, prefers-reduced-motion respected globally.

Move on to `03-compliance.md`.
