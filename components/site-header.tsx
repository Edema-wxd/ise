"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LOGO, NAV, SITE, type NavItem } from "@/lib/content";
import styles from "./site-header.module.css";

/**
 * This is a client component for two reasons: marking the current section with
 * `aria-current`, which needs the pathname, and opening the Collections menu.
 * Everything else on the site is a server component.
 *
 * The mark is the client's own file once `LOGO` is set in lib/content.ts,
 * and the wordmark set in type until then. Per the brand guide the hand-drawn
 * mark must not be redrawn, so nothing here draws one.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.mark} aria-label={`${SITE.name}, home`}>
          {LOGO ? (
            /* The delivered mark is black line art, which disappears on the
               eggplant header. Used as a mask it takes the paper token
               instead, so the file is shown as drawn and never edited or
               redrawn. The link's own label names it. */
            <span
              aria-hidden="true"
              className={styles.logo}
              style={{
                maskImage: `url("${LOGO.src}")`,
                aspectRatio: `${LOGO.width} / ${LOGO.height}`,
              }}
            />
          ) : (
            SITE.name
          )}
        </Link>

        <nav aria-label="Sections" className={styles.nav}>
          <ul className={styles.list}>
            {NAV.map((item) => {
              const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
              if (item.children) {
                return <NavMenu key={item.href} item={item} pathname={pathname} current={current} />;
              }
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

/**
 * A nav entry with sub items, as a disclosure: a button that shows and hides a
 * list of links. Not an ARIA `menu` — these are ordinary links, and Tab moves
 * through them like the rest of the nav.
 *
 * It opens on click or tap rather than hover, so it behaves the same on a
 * phone, and closes on Escape, on a click outside, when focus leaves it, and
 * on navigation.
 */
function NavMenu({
  item,
  pathname,
  current,
}: {
  item: NavItem;
  pathname: string;
  current: boolean;
}) {
  // Open for the page it was opened on: navigating changes the pathname, which
  // closes it without an effect to reset it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const root = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpenOn(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      button.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <li
      ref={root}
      className={styles.menu}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpenOn(null);
      }}
    >
      <button
        ref={button}
        type="button"
        className={[styles.link, styles.menuButton, current ? styles.current : ""]
          .filter(Boolean)
          .join(" ")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        {item.label}
        <span aria-hidden="true" className={styles.chevron} />
      </button>
      <ul id={panelId} className={styles.panel} hidden={!open}>
        {item.children?.map((child) => (
          <li key={child.href}>
            <Link
              href={child.href}
              className={styles.panelLink}
              aria-current={pathname === child.href ? "page" : undefined}
            >
              {child.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}
