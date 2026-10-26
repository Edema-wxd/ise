"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Logo, NavItem } from "@/lib/content";
import styles from "./site-header.module.css";

/**
 * This is a client component for one reason: marking the current section with
 * `aria-current`, which needs the pathname. Everything else on the site is a
 * server component.
 *
 * The mark is the client's own file once a logo is set in the studio, and the
 * wordmark set in type until then. Per the brand guide the hand-drawn mark
 * must not be redrawn, so nothing here draws one.
 *
 * Nav, logo and name arrive as props: they are read from Postgres now, which
 * a client component cannot do.
 */
export function SiteHeader({
  siteName,
  nav,
  logo,
}: {
  siteName: string;
  nav: NavItem[];
  logo: Logo | null;
}) {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.mark} aria-label={`${siteName}, home`}>
          {logo ? (
            /* The delivered mark is black line art, which disappears on the
               eggplant header. Used as a mask it takes the paper token
               instead, so the file is shown as drawn and never edited or
               redrawn. The link's own label names it. */
            <span
              aria-hidden="true"
              className={styles.logo}
              style={{
                maskImage: `url("${logo.src}")`,
                aspectRatio: `${logo.width} / ${logo.height}`,
              }}
            />
          ) : (
            siteName
          )}
        </Link>

        <nav aria-label="Sections" className={styles.nav}>
          <ul className={styles.list}>
            {nav.map((item) => {
              const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={styles.link}
                    aria-current={current ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
