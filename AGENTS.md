# Bootstrap protocol — Vibe Coder's Guide to MVP (skills repo)

You are an AI coding agent (Claude Code, Codex, Cursor, etc.) and the user has
asked you to help them ship an MVP using this skill bundle. Follow the protocol
below **strictly from the top, in order, without skipping steps.**

---

## Step 1 — Ask one short question, then act

> *"What should I do — (A) start a new project from scratch, (B) start a new
> project with just the skills, or (C) finish/harden a project you already
> have?"*

Wait for A, B, or C. Then ask **one** follow-up: where on disk to put it (for
A/B) or the path to the existing project (for C).

## Step 2 — Set up the working directory

Pick the matching block. Use the **agent-specific install path** — every
platform has its own convention:

| Platform | Install path | Notes |
|---|---|---|
| Claude Code | `.claude/skills/vibe-mvp/` | Auto-discovered. Native. |
| Antigravity (Google) | `.agent/skills/vibe-mvp/` | Singular `.agent`. Same SKILL.md format as Claude Code. |
| Replit Agent | `.agents/skills/vibe-mvp/` | Plural `.agents`. Same SKILL.md format. |
| Codex (OpenAI) | `AGENTS.md` at repo root | No skill directory. The bundle's AGENTS.md is sufficient. |
| Cursor | `.cursor/rules/vibe-mvp.mdc` | Single `.mdc` file with frontmatter. NOT `.cursor/skills/`. |
| Windsurf | `.windsurf/rules/vibe-mvp.md` | Markdown + `trigger:` frontmatter. 12K char cap. |
| Aider | `CONVENTIONS.md` + `.aider.conf.yml` (`read: CONVENTIONS.md`) | No skill system; loaded read-only. |
| Bolt.new | `claude.md` (lowercase, fixed name) | Hosted; copy/paste only. |
| Lovable / v0 / Devin | UI Knowledge / Instructions text field | UI-bound; copy/paste only. |

Substituted as `<INSTALL_PATH>` below. For Tier-1 platforms (Claude Code,
Antigravity, Replit) you copy the entire `vibe-mvp/` directory tree. For
Tier-2 single-file platforms (Cursor `.mdc`, Windsurf `.md`, Bolt `claude.md`,
Aider `CONVENTIONS.md`) you copy the `AGENTS.md` content from this repo
into the platform-specific filename.

**(A) New project from scratch — uses the project template:**

```bash
git clone https://github.com/titan-alpha/vibe-coders-guide-to-mvp-starter.git <name>
cd <name>
# For Tier-1 platforms (Claude Code / Antigravity / Replit) — copy the directory:
mkdir -p <INSTALL_PATH>
cp -r vibe-mvp/* <INSTALL_PATH>/
# For Tier-2 platforms (Cursor / Windsurf / Bolt / Aider) — copy AGENTS.md content
# into the platform-specific filename instead of the directory copy above.
```

**(B) New project, skills only:**

```bash
mkdir <name> && cd <name>
git clone https://github.com/titan-alpha/vibe-coders-guide-to-mvp-skills.git skills-tmp
# For Tier-1 platforms:
mkdir -p <INSTALL_PATH>
cp -r skills-tmp/vibe-mvp/* <INSTALL_PATH>/
# For Tier-2 platforms: cp skills-tmp/AGENTS.md to your platform's filename.
rm -rf skills-tmp
```

**(C) Existing project:**

```bash
cd <existing-project-path>
git clone https://github.com/titan-alpha/vibe-coders-guide-to-mvp-skills.git skills-tmp
# Same install pattern as (B).
mkdir -p <INSTALL_PATH>
cp -r skills-tmp/vibe-mvp/* <INSTALL_PATH>/
rm -rf skills-tmp
```

For **(C)**, after cloning the skills, **read enough of the existing repo**
(package.json, README, top-level structure, recent commits) to understand what's
already built **before** suggesting anything. Do not touch existing code yet.

## Step 3 — Read SKILL.md and follow it strictly from the top

Open `<INSTALL_PATH>/SKILL.md` (or, on Tier-2 platforms where the methodology
lives in a single file, the AGENTS.md / claude.md / CONVENTIONS.md you copied).
**Do not skip the section called "Mode selection". It is the first action.**
That section will tell you to:

1. Offer the user **two paths**: (a) Quick chat dialogue, (b) Visual
   configurator (web UI). **Always offer both** — never assume the user
   wants chat. Many users prefer the visual interface and don't know it
   exists unless you tell them.
2. Once the user picks a path, **lock the mode** (which prescribes the skill
   plan) before starting any sub-skill.
3. Only after mode + path are locked may you begin sub-skill `01-discover.md`.

If you find yourself starting `01-discover.md` without having offered Path A
vs Path B and locked a mode, **stop and back up.**

## Step 4 — Operating rules (apply throughout)

- Store all credentials in `.env.local`. Never hardcode secrets in source.
- Pause and ask before any destructive action, any step that costs money, or
  any change to existing code that the user might not expect.
- Update `STATE.yaml` and `PROJECT.md` at the project root as you go (the
  skills tell you when).

---

That's it. Begin Step 1 now.
