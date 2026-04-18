/**
 * Privacy Policy — placeholder.
 *
 * Sub-skill 07-compliance rewrites this to match exactly what the product
 * collects. Do not ship as-is.
 */

export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 prose prose-sm opacity-90">
      <h1>Privacy Policy</h1>
      <p className="opacity-60">
        Last updated: <strong>(replaced in sub-skill 07-compliance)</strong>
      </p>

      <p>
        This policy is a placeholder. Sub-skill <code>07-compliance</code>
        audits what your product actually collects and rewrites every section
        below to match &mdash; including GDPR and CCPA obligations.
      </p>

      <h2>1. What we collect</h2>
      <p>Placeholder.</p>

      <h2>2. Why we collect it</h2>
      <p>Placeholder (include legal basis per GDPR).</p>

      <h2>3. Who we share with</h2>
      <p>Placeholder (list each sub-processor).</p>

      <h2>4. Retention</h2>
      <p>Placeholder.</p>

      <h2>5. Your rights</h2>
      <p>Placeholder (access, delete, export, correct, object, opt-out).</p>

      <h2>6. Cookies</h2>
      <p>Placeholder.</p>

      <h2>7. International transfers</h2>
      <p>Placeholder.</p>

      <h2 id="ccpa-rights">8. CCPA rights</h2>
      <p>
        California residents have rights under the CCPA / CPRA, including the
        right to know, delete, correct, and opt out. To exercise these rights,
        email <code>privacy@your-domain.com</code>.
      </p>

      <h2>9. Contact</h2>
      <p>
        Placeholder: <code>privacy@your-domain.com</code>.
      </p>
    </div>
  );
}
