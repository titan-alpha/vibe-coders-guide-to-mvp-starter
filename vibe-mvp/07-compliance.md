# 07 · Regulatory Compliance

Goal: identify the **minimum** compliance surface the product needs at beta, and implement exactly that. No more. Compliance is a floor, not a finish line &mdash; over-building it at MVP stage kills momentum.

## DIALOGUE — does the product want a compliance pass?

This skill is optional, but nearly every product with user accounts, AI, or analytics needs *some* coverage before beta. Ask:

> *"Want me to do a quick compliance pass? I'll look at what your product collects, who uses it, and where they live &mdash; then tell you which regulations apply, and we'll build exactly the minimum that covers you. For a signup flow that means a Terms of Service, Privacy Policy, and agreement checkboxes. No more than that."*

If the user declines, skip and move on to `08-accessibility.md`. (But note it in `# Open questions` in `PROJECT.md` &mdash; they'll want to revisit before any marketing push.)

## AUTONOMOUS — analyze the platform

Before proposing anything, read what the product actually does. Build a compliance profile.

### 1. What does the product collect?

Walk the codebase and list every piece of user-identifiable or sensitive data:

- **Account data**: email, name, phone, profile fields.
- **Behavior**: analytics events, page views, clicks, time on page.
- **Content**: anything users type, upload, or generate.
- **AI inputs/outputs** (sub-skill 04): is user content sent to OpenAI? Logged? Retained?
- **Payment**: any Stripe / billing fields? If yes, PCI-DSS applies &mdash; but Stripe Checkout handles 95% of that.
- **Health / education / child data**: triggers HIPAA / FERPA / COPPA respectively.
- **Cookies**: session cookies, third-party analytics, tracking pixels.

Write the list to a scratch note. This is the input to step 3.

### 2. Who uses it and where do they live?

Re-read `PROJECT.md` audience. Check the landing copy. Infer the likely geographic scope:

- **EU / UK users** &rarr; **GDPR / UK GDPR** applies. Even a handful. Don't assume "I'm not targeting Europe" gets you out of it.
- **California users** (US consumer site) &rarr; **CCPA / CPRA** applies above certain thresholds (typically $25M revenue / 100K consumers / 50% revenue from data sale). Most MVPs are below the threshold, but best-practice is to comply anyway because it's low effort.
- **Children < 13** &rarr; **COPPA** (US). Don't target this audience at MVP unless you really mean it.
- **Healthcare data (PHI)** &rarr; **HIPAA** (US). Only if the product actually handles protected health information. Wellness apps often aren't HIPAA-regulated, but check.
- **Education data about students** &rarr; **FERPA** (US, if tied to an educational institution).
- **Canada** &rarr; **PIPEDA**. **Brazil** &rarr; **LGPD**. Both closely mirror GDPR patterns.

### 3. Research the specific obligations

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

### 4. Identify the gap

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
- How to exercise those rights (email `privacy@<domain>`)
- Cookies (list each; separate strictly-necessary from analytics/marketing)
- International transfers (mention Standard Contractual Clauses if data leaves the EU)
- Contact info, "last updated" date

Date-stamp the bottom of each page. Keep a `# Changelog` section.

**Disclaimer to the user:** these are drafted for beta and are not a substitute for a lawyer. Tell the user this out loud. Suggest a ~$500 legal review (e.g., TermsFeed / Iubenda templates reviewed by a real attorney, or a Clerky/LegalZoom lawyer for a fixed fee) before the product gets past beta or takes money.

### 2. Signup-flow consent checkboxes

Modify the signup form built in sub-skill 03. Add:

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

Set up `privacy@<domain>` as a forwarding alias to the founder's inbox. For MVP, a single inbox is fine.

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

## Exit criteria

- `/terms` and `/privacy` pages exist, tailored to the product, date-stamped.
- Signup requires TOS + Privacy checkbox; marketing checkbox is separate and unticked.
- `user_consents` table captures each acceptance with version + timestamp.
- Footer has Terms, Privacy, and "Do Not Sell or Share" links.
- `/account/data` supports export and delete for authenticated users.
- `privacy@<domain>` inbox exists and is monitored.
- A `# Compliance` section in `PROJECT.md` lists the regulations covered, the sub-processors with signed DPAs, and a note recommending a legal review before general availability.

Move on to `08-accessibility.md`.
