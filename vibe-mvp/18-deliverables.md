# 18 · Deliverables

Goal: with the MVP shipped, produce the founder-facing **documents** that package the product for humans &mdash; investors, early customers, press, and the founder's own reference shelf. Every deliverable lands in `deliverables/` at the project root, and Finder is opened on completion so the user sees the stack of finished work.

This skill is **optional**. Many founders will want only one or two deliverables; a few will want the full stack. Ask first; don't generate what isn't needed.

## DIALOGUE — offer the menu

Present this list to the user, one line each, and ask which they want. Order by "most common first".

> *"Now that the product is live, I can produce any of these founder-facing documents. They'll all live in `deliverables/` at the project root. Pick the ones you want (or say 'all'):*
>
> 1. *&#x1F4CA; **Pitch deck** &mdash; 10&ndash;15 slide PPTX for investors or partners.*
> 2. *&#x1F4C4; **Investor one-pager** &mdash; single-page DOCX summarizing the opportunity.*
> 3. *&#x1F4E3; **Marketing one-pager** &mdash; single-page DOCX for customers / press.*
> 4. *&#x1F4C8; **Financial projections model** &mdash; XLSX with a 24-month forecast.*
> 5. *&#x1F5FA; **Marketing strategy** &mdash; DOCX go-to-market plan with beachhead, channels, and 90-day milestones.*
> 6. *&#x1F4DA; **Research / thesis paper** &mdash; DOCX deep-dive on the problem and the product's point of view.*
> 7. *&#x1F5BC; **Ad creative pack** &mdash; HTML templates for 3&ndash;5 launch ads (social + display).*
> 8. *&#x1F4E8; **Press / launch announcement** &mdash; short article + tweet thread + Hacker News post draft.*
>
> *Which should I produce?"*

Record the user's answer. For each selected deliverable, follow the architecture below.

## AUTONOMOUS — prepare

1. Re-read `PROJECT.md` in full. Every deliverable draws from it. The audience description, MVP slice, design decisions, AI feature, KPIs, and deploy URL all surface in at least one deliverable.
2. Read the live site (`/`, key product pages, the OG meta tags). A deliverable that contradicts the product is worse than no deliverable.
3. Create `deliverables/` at project root if it doesn't exist. Add `deliverables/` to `.gitignore` by default &mdash; these are often not meant for the public repo. Confirm with the user if their repo is private and they want them committed.
4. Install any needed output libraries on demand. Don't install everything up front.

## Deliverable architectures

### 1. Pitch deck &mdash; `deliverables/pitch-deck.pptx`

- **Audience:** investors, partners, advisors.
- **Format:** PPTX via `pptxgenjs` (`npm install --save-dev pptxgenjs`). Native PowerPoint so the founder can edit.
- **Length:** 10&ndash;15 slides, 16:9.
- **Structure** (standard Sequoia-style plus adjustments for where the product actually stands):
  1. **Title** &mdash; product name, tagline, one line "what it is".
  2. **The problem** &mdash; the pain, who feels it, evidence it's real.
  3. **The insight** &mdash; why this is possible *now* and why it hasn't been done before.
  4. **The solution** &mdash; the MVP slice, in one sentence and one screenshot.
  5. **Product** &mdash; 2&ndash;3 screenshots of the live site. Ship real screenshots, not mockups.
  6. **How it works** &mdash; one diagram or three bullet workflow.
  7. **Market** &mdash; TAM / SAM / SOM with sources.
  8. **Traction (if any)** &mdash; numbers from the admin dashboard (sub-skill 06), user count, any signal.
  9. **Business model** &mdash; how money comes in. Even at MVP, a hypothesis.
  10. **Competition** &mdash; 2x2 positioning matrix or a "we / they" table. **Populated from `docs/research/findings.md` and `docs/research/competitors/*.yaml`** (produced by sub-skill `19-competitive-landscape`). If those files don't exist when this skill runs, **stop and offer to run `19-competitive-landscape` first** &mdash; the deck is materially worse without it, and investors will spot it.
  11. **Team** &mdash; founder(s), why they can do this.
  12. **Ask** &mdash; what are you asking for (funding amount, introductions, pilot partners).
  13. **Appendix** &mdash; financial projections summary, architecture, references.
- **Populate from:** `PROJECT.md` `# Idea` &rarr; slides 1&ndash;4; `# Audience` &rarr; slides 2 &amp; 7; live screenshots &rarr; slide 5; `# KPIs` from sub-skill 06 &rarr; slide 8; user input for slides 9&ndash;12 via DIALOGUE.
- **Design:** dark theme, one accent color (from the product's DaisyUI theme), sans-serif display (Inter / Helvetica Neue), minimal text per slide (never more than 6 bullets), one idea per slide.

### 2. Investor one-pager &mdash; `deliverables/investor-one-pager.docx`

- **Audience:** warm intros. Designed to be skimmed in 90 seconds.
- **Format:** DOCX via `docx` (`npm install --save-dev docx`). Letter size, one page.
- **Length:** exactly one page. If it overflows, cut words, not margins.
- **Structure:**
  - Header: product name + logo + tagline + founder contact + current stage (e.g., "Pre-seed · MVP live Apr 2026").
  - **The Opportunity** (60 words) &mdash; problem + market size.
  - **The Product** (60 words) &mdash; what it does and the MVP slice.
  - **Traction** (3 bullets, numeric where possible).
  - **Business Model** (2 bullets).
  - **Team** (1&ndash;2 lines per founder).
  - **The Ask** (1 line: amount, use of funds).
  - Footer: URL, email.
- **Populate from:** `PROJECT.md` sections, compressed hard. This is the hardest deliverable to do well &mdash; terseness is the craft.

### 3. Marketing one-pager &mdash; `deliverables/marketing-one-pager.docx`

- **Audience:** potential customers, journalists, partners.
- **Format:** DOCX, one page.
- **Structure:**
  - Hero: product name, logo, tagline.
  - **What it is** (one paragraph in plain language, no jargon).
  - **Who it's for** (the target audience from `PROJECT.md`).
  - **How it works** (3 steps or 3 features).
  - **Why now** (one paragraph).
  - **Screenshot** of the product.
  - **Try it** URL + signup CTA.
- **Populate from:** audience and idea, reworded for civilians (no "TAM", no "funding", no "team" section).

### 4. Financial projections model &mdash; `deliverables/financial-projections.xlsx`

- **Audience:** founder first, then investors.
- **Format:** XLSX via `exceljs` (`npm install --save-dev exceljs`). Real spreadsheet so they can stress-test assumptions.
- **Length:** 4&ndash;5 sheets.
- **Structure:**
  - **Assumptions** sheet: named cells for CAC, LTV, conversion rate, price, COGS%, churn, headcount cost. Everything below derives from here &mdash; changing a number here must propagate.
  - **Revenue forecast** (24 months): users, paying users, MRR, ARR. Charts: MRR growth, paying-user growth.
  - **Costs** (24 months): infra (Vercel, DB, OpenAI tokens), headcount, tools, CAC spend. Chart: burn curve.
  - **P&amp;L summary**: revenue &minus; costs = net burn per month; cumulative cash out.
  - **Scenarios**: Base / Bull / Bear toggle via a single cell on Assumptions.
- **Populate from:** user via DIALOGUE (*"What's your launch price?" "What's your expected monthly growth rate?" "How many people are on the team, at what cost?"*). Default plausible numbers for anything the user can't answer, and highlight them so they know to revise. AI token costs pull from sub-skill 04 measurements if available.

### 5. Marketing strategy &mdash; `deliverables/marketing-strategy.docx`

- **Audience:** founder, for execution. Sometimes shared with an advisor or early marketing hire.
- **Format:** DOCX, 10&ndash;20 pages.
- **Structure:**
  - Executive summary (1 page).
  - **Beachhead** &mdash; which single audience to dominate first and why (MIT Sloan framework: unmet need + communicative network + expandable). Use `PROJECT.md` audience as the anchor.
  - **Positioning** &mdash; "For X, who Y, our product is Z, unlike A, we B".
  - **Channels** &mdash; 3&ndash;5 channels with rationale; prioritized. For each: hypothesis, first experiment, success metric, budget.
  - **90-day milestones** &mdash; week-by-week execution plan.
  - **Metrics** &mdash; North Star + 3 supporting (pull from sub-skill 06 KPIs).
  - **Risks** &mdash; 3&ndash;5 named risks with mitigation.
  - **References** &mdash; cite sources for any claim.
- **Populate from:** `PROJECT.md` audience + idea; agent-researched channel benchmarks with citations.

### 6. Research / thesis paper &mdash; `deliverables/research-paper.docx`

- **Audience:** investors who want depth, academic-leaning partners, press.
- **Format:** DOCX, 8&ndash;15 pages, formal tone, cited.
- **Structure:**
  - **Abstract** (150 words).
  - **Introduction** &mdash; why this problem matters.
  - **Prior work** &mdash; what's been tried, why it didn't stick.
  - **Thesis** &mdash; the point of view the product embodies.
  - **Method / Product** &mdash; how the MVP tests the thesis.
  - **Early results** &mdash; anything from the admin dashboard, user interviews, etc.
  - **Implications**.
  - **Limitations and future work**.
  - **References**.
- **Populate from:** `PROJECT.md` + web research. Every empirical claim gets a citation. No bluffing.

### 7. Ad creative pack &mdash; `deliverables/ads/`

- **Audience:** potential users &mdash; social feeds and display placements.
- **Format:** HTML files per ad, one per concept, with inlined CSS. Use the product's theme colors. Each is a self-contained file that can be opened in a browser and screenshotted at exact ad dimensions (1080x1080, 1200x628, 1080x1920).
- **Output:**
  - `deliverables/ads/social-square.html` (1080x1080)
  - `deliverables/ads/social-landscape.html` (1200x628)
  - `deliverables/ads/social-vertical.html` (1080x1920)
  - 3&ndash;5 concept variants per format, each emphasizing a different hook (problem-lead, outcome-lead, testimonial-lead, social-proof-lead).
- **Populate from:** one-line hooks derived from the tagline and MVP slice. Each concept tests a different angle.

### 8. Press / launch announcement &mdash; `deliverables/launch/`

- **Audience:** tech press, Hacker News, the founder's audience, early customers.
- **Format:** Three Markdown files in `deliverables/launch/`:
  - `press-release.md` &mdash; traditional 400&ndash;500-word press release format.
  - `hn-launch-post.md` &mdash; Hacker News "Show HN" style: 1&ndash;2 paragraphs, product URL, what it does, why you built it, what's next, ask for feedback.
  - `twitter-thread.md` &mdash; 5&ndash;8 tweets, one per line, each &lt; 280 chars. Hook tweet first.
- **Populate from:** `PROJECT.md` + the live URL. Avoid corporate-speak; the HN and Twitter pieces should sound like a human wrote them.

## AUTONOMOUS — produce

For each selected deliverable:
1. Gather the inputs (re-read `PROJECT.md`, pull screenshots from the live site, run any analytics queries needed).
2. DIALOGUE with the user for anything you don't know &mdash; price, fundraising ask, team bios, key sources.
3. Generate the file into `deliverables/` using the architecture above.
4. Log to the user: `deliverables/<filename>` generated, <size>KB.

## When all selected deliverables are done

Open Finder on the directory so the user sees the completed work:

```bash
open deliverables/
```

Then report a short summary listing every file produced with a one-line description.

## AUTONOMOUS — investor data room (investor-ready mode only)

The pitch deck opens the door; the data room closes the deal. For founders going into a fundraise, the data room is what investors review during diligence. Missing it means scrambling under pressure during a process where speed signals confidence.

**Mode-gate**: only run this for `investor-ready` mode. For all other modes, skip with a note in `STATE.yaml`.

### What goes in the data room

A `deliverables/data-room/` folder structure the agent generates:

```
data-room/
├── 00-overview/
│   ├── one-pager.pdf                 # 1-page summary (already in 18 base section)
│   ├── pitch-deck.pdf                # already in 18 base section
│   └── data-room-index.md            # this is the README of the data room
├── 01-financials/
│   ├── financial-model.xlsx          # 5-year projection with assumptions
│   ├── unit-economics.md             # CAC, LTV, payback period, gross margin
│   └── current-burn.md               # monthly cash burn + runway
├── 02-product/
│   ├── product-overview.md           # what it does, who for, why now (deeper than the deck)
│   ├── roadmap.md                    # next 6-12 months
│   └── architecture.md               # high-level technical overview (1 diagram + paragraphs)
├── 03-traction/
│   ├── metrics.md                    # MAU/DAU/retention/conversion — pulled from sub-skill 08 analytics
│   ├── customer-references.md        # 3-5 customer testimonials with permission to contact
│   └── waitlist.md                   # if relevant: waitlist size + growth rate
├── 04-team/
│   ├── founder-bios.md               # full bios + LinkedIn + relevant background
│   ├── advisors.md                   # if any
│   └── cap-table.md                  # current ownership; pre/post-money modeling tools
├── 05-legal/
│   ├── incorporation.md              # state, date, structure
│   ├── ip-assignment.md              # all founders/early contractors assigned IP
│   └── material-contracts.md         # customer contracts, vendor MSAs, anything material
├── 06-security/
│   ├── security-policy.md            # what sub-skill 11 + 03 cover; written for non-technical
│   ├── data-handling.md              # what data, where it lives, retention, encryption
│   └── compliance.md                 # frameworks per sub-skill 03 vertical research
└── 07-extras/
    ├── press-mentions.md             # if any media coverage
    └── future-fundraise-thinking.md  # how this round fits a longer-term arc (optional, advanced)
```

The agent generates each file in turn, populating from existing `STATE.yaml` decisions and `PROJECT.md` content where possible. For the financial model: provide a starter `.xlsx` with the conventional structure (Assumptions sheet, Revenue sheet, Costs sheet, Cash sheet) — founder fills in numbers OR the agent populates from the unit economics in `decisions.unit_economics` if computed.

### What investors actually look at

In a typical seed-stage diligence:
1. **Deck + one-pager** (15 minutes — first read).
2. **Metrics** (15 minutes — is this real?).
3. **Founders** (30 minutes — bio + a call).
4. **Cap table + financials** (15 minutes — clean? defensible?).
5. **Product** (15 minutes — does the demo match the pitch?).

Most early-stage investors don't read the security/compliance sections deeply unless the product is in a regulated space. But missing those sections signals lack of preparation.

### Voice + completeness

Each file is **2-5 pages max**, written in plain prose. Investors skim. Don't pad. The pitch deck already made the marketing case; the data room is for substantiating the claims:

- **Specific** — "MAU grew from 12 to 234 in the last 90 days" not "growing fast."
- **Sourced** — every metric links back to where it's measured (sub-skill 08 analytics tab, or a screenshot of the dashboard).
- **Honest about gaps** — "Q3 retention dropped 8% after a UX change; we identified the cause in user interviews; v0.4 reverts the change. Future-state retention assumed to recover to Q2 levels." Beats hiding the dip.

### Distribution

Don't send the whole folder zipped. Use a data-room tool that tracks views: **Docsend** (free tier), **Notion** with viewer-permission links, or a Google Drive folder with view-only access by individual email. View-tracking is signal — investors who skim the deck and never open the data room are unlikely to convert.

### Anti-patterns

- A data room that's just the pitch deck plus marketing copy. Investors expect substance behind every claim.
- Customer references without prior permission. ALWAYS get explicit ok before listing someone as a reference.
- Financial models with no assumptions sheet. Investors want to see what you believe AND what you're guessing at.
- Hiding the cap table until "the term sheet stage." Founders who hide caps signal complexity. Show it cleanly upfront.
- Sending the data room before the founder has talked to the investor. The deck + intro + a meeting come first; data room is for the second meeting.

## AUTONOMOUS — press kit at `/press`

For any product launching publicly, journalists / podcasters / reviewers / aggregators land on `/press` looking for assets. Make it cheap for them to write about you.

### Contents

`/press` is a single page (or a small sub-site) with:

- **Logos** in PNG (transparent bg, 1024×1024) and SVG. Both light-background and dark-background variants.
- **Wordmark** versions of the logo (logo + product name, horizontal layout).
- **Screenshots** at 1920×1200 of the 3 most-photogenic surfaces (landing, primary feature, hero result).
- **Founder photos** — headshot at 1024×1024, action shot at 1920×1080.
- **Product description in three lengths**:
  - 1-line tagline (~12 words) — for headlines.
  - 1-paragraph (~50 words) — for short articles, podcast intros.
  - 1-page (~300 words) — for full feature pieces. Includes the "why now" + the founder story.
- **Founder bio** — 100-word version.
- **Press contact** — an email that's actually monitored. Same email as compliance contact (sub-skill 03) is fine.
- **Recent coverage** — links to any prior press, in chronological order.
- **Brand colors + typography** — the OKLCH primary + accent + the locked display font name. Lets writers match the visual identity in their pieces.

### Implementation

```tsx
// app/press/page.tsx
export default function PressPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold">Press kit</h1>
      <p className="opacity-70 mt-2">Everything you need to write about <strong>{PRODUCT_NAME}</strong>.</p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Logos</h2>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <a href="/press/logo-on-light.svg" download className="card border border-base-300/60 p-4">
            <img src="/press/logo-on-light.svg" alt="Logo on light" />
            <span className="text-xs opacity-70 mt-2">SVG · download</span>
          </a>
          <a href="/press/logo-on-dark.svg" download className="card border border-base-300/60 p-4 bg-neutral text-neutral-content">
            <img src="/press/logo-on-dark.svg" alt="Logo on dark" />
            <span className="text-xs opacity-70 mt-2">SVG · download</span>
          </a>
          {/* PNG variants linked similarly */}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Screenshots</h2>
        {/* gallery */}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">About</h2>
        <h3 className="font-medium mt-4">One line</h3>
        <blockquote className="border-l-4 border-primary pl-4 mt-1 italic">{ONE_LINE_TAGLINE}</blockquote>

        <h3 className="font-medium mt-4">Paragraph</h3>
        <p className="mt-1">{ONE_PARAGRAPH_DESCRIPTION}</p>

        <h3 className="font-medium mt-4">Long form</h3>
        <div className="prose mt-1">{ONE_PAGE_DESCRIPTION_HTML}</div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Founder</h2>
        <div className="flex gap-4 items-start mt-4">
          <img src="/press/founder-headshot.jpg" alt={FOUNDER_NAME} className="w-32 h-32 rounded-full" />
          <div>
            <div className="font-medium">{FOUNDER_NAME}</div>
            <div className="text-sm opacity-70">{FOUNDER_BIO_100}</div>
            <div className="mt-2 flex gap-3 text-sm">
              <a href="https://linkedin.com/in/...">LinkedIn</a>
              <a href="https://x.com/...">X</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Brand</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div>
            <div className="w-full aspect-square rounded" style={{ background: PRIMARY_HEX }} />
            <div className="text-xs mt-2 font-mono">{PRIMARY_HEX}</div>
            <div className="text-xs opacity-70">primary</div>
          </div>
          {/* accent, neutral, surface */}
        </div>
        <p className="mt-3 text-sm">Display font: <strong>{DISPLAY_FONT}</strong> · Body font: system stack</p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Press contact</h2>
        <p className="mt-1">For interviews, demos, or questions: <a href={`mailto:${PRESS_EMAIL}`}>{PRESS_EMAIL}</a></p>
      </section>
    </main>
  );
}
```

Linked from the footer (sub-skill 02 footer rule treats "Press" as an optional discoverable link, only shown when `/press` exists).

### Anti-patterns

- A `/press` page that just says "coming soon." Worse than no page — signals you're not serious.
- Screenshots that are out of date (showing a UI that no longer exists). Update on every MAJOR release.
- Press email that bounces. Test before launching the page.
- Bio in the third person if the founder hates that ("Jane is a serial entrepreneur..."). Match the voice — first person is also fine.
- No download buttons. Journalists need actual files, not screen-grab-from-website.

## AUTONOMOUS — assemble the launch sequence

A coordinated launch typically gets 5&ndash;10&times; the initial traction of an uncoordinated one, and the work all happens **before** the launch button is pressed. The agent assembles the launch plan and walks the user through executing it.

### 1. Launch surfaces &mdash; pick the relevant ones

Not every product belongs everywhere. Match surfaces to the audience:

| Surface | Right when | Wrong when | Sweet-spot launch day |
| --- | --- | --- | --- |
| **Product Hunt** | B2C / SaaS / dev tools / consumer with broad-ish appeal | Hyper-niche B2B; regulated industries | Tuesday or Thursday, scheduled 12:01 AM PT |
| **Hacker News (Show HN)** | Technical audience; dev tools; novel approach | Marketing-heavy products; non-technical audience | Tuesday/Wednesday morning ET; submit text-only "Show HN: &hellip;" with a clear what-this-does first sentence |
| **Twitter/X thread** | Founder has any following; product is screenshot-able | No following + not screenshot-able | Same-day morning ET, 5&ndash;8 tweet thread with a clear hook |
| **Reddit (relevant subreddit)** | Audience lives in a specific subreddit | No clear sub; subs that ban self-promo | Tuesday 9 AM ET in the relevant sub; check sub rules first |
| **LinkedIn post** | B2B, enterprise, founder is on LinkedIn | Pure consumer | Tuesday 8 AM ET; lead with a story not a feature list |
| **Pre-built waitlist email** | You have a waitlist | You don't | Same morning, 1 hour before public launch |
| **Indie Hackers** | Solo / small team founder story | Big-company-funded launches | Same week; less time-sensitive |
| **Beta-list emails (Betalist, BetaList.com)** | Want extra surface area | Not worth alone | 2 weeks before public launch (queue time) |

The agent reads `PROJECT.md` audience + `STATE.yaml decisions.access_model` + the product type to pick the 3&ndash;5 most relevant surfaces. Don't try to launch on all of them &mdash; better focused than scattered.

### 2. Pre-launch checklist (T-7 days)

- [ ] Production URL works end-to-end on a brand-new account (run `tests/e2e/flows/` against prod).
- [ ] Status page is live (sub-skill 11 disaster-prep) and the founder can update it in &lt;30s.
- [ ] Waitlist email drafted and scheduled (or queued in Resend).
- [ ] Product Hunt asset bundle prepared (gallery images at 1270&times;760, 1-line tagline, "first comment" introduction post, founder bio).
- [ ] Hacker News title drafted (under 80 chars, "Show HN: &lt;product&gt; &ndash; &lt;one-line clear value prop&gt;").
- [ ] Twitter thread drafted (5&ndash;8 tweets, hook first, screenshots in tweets 2&ndash;4, ask for feedback in last tweet).
- [ ] Cost ceilings configured + verified (sub-skill 11) &mdash; a viral spike must NOT result in a $5K bill.
- [ ] Error alerting active and tested with a synthetic event (sub-skill 11 + 07).
- [ ] Five sympathetic friends warned: they'll upvote / comment / share within the first 30 minutes.

### 3. Day-of choreography (T+0)

The agent generates a per-launch playbook based on the surfaces picked. Sample for a typical Product Hunt + HN + Twitter coordinated launch:

```
12:01 AM PT — Product Hunt post goes live (auto-scheduled).
06:00 AM ET — Founder posts the "first comment" introduction on PH.
07:30 AM ET — Hacker News submission ("Show HN: …").
08:00 AM ET — Twitter thread + retweet from any team accounts.
08:30 AM ET — Waitlist email goes out.
09:00 AM ET — Sympathetic friends batch (DMs go out asking for support).
10:00 AM–6:00 PM — Founder is glued to the comment threads, replying to every comment within 10 min.
06:00 PM ET — End-of-day Twitter recap with "thank you + here's what we learned" thread.
```

The founder's job day-of is to **respond, not promote**. Reply to every comment, debug every reported issue, thank every supporter. The product launching is one variable; how the founder shows up is the other.

### 4. Post-launch (T+1 to T+30)

- T+1: Send a personal thank-you to the top 10 commenters / reviewers.
- T+3: Write a "what we learned" blog post / Twitter thread.
- T+7: Begin the first-10-users 1-on-1 discovery (see next section).
- T+14: Iterate on the top user feedback, ship a `MINOR` bump (sub-skill 14), email the waitlist with what's new.
- T+30: Honest retrospective in `PROJECT.md` &mdash; what worked, what didn't, what's next.

## AUTONOMOUS + DIALOGUE — the first-10-users discovery process

Once the MVP is live and the first wave of users have signed up, the highest-leverage activity is **1-on-1 sessions with the first 10 of them**. This is where you find out what's really confusing, where the value lives, what to build next.

This is post-MVP work the agent helps the user do &mdash; not pre-MVP validation (see SKILL.md "Build first, validate after" rule).

### 1. Who to invite

From the first 30 signups, pick 10 who match the audience profile most closely. Reach out personally:

> *"Hey [name] &mdash; saw you signed up for [product]. I'm the founder; would you be up for a 30-minute Zoom this week so I can watch you use it and ask a few questions? It really helps me figure out what to build next."*

Most people say yes. Block 30-min slots over 1&ndash;2 weeks. Don't batch them all in one day; you'll lose pattern-recognition.

### 2. What to ask &mdash; agent generates platform-specific questions

The agent reads `PROJECT.md` (audience, MVP slice, positioning) and proposes a discovery script tailored to this product. Generic baseline questions (every script):

- "Walk me through how you found this." *(acquisition signal)*
- "What did you expect when you signed up? Did it match?" *(expectation gap)*
- "Show me how you'd use this for a real task &mdash; pretend I'm not here." *(observe friction)*
- "What surprised you (good or bad)?" *(pattern interrupts)*
- "What would you tell a friend it does, in one sentence?" *(positioning validation)*
- "What's the next thing you'd want to do that you can't?" *(next-feature signal)*
- "If this disappeared tomorrow, would you actually miss it?" *(retention signal &mdash; the hardest, most honest question)*

Then 3&ndash;5 platform-specific questions the agent generates. Examples:

| Platform type | Sample tailored questions |
| --- | --- |
| Recipe app | "How do you usually decide what to cook on a weeknight? Where does this fit in?" |
| Dev tool | "What's the friction you hit between [step A] and [step B]? Does this remove it or shift it?" |
| Marketplace | "Have you tried to [transact]? Walk me through what you'd want to happen next." |
| Community | "Would you post here? What would stop you?" |
| AI product | "When did the AI feel useful vs feel in the way? Be specific." |

### 3. Record the session

With permission, record + transcribe (Zoom can do both). The transcript is the artifact &mdash; the agent processes it later to extract patterns.

### 4. Feed transcripts to the agent

After 3+ sessions, paste each transcript (or upload via the configurator's Discovery tab) into the project. The agent reads them and produces:

- **Themes that recurred** across users (3+ mentions = signal; 2 = noise; 1 = ignore unless it's a critical bug).
- **Confusion points** &mdash; where every user paused, asked a question, or got lost. Each one becomes a UX fix.
- **Words users used** &mdash; the actual vocabulary your audience speaks. The landing page copy should mirror this language.
- **Feature requests** &mdash; collected, deduplicated, ranked by frequency &times; audience-fit.
- **Retention signal** &mdash; for the "would you miss it" question, count yes / yes-but-only-for-X / no answers.

The agent writes the synthesized insights to `PROJECT.md # Discovery insights` and proposes 3 concrete changes to make next, in priority order. The user picks which ones to act on.

### 5. Configurator's Discovery tab

If the user is using the configurator (Path B), the Discovery tab provides:

- A textarea per session to paste a transcript.
- A "Suggested questions for your next session" panel (the agent generates these based on what came up in prior sessions &mdash; gaps to dig into).
- A live "Themes I'm seeing" sidebar that updates as new transcripts are added.
- A button to generate the next iteration plan from current insights.

### Anti-patterns

- **Asking leading questions.** "Did you find this useful?" gets "yes." "Walk me through what you tried" gets the truth.
- **Defending the product mid-session.** When the user is confused, the agent (and the founder) should ask "tell me more" not "actually it's because&hellip;". Defense kills signal.
- **Acting on a single data point.** Two users in a row asking for X is interesting; one user asking for X is just one user.
- **Skipping the "would you miss it" question.** It's the only honest measure of retention you can get pre-product-market-fit.

## Anti-patterns to avoid

- **Generating all deliverables every time.** Only produce what the user selected. A pitch deck the founder didn't ask for is noise.
- **Filler content.** If a section of a deliverable has nothing real to say, cut the section. An honest 9-slide deck beats a padded 15-slide deck.
- **Mockup screenshots** when real ones exist. You just shipped the product &mdash; use actual screenshots.
- **Invented metrics.** If traction is thin, say so. Investors can tell when numbers are made up.
- **Treating this as a "final" lock-in.** These are drafts. Every deliverable should be editable by the founder in the native application (PowerPoint, Word, Excel).

## Exit criteria

- Every deliverable the user asked for lives in `deliverables/` (or `deliverables/ads/`, `deliverables/launch/`) at the project root.
- Each file opens cleanly in its native application and is editable.
- Finder has been opened on the `deliverables/` directory so the user sees everything in one glance.
- A `# Deliverables` section in `PROJECT.md` lists which were produced and when.
- The user has been told, one-line-per-file, what was generated.
- Launch playbook is written into `deliverables/launch-playbook.md` with picked surfaces + day-of timeline + pre-launch checklist.
- For investor-ready: discovery process is set up, even if discovery itself happens post-deploy.
- Discovery insights template (`PROJECT.md # Discovery insights`) exists as a placeholder ready for the first transcripts.
- For `investor-ready`: full `deliverables/data-room/` folder generated with all 7 sections; financial-model starter included; founder has populated the placeholder fields. Distribution-tracking tool (Docsend / Notion / Drive view-only) chosen.
- `/press` route ships with logos (SVG + PNG, light + dark variants), 3 screenshots at 1920×1200, founder photos, three description lengths, brand color + font, monitored press email. Linked from footer.

You're done. Congratulate them &mdash; they shipped, and they have the packaging to share it.
