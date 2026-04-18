# 02 · Design

Goal: lock in a visual direction *before* writing UI components. Re-skinning later is the most expensive thing a vibe coder can do.

## DIALOGUE — ask the user

1. **Mood.** "Pick two: minimal · playful · serious · luxurious · technical · friendly · brutalist · soft." Then ask why, in one sentence.
2. **Reference.** "Name one site or app whose aesthetic you'd be proud to be compared to." If they can't name one, suggest 3 from different ends of the spectrum (e.g., Linear, Stripe, Notion, Are.na, Vercel) and ask which feels right.
3. **Density.** "Spacious and breathable, or dense and informational?"
4. **Color.** "Do you want a single accent color, or a gradient identity? Any colors you absolutely want or want to avoid?"
5. **Light/dark.** "Light only, dark only, or both with system default?"

## AUTONOMOUS — set up the design system

1. **Stack:** Next.js 15 (App Router) + Tailwind v4 + DaisyUI. If the project is not yet scaffolded, run `npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --turbopack --import-alias "@/*"`, then install DaisyUI: `npm install -D daisyui@latest` and add `@plugin "daisyui";` to `app/globals.css`.
2. **Theme:** generate a custom DaisyUI theme that reflects the mood and color answers. Use OKLCH colors. Provide both light and dark unless the user opted out. Put the theme in `globals.css` via `@plugin "daisyui/theme"`.
3. **Icons:** install **Lucide React** (`npm install lucide-react`) and use it for every icon. It has 1400+ icons, perfect stroke consistency, and tree-shakes per-import so bundle stays tiny. Don't mix icon libraries; don't hand-roll SVGs for icons that Lucide already has.
   ```tsx
   import { ArrowRight, Check, Copy } from 'lucide-react';
   <ArrowRight className="w-4 h-4" />
   ```
4. **Type scale:** one display font (system stack is fine) at 56/40/28/20/**16**. **16px is the floor.** No body text, caption, label, or nav item smaller than 16px (`text-base`). The only allowed exceptions are technical metadata like timestamps, version numbers, or inline code badges &mdash; and even those should prefer 14px (`text-sm`) over smaller. Never ship `text-xs` for readable content. No more than two font weights.
5. **Text content is minimal wherever possible.** Cut every word that isn't earning its place. One-sentence descriptions beat paragraphs. Button labels are verbs (`Save`, `Send`, `Create`), not phrases. Headings are the shortest fragment that names the section. Use whitespace and hierarchy instead of prose to convey structure.
6. **No gradients on buttons or titles.** Solid theme colors only. Gradient backgrounds on interactive elements or headings read as dated and reduce contrast predictability across themes. Gradients are fine for purely decorative background layers (hero glow, illustration accents) &mdash; not for anything the user reads or clicks.
7. **Spacing:** stick to Tailwind's default scale &mdash; do not invent custom spacing values.
8. **Component primitives:** build only what you need from DaisyUI (`btn`, `card`, `badge`, `input`, `alert`, `navbar`). Do not pre-build a component library.
9. **Logo + favicon (same file).** Every product needs a simple mark. The logo you design *is* the favicon &mdash; one SVG, no variants.

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

10. **Header and footer content &mdash; know what belongs where.** Modern design theory separates the *working surface* (header) from the *reference surface* (footer). Keep the header clean; put everything informational in the footer.

    **Header (nothing except):**
    - Logo + wordmark, clickable home.
    - 2&ndash;5 primary product surfaces &mdash; the *things the user does* (e.g., "Discover", "Library", "Create"). Never more than 5.
    - Account / auth on the right: sign in button, or avatar + dropdown when signed in.

    That's it. Not "About", not "Contact", not "Blog" unless the blog is core to the product, not pricing unless you're actively selling.

    **Footer (everything discoverable but non-essential):**
    - About, Contact (or a `/contact` form, or just `hello@<domain>`).
    - Terms, Privacy, "Do Not Sell or Share" (from sub-skill 07 if applicable).
    - Social links (optional, and only if the brand has a real social presence).
    - Docs, changelog, press (only if they exist).
    - Copyright line.

    The rule: if the user is more likely to *need it once* than to *use it daily*, it belongs in the footer.

11. **One landing/home page first.** Ship a minimal, on-brand landing route before building any feature surface. This anchors the visual direction so everything after it inherits the same language.

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

## Anti-patterns to avoid

- Inventing custom color tokens before the theme is locked.
- Adding a UI component library *and* DaisyUI ("just in case").
- **Gradient buttons or gradient headings.** Solid colors only.
- **Text under 16px** for anything the user is expected to read.
- Verbose copy. Cut every word that isn't earning its place.
- Animations on every element. Reserve motion for state changes (reveal, success, error).
- Stock illustrations. Use type, color, and whitespace instead.
- Mixing icon libraries &mdash; one of anything is fine, two of anything is a smell.

## Exit criteria

- The user has approved the landing page screenshot or has clicked through it on `localhost`.
- `globals.css` contains the locked theme.
- `public/favicon.svg` exists and renders correctly as both the favicon (browser tab) and the inline header logo.
- Header contains only logo + primary product nav + account; footer carries About / Contact / legal.
- The user-flow critique has been written, discussed with the user, and applied where agreed.
- A `# Design` section in `PROJECT.md` captures the chosen mood, reference, color decisions, logo concept, the core user journey sentence, and any flow-critique items deferred to post-MVP.

Move on to `03-auth.md`.
