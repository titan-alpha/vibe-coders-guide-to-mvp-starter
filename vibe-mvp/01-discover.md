# 01 · Discover

Goal: leave this sub-skill with a one-paragraph product statement, a named audience, and a scoped MVP slice — all written into `PROJECT.md`.

## DIALOGUE — ask the user

Ask these one or two at a time, in conversation. Reflect their answers back in your own words to confirm understanding before moving on.

1. **The idea.** "In one or two sentences, what does this thing do, and for whom?"
2. **The audience.** "Who is the very first person you want to use this? Describe them — age range, tech comfort, what they're already doing instead."
3. **The job.** "What does success look like for that person in their first 60 seconds on the site?"
4. **The slice.** "If we could only ship one feature this week, which one earns their trust?"
5. **The non-goals.** "What are we explicitly *not* building in v1?"
6. **The access model.** "How should people get into v1? Three common options:
   - **Open signup** — anyone can sign up immediately. Best for content/tool products where you want growth.
   - **Free beta with waitlist** — anyone can ask to join, you (the admin) approve who gets in. Best when you want to moderate the user base, watch quality, or run early-cohort feedback loops without scale.
   - **Paid beta** — users pay to access. Requires Stripe. Best when you want to validate willingness to pay from day one.
   *Which fits?*" Capture the answer. This decision shapes sub-skills 04 (auth modes), 07 (admin dashboard tabs), and 08 (Stripe needed or not).

If the user gives a vague answer ("I want it to be like Notion but for X"), drill in: pick one workflow and describe it concretely.

## AUTONOMOUS — research and write

After the dialogue:

1. **Audience cognitive profile.** Based on the audience the user named, write 3–5 bullets in `PROJECT.md` under `# Audience` covering: what platforms they live on, their tolerance for friction, what visual language signals "trustworthy" to them, what would make them bounce. Draw on plain cognitive-science principles (cognitive load, recognition over recall, social proof, defaults), not jargon.
2. **Competitive landscape + positioning research (deeper than a scan).**

   A competitive scan that says "Notion exists" doesn't help. The agent does proper research: who's already in this space, what they actually do, where they're weak, and how the user's product can stake a defensible position.

   **Process** (do this AUTONOMOUSLY, then summarize for the user):

   1. **Identify 5–8 incumbents** — direct competitors (same problem, same audience), adjacent ones (similar problem, related audience), and substitutes (what people use today instead of any product). Use web search if available; otherwise lean on the agent's training data + the user's reference apps from DIALOGUE Q2.

   2. **For each incumbent, capture in one row**:
      - Name + URL
      - Audience they target (who uses them)
      - The 1 thing they do best
      - The 1 thing users complain about most (G2 / Reddit / Twitter sentiment)
      - Pricing model (free / freemium / paid / enterprise)
      - Estimated traction (signal: traffic, GitHub stars for dev tools, App Store rank for consumer)

   3. **Find the gap.** From the table, identify:
      - **Underserved audience segments**: who do incumbents NOT serve well? (often the cheap, niche, or geographically-specific edges)
      - **Underserved jobs-to-be-done**: what tasks do users hack together because no incumbent does them well?
      - **Pricing gap**: is everyone expensive? everyone free + ad-supported? a missing tier?
      - **UX gap**: are incumbents technically capable but ugly / slow / overwhelming?
      - **Trust gap**: are incumbents owned by Meta/Google/Big Tech and a privacy-respecting alt would matter?

   4. **Differentiate concretely.** The agent proposes 1–3 differentiators tailored to the user's product:
      - For B2C: usually emotional / experiential ("the one that respects your time", "the one for hobbyist gardeners specifically").
      - For B2B: usually structural ("the one with proper SSO", "the one that works without IT approval", "the one priced for teams under 20").

      Each differentiator must be **defensible at MVP scale** — something the user can credibly deliver in v1, not "we're better at AI" without specifics.

   5. **Write the positioning statement** — one sentence:
      > *For [target customer], [product] is the [category] that [unique differentiator], unlike [primary alternative] which [shortcoming]."*

      Example: *"For casual home cooks 25–45, Recipe Garden is the recipe app that strips out the blog-post life-stories, unlike AllRecipes which buries the actual recipe under SEO copy."*

   **DIALOGUE — share the research**:

   > *"I looked at [N] products in this space. Here's the table: [link or paste]. Three patterns I noticed: [pattern 1], [pattern 2], [pattern 3]. Based on that, the most defensible position for your MVP looks like: [positioning statement]. Want to refine it, or proceed with this framing?"*

   The positioning statement is **the** anchor for everything that follows — landing page copy, the pitch deck, the "why now" answer in customer conversations. Write it down in `PROJECT.md` `# Positioning` and `STATE.yaml decisions.positioning_statement`.

3. **MVP slice.** Write a 3–5 line description of the *single* user journey v1 will support, end-to-end. Everything else is post-MVP.
4. **Open questions.** List anything still ambiguous in `# Open questions`. Surface these to the user before moving on.

## Exit criteria

- `PROJECT.md` has populated `# Idea`, `# Audience`, `# Decisions` sections.
- `# Decisions` includes a one-line **Access model** entry: `open signup` / `free beta with waitlist` / `paid beta` (with Stripe noted if paid).
- The user has confirmed the MVP slice in their own words.
- No more than 2 open questions remain (and they're flagged, not blocking).
- Positioning statement is written, captured in `PROJECT.md # Positioning` and `STATE.yaml decisions.positioning_statement`.
- Competitive table (5–8 incumbents with audience / strength / weakness / pricing / traction) is captured in `PROJECT.md`.

Move on to `02-design.md`.
