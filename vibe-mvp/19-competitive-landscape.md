# 19 · Competitive landscape

Goal: produce a structured, source-cited map of the competitors the founder will be measured against — used to sharpen positioning, surface real differentiation, and feed the pitch deck's "Competition" slide. Output lands as `docs/research/competitors/<slug>.yaml` files at the project root.

This skill is **required for `investor-ready`** and **full-mvp**, and **opt-in elsewhere**. A weekend prototype doesn't need a market scan; an investor pitch dies without one. If the user is in `beta-with-users` or `content-site` mode, ask once whether they want to run this skill anyway, then skip without it if they decline.

If the user has already done formal competitive research (a deck slide, a Notion page, a doc) — *don't redo it*. Read what they have, capture it in the YAML schema below so the rest of the skill bundle has structured access, and move on.

## DIALOGUE — frame the scan (5–7 minutes)

Ask, in order, one or two at a time:

1. **"Who are the three companies you'd lose a deal to?"** — these are the *real* competitors. Don't accept "no one" — push: who would a customer evaluate before picking the user's product?
2. **"Who's the obvious incumbent?"** — the boring big-co option even if it's a worse fit. Investors will ask why the user wins against the incumbent's distribution.
3. **"Who's the closest open-source / free alternative?"** — sets the floor on willingness to pay.
4. **"Anyone you respect that's adjacent but not a direct competitor?"** — these become potential partners or distribution channels later.

If the user can't name competitors, that's a finding, not a pass. Either (a) the market truly is novel (rare; usually means demand isn't validated either) or (b) the user hasn't done their homework. Either way, the agent runs the scan in AUTONOMOUS below and confirms with the user afterward.

## AUTONOMOUS — build the file set

For each competitor named in dialogue, plus 2–4 the agent finds via search ("<category> startup", "<core feature> alternatives to <named competitor>", relevant subreddit threads, ProductHunt, G2/Capterra), create one file:

```
docs/research/competitors/<slug>.yaml
```

Use this schema (omit a key if you don't have a credible source — guesses are worse than gaps):

```yaml
name:
url:
category:                # direct | adjacent | incumbent | open-source-alternative
launched:                # year first publicly available
positioning:             # one terse sentence — what they sell, to whom
target_user:             # who actually pays / signs up
unique_features:         # 3-5 bullets — what makes them distinct
tech_stack_output:       # what the user ends up with (only relevant for builder-style products)
notable_partners:        # OEM, integration, distribution, strategic
userbase:
  signups:
  paying:
  arr:
  source:                # where the number came from
funding:
  total_usd:
  latest_round:          # stage, amount, date
  notable_investors:
team_size:               # rough headcount + how we know
issues_user_reported:    # recurring complaints from HN / Reddit / G2 / reviews
overlap_with_us:         # 0-5 — how directly they compete with this product
differentiator_we_have:  # what *this product* offers that they don't
last_updated:            # YYYY-MM-DD
sources:                 # 3-5 URLs you actually read
```

**Sourcing rules:**

- Funding: Crunchbase, TechCrunch, Forbes, Reuters, Bloomberg, the company's own press page, the founder's verified social. Not random aggregator sites.
- Userbase: prefer the company's own published numbers (blog post, conference talk, S-1) over third-party estimates. If you only have an estimate, prefix the value with `~` and cite the estimator.
- Issues users report: paraphrase *recurring* complaints across multiple threads, not single rants. Two HN threads + one G2 review pattern = real signal. One angry tweet = noise.
- If the user's space has a niche directory (e.g. AI agents → theresanaiforthat.com; SaaS → Capterra) check it for entries you might have missed.

After all files are written, also write `docs/research/matrix.yaml` — an at-a-glance comparison across these dimensions:

```yaml
# competitors compared on the dimensions investors and customers actually care about
last_updated: YYYY-MM-DD
columns: [name, positioning, funding_total, userbase, key_differentiator, our_advantage]
rows:
  - [name1, "...", "...", "...", "...", "..."]
  - [name2, ...]
```

## Surface signal — what to do with the data

Once the files exist, write a 5-bullet summary at `docs/research/findings.md`. Each bullet is one of:

1. **A real differentiator** — something we do that no listed competitor does. Cite which competitors lack it. This goes verbatim into the pitch deck.
2. **A weakness shared by all competitors** — usability complaint, pricing pain, missing integration. We can lead with the fix.
3. **A category we should NOT compete in** — if every competitor is well-funded and entrenched in feature X, we shouldn't try to win on X. Pivot the pitch.
4. **A potential partner** — an adjacent competitor whose users are our users. Worth a relationship later.
5. **A risk** — a well-funded incumbent moving into our lane. Acknowledge in the deck rather than dodge; investors will spot it.

Show the user the bullets, ask if anything surprises them, and update the files based on their reaction (founders often have non-public knowledge: "Oh, X just lost their head of product" or "Y's actually reselling our future partner's stuff").

## Hand-off to 18-deliverables

When `18-deliverables.md` runs, it reads `docs/research/findings.md` to populate:

- The pitch deck's **Competition** slide (a 2x2 matrix or feature table)
- The pitch deck's **Why us / Why now** slide (the differentiator + a category to dominate)
- The investor one-pager's "Market" section
- Defensive talking points for investor Q&A

If the founder skipped this skill, `18-deliverables.md` should pause and offer to run it before generating the deck.

## Anti-patterns

- **Don't write a 30-page market analysis.** This is one YAML per competitor + 5 bullets. Investors read the YAML once and the bullets always; they never read the analysis.
- **Don't pad the competitor list.** 5–10 well-researched is better than 30 shallow. If you're listing competitor #15, you're not adding signal.
- **Don't invent funding numbers.** A wrong number on a pitch slide is reputational damage. Omit the field if you don't have a real source.
- **Don't list us-as-better on every dimension.** Investors discount any deck where the founder's product wins every cell of the comparison matrix. Pick 1–2 cells we genuinely win and concede the rest.

## Checklist before marking this skill complete

- [ ] At least 5 competitors in `docs/research/competitors/*.yaml`, each with ≥ 3 sources.
- [ ] `docs/research/matrix.yaml` exists.
- [ ] `docs/research/findings.md` exists with 5 bullets.
- [ ] User has read findings and confirmed (or amended) them.
- [ ] STATE.yaml updated with `competitive_research: { completed: true, last_updated: YYYY-MM-DD, file_count: N }`.
