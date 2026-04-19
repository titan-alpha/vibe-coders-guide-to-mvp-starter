# 16 · Ship Checklist

Goal: final go/no-go before the user shares the URL with another human.

## AUTONOMOUS — run the checklist

Tick each one. Anything that fails goes back to the relevant sub-skill.

### Functional

- [ ] The MVP slice works end-to-end on the production URL.
- [ ] Auth (if used) works on production, including sign-out.
- [ ] At least one happy-path and one error-path are tested by hand.

### Trust signals

- [ ] Page `<title>` and `<meta name="description">` are real, not the framework defaults.
- [ ] Favicon is set and isn't the framework default.
- [ ] Open Graph image and tags render correctly (test with https://www.opengraph.xyz/).
- [ ] No Lorem Ipsum, TODO, or "Welcome to Next.js" anywhere.

### Hygiene

- [ ] `.env.local` is gitignored and never committed.
- [ ] Production has its own secrets in Vercel env vars, not the dev ones.
- [ ] `npm audit --omit=dev` is clean (or known issues documented).
- [ ] Lighthouse mobile scores still ≥ 90 / 95 / 95 / 90.

### Resilience

- [ ] A 404 page exists and is on-brand.
- [ ] At least one server-side error path returns a useful message instead of a stack trace.
- [ ] Forms show inline errors, not browser default popups.

### Legal/social (only if relevant)

- [ ] If you collect emails: a one-line privacy note exists ("we use your email to log you in; we don't share it").
- [ ] If you take payment in v1: you're using Stripe Checkout, not rolling your own form.

## DIALOGUE — wrap up with the user

Tell the user, in this order:

1. **The URL.** Production link, repo link, and how to redeploy (`git push` triggers a Vercel deploy).
2. **What's done.** One paragraph summarizing what you built together.
3. **The next 3 things.** Suggest 3 concrete next steps, in the order you'd do them. Examples: "Buy a custom domain and connect it in Vercel" · "Add Vercel Analytics to see who's visiting" · "Ask 5 friends from the target audience to try it and write down what confused them."

## Exit criteria

- All checklist items are ticked or explicitly marked as not applicable.
- The user has the URL, the repo, and the next-steps list in their hands.

Move on to `17-deliverables.md`.
