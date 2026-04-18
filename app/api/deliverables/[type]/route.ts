import { NextResponse } from 'next/server';
import { features } from '@/lib/features';

/**
 * Deliverable generator endpoint.
 *
 * Skeleton only. Sub-skill 15-deliverables walks the agent through:
 *   - installing pptxgenjs / docx / exceljs on demand
 *   - analyzing PROJECT.md + the live site
 *   - generating files into `deliverables/` at the project root
 *
 * This route exists so the pattern is in place. Flesh out per-type handlers
 * when the user opts in to specific deliverables.
 */

const SUPPORTED = new Set([
  'pitch-deck',
  'investor-one-pager',
  'marketing-one-pager',
  'financial-projections',
  'marketing-strategy',
  'research-paper',
  'ads',
  'launch',
]);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  if (!features.deliverables) {
    return NextResponse.json(
      { error: 'FEATURE_DELIVERABLES is disabled.' },
      { status: 404 },
    );
  }

  const { type } = await params;
  if (!SUPPORTED.has(type)) {
    return NextResponse.json(
      { error: `Unknown deliverable type: ${type}` },
      { status: 400 },
    );
  }

  return NextResponse.json({
    type,
    status: 'not_implemented',
    message:
      'Run sub-skill 15-deliverables to flesh out this generator. The skill tells the agent how to analyze the project, install the right output library (pptxgenjs / docx / exceljs), and produce the file into deliverables/.',
  });
}
