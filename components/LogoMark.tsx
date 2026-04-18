/**
 * LogoMark — the same SVG used for the favicon (app/icon.svg).
 *
 * Inline as a React component so color inherits from `currentColor`
 * and the mark themes correctly in header/footer.
 *
 * In sub-skill 02-design the agent replaces this with a project-specific mark.
 */
export function LogoMark({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-primary ${className}`}
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle cx="32" cy="32" r="6" fill="currentColor" />
    </svg>
  );
}
