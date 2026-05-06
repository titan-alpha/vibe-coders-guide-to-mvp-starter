# 03 · Regulatory Compliance

Goal: identify the **minimum** compliance surface the product needs at beta, and implement exactly that. No more. Compliance is a floor, not a finish line &mdash; over-building it at MVP stage kills momentum.

This sub-skill runs **before auth** because the upcoming signup form's TOS / Privacy checkbox needs the documents to exist and to be linkable, and the consent record stores which version each user accepted.

## DIALOGUE — does the product want a compliance pass?

For any project with auth (open signup, waitlist, or paid beta &mdash; the access model picked in sub-skill 01), this is **required**, not optional. For a strictly read-only static site with no signup, no analytics, and no cookies, you can skip; tell the user that and confirm before doing so.

> *"I'll do a quick compliance pass now &mdash; before we wire up signup &mdash; so the Terms of Service and Privacy Policy are ready when the signup form needs to link to them. I'll look at what your product collects, who uses it, and where they live, then tell you which regulations apply, and we'll build exactly the minimum. Sound good?"*

If the user has a strong reason to defer (e.g., they want to wireframe auth first to demo to a stakeholder), note it in `# Open questions` in `PROJECT.md` and tag sub-skill 04 as needing a compliance follow-up before public launch. Do not let auth ship without TOS/Privacy in any project that takes user signups.

## AUTONOMOUS — analyze the platform

Before proposing anything, read what the product actually does. Build a compliance profile.

### 1. Identify the vertical and the framework that follows from it

Read `PROJECT.md` `# Idea` and `# Audience`. Classify the platform along TWO axes: **B2C vs B2B**, and **"general" vs "regulated industry."**

Match the classification against this framework table:

| Classification | Frameworks the agent surfaces to the user |
| --- | --- |
| **B2C general** | GDPR (any EU user), CCPA/CPRA (any CA user), COPPA (any user under 13), state-level US privacy laws (VCDPA, CPA, UCPA, CTDPA &mdash; converging on GDPR-lite). |
| **B2C regulated** | The B2C general set, **plus**: HIPAA (PHI / health data), FERPA (student records via an educational institution), GLBA (consumer financial data), state-licensed-practice laws (telehealth, insurance, legal, medical advice). |
| **B2B (small business)** | GDPR / CCPA still apply if the buyer's end users live there. Light SOC 2 awareness &mdash; most small-biz buyers won't ask, but it's a leading indicator of moving up-market. |
| **B2B Enterprise** | **SOC 2 Type II** (de-facto trust currency for selling into mid-market+ &mdash; required for most procurement). **ISO 27001** (international equivalent, common in EU + regulated buyers). HIPAA BAAs if any customer data could be PHI. PCI-DSS if payments flow through. Often a Vendor Security Questionnaire (VSQ) on first contract. |
| **Any project taking payment** | PCI-DSS. Stripe Checkout drops you to SAQ A (easiest); rolling your own form makes you SAQ D. |
| **AI features** | Sub-processor disclosure (OpenAI / Anthropic / etc. in the privacy policy + DPA). EU AI Act if you're in scope (high-risk uses: hiring, credit, education, biometrics, critical infra). Most MVPs are out of scope, but verify. |

Then write a one-paragraph summary to the user using this script:

> *"Based on what you described, this product is `<classification>`. The frameworks that likely apply: `<list>`. Here's what each means in plain English:*
> - `<framework 1>`: *one-sentence summary + concrete consequence (e.g., "GDPR &mdash; you need a Privacy Policy with EU data subject rights and a contact path; max fine is 4% of global revenue, but realistically you'd get a takedown notice first").*
> - `<framework 2>`: *...*
>
> *We don't have to implement all of these at MVP. But some choices we make in the next few skills (data storage, auth, sub-processors) are cheaper if we plan for them now. Want me to walk you through which ones to plan for?"*

For the regulated-industry classification specifically, **explicitly raise the framework even if the user didn't mention it**. Example phrasing:

> *"Your audience description mentions 'patient' and 'symptom log' &mdash; this is HIPAA territory. We need to talk about that before we go further: HIPAA significantly raises the bar (BAAs with every sub-processor, encryption at rest with audit logs, breach notification within 60 days, and a covered-entity vs business-associate determination). At MVP this is a real cost &mdash; sometimes founders pivot the value prop slightly to stay out of HIPAA scope (e.g., 'wellness tracking' is not regulated; 'medical record' is). Want to keep the original framing or scope down?"*

### 2. What does the product collect?

Walk the codebase and list every piece of user-identifiable or sensitive data:

- **Account data**: email, name, phone, profile fields.
- **Behavior**: analytics events, page views, clicks, time on page.
- **Content**: anything users type, upload, or generate.
- **AI inputs/outputs** (sub-skill 04): is user content sent to OpenAI? Logged? Retained?
- **Payment**: any Stripe / billing fields? If yes, PCI-DSS applies &mdash; but Stripe Checkout handles 95% of that.
- **Health / education / child data**: triggers HIPAA / FERPA / COPPA respectively.
- **Cookies**: session cookies, third-party analytics, tracking pixels.

Write the list to a scratch note. This is the input to step 4.

### 3. Who uses it and where do they live?

Re-read `PROJECT.md` audience. Check the landing copy. Infer the likely geographic scope:

- **EU / UK users** &rarr; **GDPR / UK GDPR** applies. Even a handful. Don't assume "I'm not targeting Europe" gets you out of it.
- **California users** (US consumer site) &rarr; **CCPA / CPRA** applies above certain thresholds (typically $25M revenue / 100K consumers / 50% revenue from data sale). Most MVPs are below the threshold, but best-practice is to comply anyway because it's low effort.
- **Children < 13** &rarr; **COPPA** (US). Don't target this audience at MVP unless you really mean it.
- **Healthcare data (PHI)** &rarr; **HIPAA** (US). Only if the product actually handles protected health information. Wellness apps often aren't HIPAA-regulated, but check.
- **Education data about students** &rarr; **FERPA** (US, if tied to an educational institution).
- **Canada** &rarr; **PIPEDA**. **Brazil** &rarr; **LGPD**. Both closely mirror GDPR patterns.

### 4. Research the specific obligations

For each regulation that applies, list the concrete obligations at the MVP stage. Don't recite the whole law &mdash; list only what needs to ship.

Typical minimum surface:

| Regulation | MVP obligations |
| --- | --- |
| **GDPR / UK GDPR** | Privacy Policy with legal basis for each processing purpose; explicit opt-in consent for analytics/marketing cookies; data subject rights (access, delete, export) with a contact path; data processing agreements with sub-processors (OpenAI, Resend, Vercel) &mdash; all offer DPAs; 72-hour breach notification plan. |
| **CCPA / CPRA** | Privacy Policy with "Right to Know / Delete / Correct / Opt-Out" sections; a "Do Not Sell or Share My Personal Information" link in the footer (even if you don't sell data &mdash; saying "we don't" is itself the notice). |
| **COPPA** | Don't collect from under-13 without verifiable parental consent. Easiest MVP path: **don't allow under-13 signups**. Add an age check on signup. |
| **HIPAA** | BAA with every sub-processor that touches PHI (OpenAI has one behind Enterprise; Resend does not by default). Encryption at rest + in transit. Audit log of PHI access. This is rarely "minimum" &mdash; if HIPAA applies, it's a serious build. |
| **FERPA** | Contractual terms with the educational institution; limit student PII disclosure. Usually project-specific. |
| **PCI-DSS** | Use Stripe Checkout (or equivalent). Never let card data touch your server. If Checkout is used, you're on **SAQ A** (easiest level). |
| **GLBA** | Privacy notice describing what financial data you collect + how it's shared. Safeguards Rule: written info-security plan, MFA on admin access, encryption of consumer data in transit + at rest. If you're not a "financial institution" by FTC definition, doesn't apply &mdash; the agent confirms. |
| **SOC 2 Type II** | Not implementable at MVP. The agent's job here is **awareness**: the choices you make now (single-sign-on for admin, audit logs from day one, change-management discipline, encryption, access reviews) are all cheaper to do early than retrofit. Tag in `STATE.yaml # Decisions`: "SOC 2 awareness: agent shipped X / Y / Z foundational practices to keep the option open." |
| **ISO 27001** | Same posture as SOC 2 &mdash; awareness now, certification later. Documenting the Information Security Management System (ISMS) is the long pole; small things to do now: maintain an asset inventory, document the risk-assessment approach in `PROJECT.md`. |
| **State US privacy laws (VCDPA / CPA / UCPA / CTDPA)** | The Privacy Policy text written to cover GDPR + CCPA covers ~90% of these. Differences are mostly procedural (specific opt-out language, slightly different rights enumeration). One Privacy Policy, well-tailored, covers all of them. |
| **EU AI Act** | If your AI features fall into "high risk" categories (hiring, credit scoring, education enrollment, biometrics, law enforcement) you need a conformity assessment. **Most MVPs are out of scope.** The agent confirms by checking the AI feature list against Annex III; if in scope, this is a serious build and the agent flags it as "post-MVP, before any high-risk launch." |
| **PCI-DSS (any path)** | Stripe Checkout = SAQ A (12 controls, all on Stripe's side; you self-attest). Stripe Elements (you collect card data, Stripe tokenizes) = SAQ A-EP (~30 controls, mostly on you). Custom card form = SAQ D (~280 controls, full audit). **Always pick Checkout for MVP.** |

### 5. Identify the gap

For each obligation, check what's already in place. Most MVPs are missing:
- Privacy Policy and Terms of Service (no one has written them yet)
- Signup-flow consent checkboxes
- Cookie banner (only if using non-essential cookies)
- Data export / delete endpoints
- A `privacy@<domain>` email address

## DIALOGUE — propose and confirm

Come back with a concrete, short proposal:

> *"Based on your platform and audience, here's what I'd add for beta:*
> 1. *Privacy Policy and Terms of Service pages, written to cover GDPR + CCPA obligations.*
> 2. *Signup-flow checkboxes: 'I agree to the Terms' and 'I agree to the Privacy Policy' (required); 'I'd like product updates' (optional).*
> 3. *A 'Do Not Sell or Share' link in the footer (required by CCPA even if we don't sell data).*
> 4. *A data export and delete endpoint at `/account/data` for authenticated users.*
> 5. *A `privacy@<domain>` email alias in your mail setup.*
>
> *Your platform doesn't need HIPAA, FERPA, or COPPA surface based on what it collects. Sound right?"*

Adjust based on the user's answer. If they're convinced a regulation doesn't apply, ask them to confirm in writing (so it's in the chat log).

## DIALOGUE — geographic compliance: comply or block

GDPR and CCPA compliance is "free" for most MVPs &mdash; the policy text plus the consent checkboxes from sub-skill 04 cover most of it. But for some founders, even that minimal effort isn't worth it for a beta. They'd rather not have EU/CA users at all than carry the compliance load. Offer the user the explicit choice:

> *"Two paths for handling EU + California users:*
>
> *(a) **Comply** &mdash; Privacy Policy written to GDPR + CCPA standard, signup-flow consent checkboxes, data export/delete endpoints, sub-processor DPAs. About 30 minutes of work for me, then it's done. Recommended for any project that wants international reach.*
>
> *(b) **Block by IP** &mdash; Add an edge middleware that returns a 451 ('Unavailable for Legal Reasons') page to requests from EU + California IPs, with a polite explanation. You don't have GDPR/CCPA obligations because you don't serve those markets. Lower compliance burden but you're permanently locked out of those users.*
>
> *Most MVPs pick (a). Founders pick (b) when the audience is clearly US-only (e.g., a tool for US accountants, a marketplace for US-based services), the data is sensitive enough that compliance feels risky, or the team can't take on the operational burden. Which fits?"*

If the user picks (b), drop in this Vercel Edge Middleware that checks `x-vercel-ip-country` against an allowlist:

```ts
// middleware.ts (Next.js Edge Middleware)
import { NextResponse, type NextRequest } from 'next/server';

const BLOCKED_COUNTRIES = new Set(['GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'FI', 'PT', 'AT', 'PL', 'CZ', 'GR', 'HU', 'RO', 'BG', 'HR', 'CY', 'EE', 'LV', 'LT', 'LU', 'MT', 'SI', 'SK']);
const BLOCKED_REGIONS_US = new Set(['CA']);

export function middleware(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') ?? '';
  const region = req.headers.get('x-vercel-ip-country-region') ?? '';
  if (BLOCKED_COUNTRIES.has(country) || (country === 'US' && BLOCKED_REGIONS_US.has(region))) {
    return new NextResponse(
      `<!doctype html><meta charset=utf-8><title>Unavailable</title><style>body{font:16px system-ui;max-width:36rem;margin:5rem auto;padding:0 1.5rem;line-height:1.6}</style><h1>Sorry — we're not available in your region</h1><p>We're a small team building an early product. To stay focused, we currently serve only customers outside the EU and California. We'll let you know if that changes.</p>`,
      { status: 451, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon|api/health).*)'] };
```

Tell the user out loud:

> *"This isn't a perfect solution &mdash; VPN users get through, and you might block legitimate US travelers in the EU. But it's a reasonable first line for an MVP that just doesn't want the compliance burden. You can flip this off any time by deleting the middleware."*

## DIALOGUE — gather the inputs the user owns

Before drafting anything, **ask the user for the values the agent must not invent**. Use plain language:

> *"Two quick things I need from you before I draft these:*
> 1. *What's the canonical URL for the site? (e.g., `https://your-domain.com`. If we haven't deployed yet and there's no domain decision, give me a placeholder you'll edit later.)*
> 2. *What email address should privacy and legal contacts go to? Common options:*
>    - *A new alias like `privacy@your-domain.com` &mdash; cleaner long term, but you'll need to set it up at your domain provider.*
>    - *Your existing personal/work email like `you@gmail.com` &mdash; lowest friction, fine for MVP.*
>    *Either works. Which is easier for you to monitor?"*

Capture both answers verbatim. Use them in every place the documents reference a URL or contact email. **Never assume `privacy@<domain>` &mdash; many founders prefer a personal address at MVP stage and dislike when an agent invents an alias they then have to set up just because the agent didn't ask.**

If the user later wants to switch to a domain alias, that's a one-line edit they can make themselves.

## AUTONOMOUS — build the minimum surface

### 1. Terms of Service and Privacy Policy

Write these yourself as Markdown or MDX pages. Don't use a generic template &mdash; tailor every paragraph to the platform you just analyzed. Concrete is safer than generic.

Structure each document with headings that map to the obligations:

**`app/(legal)/terms/page.mdx`** — required sections:
- Who we are, who can use the service, acceptable use
- Account responsibility, termination
- IP and user content (what license the user grants you)
- Disclaimers and limitation of liability
- Governing law, arbitration if applicable
- How changes are notified

**`app/(legal)/privacy/page.mdx`** — required sections:
- What data you collect (map 1:1 to step 1 above)
- Why you collect it (legal basis for GDPR: consent, contract, legitimate interest)
- Who you share it with (list sub-processors by name: OpenAI, Resend, Vercel, Stripe if used)
- Retention periods for each category
- User rights (access, delete, export, correct, object, opt-out)
- How to exercise those rights (use the email the user provided in the DIALOGUE step above &mdash; do not invent `privacy@<domain>`)
- Cookies (list each; separate strictly-necessary from analytics/marketing)
- International transfers (mention Standard Contractual Clauses if data leaves the EU)
- Contact info, "last updated" date

Date-stamp the bottom of each page. Keep a `# Changelog` section.

**Disclaimer to the user:** these are drafted for beta and are not a substitute for a lawyer. Tell the user this out loud. Suggest a ~$500 legal review (e.g., TermsFeed / Iubenda templates reviewed by a real attorney, or a Clerky/LegalZoom lawyer for a fixed fee) before the product gets past beta or takes money.

### 2. Signup-flow consent checkboxes (spec for sub-skill 04)

The signup form doesn't exist yet &mdash; sub-skill 04 will build it. Drop the markup snippet below into `PROJECT.md` under `# Compliance` so sub-skill 04 picks it up verbatim:

```tsx
<label className="label cursor-pointer justify-start gap-2">
  <input type="checkbox" name="accept_terms" required className="checkbox checkbox-sm" />
  <span className="label-text">
    I agree to the <a href="/terms" className="link">Terms of Service</a> and
    <a href="/privacy" className="link"> Privacy Policy</a>.
  </span>
</label>

<label className="label cursor-pointer justify-start gap-2">
  <input type="checkbox" name="accept_marketing" className="checkbox checkbox-sm" />
  <span className="label-text">
    I&rsquo;d like occasional product updates by email. (Optional, unsubscribe any time.)
  </span>
</label>
```

Required: the TOS/PP checkbox &mdash; form submission blocked without it. Optional: marketing &mdash; separate, unticked by default (GDPR requires unticked default for marketing consent).

On server side, store the consent with a timestamp and IP address in a `user_consents` table:
```sql
user_id, consent_type, version, accepted_at, ip_address
```
`version` references the `last_updated` date of the document at the time of signup. This matters when you change the policy later &mdash; you need to know which version each user accepted.

### 3. Footer links

Add to the site footer:
- "Terms"
- "Privacy"
- "Do Not Sell or Share My Personal Information" (links to `/privacy#ccpa-rights`)

### 4. Data export and delete endpoints

For authenticated users at `/account/data`:
- **Export**: dump their rows from every relevant table as JSON, stream as a download.
- **Delete**: soft-delete on the account record, hard-delete PII within 30 days (cron or on-demand cleanup). Cascade to associated rows per your schema.

These two endpoints cover "Right to Access" and "Right to Erasure" under GDPR and the equivalent CCPA rights.

### 5. Privacy contact

Use the email address the user provided in the DIALOGUE step above. **Do not assume the user wants a `privacy@<domain>` alias** &mdash; many MVPs use the founder's existing inbox.

If the user picked an alias (`privacy@<their-domain>`) and the domain is at GoDaddy/Namecheap/Cloudflare/etc., walk them through setting up email forwarding from that alias to their real inbox (most registrars include free forwarding). If they picked an existing email (e.g., `you@gmail.com`), nothing further to do.

### 6. Sub-processor DPAs

Inside Resend, OpenAI, Vercel, Stripe, etc., request or sign the Data Processing Agreement. Most offer it in their dashboard settings. Keep a short list in `PROJECT.md`:
```
# Sub-processors
- OpenAI (DPA signed 2026-04-17)
- Resend (DPA signed 2026-04-17)
- Vercel (DPA signed 2026-04-17)
```

### 7. Cookie banner (only if needed)

If you added non-essential cookies (analytics, marketing pixels), show a cookie banner on first visit. If you only use strictly-necessary session cookies, you don't need a banner under GDPR. **Prefer "no non-essential cookies at MVP"** &mdash; simpler legally and faster to load.

## Anti-patterns to avoid

- **Generic template policies.** Easy to spot, embarrassing, and can be legally misleading because they'll claim you do things you don't. Always tailor to your platform.
- **Pre-ticked consent boxes.** Void under GDPR. Every optional consent must be unticked by default.
- **Bundling consents.** Don't put Terms, Privacy, and Marketing in one checkbox. Separate them.
- **"Legitimate interest" as the default basis for everything.** Use it carefully for GDPR. Consent-based processing is easier to defend for analytics/marketing.
- **Copying HIPAA without actually handling PHI.** If you're not in healthcare, don't claim HIPAA compliance &mdash; it sets a bar you don't meet and invites scrutiny.
- **Inventing the canonical URL or contact email.** Always ask the user for these in the DIALOGUE step above. Never assume `privacy@<domain>` &mdash; many founders prefer their existing inbox at MVP stage.

## Exit criteria

- `/terms` and `/privacy` pages exist, tailored to the product, date-stamped.
- Signup requires TOS + Privacy checkbox; marketing checkbox is separate and unticked.
- `user_consents` table captures each acceptance with version + timestamp.
- Footer has Terms, Privacy, and "Do Not Sell or Share" links.
- `/account/data` supports export and delete for authenticated users.
- The privacy contact email the user provided is reachable and monitored.
- A `# Compliance` section in `PROJECT.md` lists the regulations covered, the sub-processors with signed DPAs, and a note recommending a legal review before general availability.
- The vertical classification is recorded in `STATE.yaml # Decisions` along with the frameworks the agent surfaced.
- For projects in regulated verticals (HIPAA / FERPA / GLBA), the user has explicitly acknowledged the framework and chosen one of: implement now / pivot scope / defer with risk noted.
- Geographic compliance choice is recorded: (a) comply or (b) block. If (b), the IP-block middleware is committed.

Move on to `04-auth.md`.
