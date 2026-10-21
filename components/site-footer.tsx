import Link from "next/link";
import { NAV, SITE } from "@/lib/content";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.prompt}>
          <h2 className={styles.promptHeading}>Want something made for you?</h2>
          <p className={styles.promptBody}>
            Commissions start with a conversation about material, size and how long it
            takes. Send the idea and the studio will tell you what it needs.
          </p>
          <Link href="/contact" className="cta">
            Start a commission
          </Link>
        </div>

        <div className={styles.details}>
          <nav aria-label="Sections">
            <ul className={styles.list}>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.link}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ul className={styles.list}>
            <li>
              <a href={`mailto:${SITE.email}`} className={styles.link}>
                {SITE.email}
              </a>
            </li>
            <li>
              <a
                href={`https://instagram.com/${SITE.instagram}`}
                className={styles.link}
                rel="me noreferrer"
                target="_blank"
              >
                Instagram
              </a>
            </li>
          </ul>

          <p className={styles.fine}>
            {SITE.name}, Nigeria. Objects made to order and in small runs.
          </p>
        </div>
      </div>
    </footer>
  );
}
