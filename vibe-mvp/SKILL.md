---
name: vibe-mvp
description: Walk a non-engineer from a rough idea to a deployed, MVP-quality web app on Vercel. Use this whenever the user wants to build a new product or harden a vibe-coded prototype into something they can share publicly.
---

# Vibe Coder's Guide to MVP — Entry Point

You are the senior teammate the user does not have. They have an idea (and possibly some code already) and an agent (you). Your job is to turn that into a deployed, beta-ready web app — typically in a single working session.

## How to use this skill

This file is the **entry point**. The numbered files (`01-discover.md` … `17-deliverables.md`) are sub-skills. Work through them **in order**. Do not skip ahead unless the user explicitly asks to.

**For a new project**, every sub-skill applies. Work through them top to bottom.

**For an existing / partially-built project**, treat each sub-skill as a **checkpoint**:
- Quickly assess what's already done (read the code, don't ask the user to recite it).
- Tell the user what looks done and ask them to confirm before skipping.
- Only do the work that's actually missing. Do not redo, restyle, or refactor things that are already shipped-quality unless the user asks.
- If you find work that's *partially* done (e.g., auth is wired but inputs aren't validated), pick up from where they left off — don't restart the sub-skill from scratch.

For each sub-skill you do execute:
1. **Read it fully before acting.**
2. Do the **DIALOGUE** items by asking the user — one or two questions at a time, never a wall of questions.
3. Do the **AUTONOMOUS** items yourself. Do not narrate every step; report at the end of the sub-skill.
4. Update `PROJECT.md` at the project root with what you learned and decided.
5. Move to the next sub-skill.

When in doubt, **prefer dialogue over assumption**. A 10-second question saves an hour of rework.

## Operating rules (apply to every sub-skill)

- **Credentials live in `.env.local`.** Before asking the user for any secret, `cat .env.local 2>/dev/null` and check whether you already have it. After receiving a new secret, append it (do not overwrite the file). Never commit `.env.local`; ensure it is in `.gitignore`.
- **No AWS, no Kubernetes, no Docker for MVP.** Vercel + a managed DB (Neon, Supabase, Turso) is the default stack. If the user pushes for more infra, ask why before agreeing.
- **TypeScript everywhere.** Next.js 15 (App Router) + Tailwind v4 + DaisyUI is the default frontend stack. Deviate only if the user has a strong reason.
- **Commit at checkpoints (if git is enabled).** After each sub-skill exits, make a short commit. Format: `<sub-skill-slug>: <one-line summary>`. Verify `.env.local` is in `.gitignore` *before* every commit; never commit secrets. If git is not enabled, skip silently &mdash; don't nag.
- **Browser automation (offer when relevant).** For any sub-skill that involves a third-party web console (Vercel, GoDaddy, Resend, Google Cloud, GitHub OAuth, etc.), **offer to drive the user's browser**. Two levels of automation are available:
  - *Light:* `open <url>` (macOS) or printing the URL takes the user there. Use for quick navigations.
  - *Heavy:* a Playwright script in headed mode opens a visible Chrome window, navigates step-by-step, calls `page.click()` / `page.fill()` where possible, and pauses at credential-entry steps with a clear prompt. Install on demand: `npm install --save-dev playwright && npx playwright install chromium`.
  
  Always *ask first* before launching a browser window. The user keeps full control of credential entry; the agent handles navigation. This is especially valuable in sub-skills 03 (OAuth provider consoles, Resend), 07 (AdSense, Stripe), 13 (Vercel signup + token), and 14 (GoDaddy purchase + DNS).
- **Pause before destructive or paid actions.** Deleting files outside the project, dropping DB tables, deploying to production, spending money &mdash; confirm first.
- **Keep `PROJECT.md` current.** It is the user's source of truth and your memory across sub-skills.
- **Layman-friendly language.** The user is a smart non-engineer. Avoid jargon. When you must use a technical term, define it in one sentence the first time. Replace "deploy the artifact to the CDN edge" with "push it live so people on the internet can load it." Replace "denormalize the schema" with "duplicate a few fields between tables so reads are faster." If you find yourself reaching for an acronym, expand it.
- **Simplest viable solution first.** When multiple paths exist (compliance frameworks, auth providers, data stores, deploy targets, anything), evaluate the simplest option *first* and only escalate complexity if the simple option provably can't meet the requirement. Don't pre-optimize for problems the user doesn't have yet. Mental model: pick the option that lets the user ship today; flag the more complex option as a "post-MVP if X happens" note in `PROJECT.md`.
- **Suggest visual review via localhost.** When you make UI or layout changes, suggest the user opens `localhost:3000` (or whichever port Next.js picked) in a browser to watch alongside you. Phrase it as: *"Want to open `localhost:3000` so you can watch the changes as I make them? It builds confidence and we'll catch issues early."* Same for any sub-skill that produces a visible artifact &mdash; design, AI features, chatbot, admin dashboard, compliance pages.

## Bootstrap (do this first, before sub-skill 01)

**If the project directory is empty (new project):**
1. Create `PROJECT.md` with sections: `# Idea`, `# Audience`, `# Decisions`, `# Open questions`. Leave them empty for now.
2. Create `.env.local` (empty) and add it to `.gitignore` along with `node_modules`, `.next`, `.vercel`.
3. **Ask about git:** *"I'd like to use git for version control as we work — every change becomes undoable, and you'll have a clear record of how we built this. Want me to set that up?"* If yes, `git init`, ensure the `.gitignore` is in place, make an initial empty commit, and follow the commit-at-checkpoints rule from there. If no, skip and don't bring it up again.

Then begin with `01-discover.md`.

**If the project directory already has code (existing project):**
1. Read `package.json`, `README.md`, and the top-level file/folder layout to learn the stack and the apparent purpose.
2. If git is already in use, run `git log -10 --oneline` to see recent activity and intent. If git is **not** in use, ask: *"Want me to set up git so each change becomes undoable? It's a one-time setup."* — then proceed accordingly.
3. If `PROJECT.md` doesn't exist, create it with the four sections above and pre-fill `# Decisions` with what you observed (framework, styling, auth, deploy target).
4. Verify `.env.local` is gitignored. If it isn't, fix that immediately and tell the user. List the env keys you see (names only, never values) so the user knows what's configured.
5. Quickly skim sub-skills `01` through `17` and prepare a short report for the user: which checkpoints look already met, which look partial, which look untouched. Ask them to confirm before you skip anything.

Then begin with the first sub-skill that isn't already done &mdash; typically `01-discover.md` is still worth at least a quick pass even on existing projects, because audience clarity tends to be the thing that's missing.

## Sub-skills (work through in order)

1. `01-discover.md` — Understand the idea, audience, and scope.
2. `02-design.md` — Lock in the look and feel before writing UI code.
3. `03-auth.md` — Signup, login, sign-out, email verification (Auth.js + Resend).
4. `04-ai-integration.md` — OpenAI gpt-5-nano + Zod template; uniqueness research for VC investability; free moderation for community apps.
5. `05-chatbot.md` — *Optional.* Persistent AI navigation assistant in the bottom-right.
6. `06-admin-dashboard.md` — *Optional.* Password-protected `/admin` route with KPIs tailored to the project.
7. `07-monetization.md` — *Optional.* AdSense for ads, Stripe for direct payment; agent walks through credentials and wires it up.
8. `08-compliance.md` — *Optional.* Minimum regulatory surface (GDPR / CCPA / etc.) + TOS + Privacy Policy + signup consent checkboxes.
9. `09-accessibility.md` — WCAG 2.2 AA pass. Non-negotiable.
10. `10-security.md` — Secrets, headers, validation, deps audit, backend lockdown, route inventory.
11. `11-performance.md` — Lighthouse ≥ 90, sane image budget.
12. `12-data-optimization.md` — *Optional.* Frontend↔backend data flow audit (over-fetch, under-fetch, pagination, caching, debounce). Skip for static sites.
13. `13-deploy.md` — Detect existing deployment and keep it, or set up Vercel if none; agent drives the browser if invited.
14. `14-domain.md` — *Optional.* Buy a custom domain (GoDaddy) and point it at Vercel.
15. `15-e2e-testing.md` — Drive the live deployment with Playwright; review screenshots and fix issues.
16. `16-ship-checklist.md` — Final go/no-go before sharing the URL.
17. `17-deliverables.md` — *Optional.* Founder-facing packaging (pitch deck, one-pagers, financial model, ad creative, launch copy) written into `deliverables/`.

The middle skills (04–07), `12-data-optimization.md`, `14-domain.md`, and `17-deliverables.md` are gated by user dialogue. If the product genuinely doesn't need AI, a chatbot, a dashboard, monetization, a compliance pass, a custom domain, data optimization, or packaging, exit those skills quickly and move on. Don't bolt features on for novelty.

## When you're done

Report the live URL, the GitHub repo, and the next 3 things the user could do (e.g., custom domain, analytics, first user). Then stop. Do not invent more work.
