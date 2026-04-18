import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { features } from '@/lib/features';

/**
 * Landing page.
 *
 * Replace the copy with your product's value proposition. Keep text minimal
 * (sub-skill 02-design calls for ≥16px, verbs over phrases, one idea per block).
 */
export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20 sm:py-28">
      <div className="inline-flex items-center gap-2 text-sm opacity-70 mb-6">
        <Sparkles className="w-4 h-4" />
        <span>Replace me with your tagline.</span>
      </div>

      <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
        Ship the thing.
        <br />
        <span className="text-primary">Not the infrastructure.</span>
      </h1>

      <p className="mt-6 text-lg sm:text-xl opacity-80 max-w-2xl leading-relaxed">
        This is a starter scaffold. Your agent will replace this landing page with
        something tailored to your product during sub-skill{' '}
        <code className="px-1.5 py-0.5 rounded bg-base-200 font-mono text-sm">
          02-design
        </code>
        .
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href={features.auth ? '/login' : '#'}
          className={`btn btn-primary btn-lg gap-2 ${
            features.auth ? '' : 'btn-disabled'
          }`}
        >
          Get started <ArrowRight className="w-4 h-4" />
        </Link>
        <a
          href="https://github.com/your-repo"
          className="btn btn-ghost btn-lg"
          target="_blank"
          rel="noreferrer"
        >
          View source
        </a>
      </div>

      <div className="mt-16 grid sm:grid-cols-3 gap-4">
        <FeatureCard title="Auth" on={features.auth}>
          Magic link + OAuth via Auth.js + Resend.
        </FeatureCard>
        <FeatureCard title="AI" on={features.ai}>
          Typed OpenAI calls with gpt-5-nano + Zod.
        </FeatureCard>
        <FeatureCard title="Admin" on={features.admin}>
          Password-gated /admin with KPIs.
        </FeatureCard>
      </div>

      <p className="mt-12 text-sm opacity-60">
        Toggle features in{' '}
        <code className="px-1 py-0.5 rounded bg-base-200 font-mono">.env.local</code>.
        See the README for details.
      </p>
    </div>
  );
}

function FeatureCard({
  title,
  on,
  children,
}: {
  title: string;
  on: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card bg-base-200 border border-base-300">
      <div className="card-body p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-base">{title}</div>
          <div
            className={`badge badge-sm ${
              on ? 'badge-success' : 'badge-ghost'
            }`}
          >
            {on ? 'on' : 'off'}
          </div>
        </div>
        <p className="text-sm opacity-75 mt-1">{children}</p>
      </div>
    </div>
  );
}
