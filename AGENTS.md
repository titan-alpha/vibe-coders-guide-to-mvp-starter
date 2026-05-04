# Bootstrap protocol — Vibe MVP Starter

You are an AI coding agent (Claude Code, Codex, Cursor, etc.) and the user has
asked you to help them ship an MVP. They have already cloned this template — so
you are inside `vibe-mvp-starter/` (or wherever they renamed it). Follow the
protocol below **strictly from the top, in order, without skipping steps.**

---

## Step 1 — Confirm the project name and intent

Ask **one short question** if it isn't obvious from context: *"What's the
project — one sentence on what it does and who it's for?"* Capture the answer
verbatim into `PROJECT.md` at the repo root.

If the user has not yet renamed the cloned directory, suggest a slug and offer
to rename for them.

## Step 2 — Make the skill bundle agent-loadable

The skill bundle ships at `./vibe-mvp/`. Your platform reads skills from a
specific path:

- Claude Code: `.claude/skills/vibe-mvp`
- Codex: `.codex/skills/vibe-mvp`
- Cursor: `.cursor/skills/vibe-mvp`

Create that directory and copy the skills in:

```bash
mkdir -p <SKILLS_DIR>
cp -r vibe-mvp/* <SKILLS_DIR>/
```

(Substitute `<SKILLS_DIR>` for the path matching your platform.)

## Step 3 — Read SKILL.md and follow it strictly from the top

Open `<SKILLS_DIR>/SKILL.md`. **Do not skip the section called "Mode selection".
It is the first action.** That section will tell you to:

1. Offer the user **two paths**: (a) Quick chat dialogue, (b) Visual
   configurator (web UI). **Always offer both** — never assume the user
   wants chat. Many users prefer the visual interface and don't know it
   exists unless you tell them.
2. Once the user picks a path, **lock the mode** (which prescribes the
   skill plan) before starting any sub-skill.
3. Only after mode + path are locked may you begin sub-skill
   `01-discover.md`.

If you find yourself starting `01-discover.md` without having offered Path A
vs Path B and locked a mode, **stop and back up.**

## Step 4 — Use the template's scaffolding instead of writing from scratch

Most modules (auth, AI, chatbot, admin, notifications, feedback, analytics,
deliverables, cost monitoring, error alerts) are **already coded**. They are
gated by rows in the `feature_flags` table (see `lib/feature-flag.ts` and
`docs/modules.md`). You **enable** modules by flipping flags via the admin
Features tab — you do **not** rewrite the modules.

Initialize the database before first use:

```bash
npm install
npm run db:migrate
npm run setup-flags    # registers every default flag at off
```

## Step 5 — Operating rules (apply throughout)

- Store all credentials in `.env.local`. Never hardcode secrets in source.
- Pause and ask before any destructive action, any step that costs money, or
  any change that the user might not expect.
- Update `STATE.yaml` and `PROJECT.md` at the repo root as you go (the
  skills tell you when).
- Before claiming a UI surface is done, run `npm run dev`, click through it,
  and run `npm run test:visual` if visual changes were made.

---

That's it. Begin Step 1 now.
