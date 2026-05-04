export async function GET() {
  const body = `# Vibe MVP

> One-line product description goes here.

This is a Vibe MVP project. Replace this content with your product's overview.

## Surfaces
- [Home](/)
- [About](/about)
- [FAQ](/faq)
- [Terms](/terms)
- [Privacy](/privacy)
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
