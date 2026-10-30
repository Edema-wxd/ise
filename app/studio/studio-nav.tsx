import Link from "next/link";
import styles from "./studio.module.css";

const SECTIONS = [
  { href: "/studio", label: "Inbox" },
  { href: "/studio/collections", label: "Collections" },
] as const;

/** Moves between the studio's own pages. Separate from the public nav, which
 *  visitors see and this is never part of. */
export function StudioNav({ current }: { current: (typeof SECTIONS)[number]["href"] }) {
  return (
    <nav aria-label="Studio" className={styles.studioNav}>
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className={styles.studioNavLink}
          aria-current={section.href === current ? "page" : undefined}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
