import Link from "next/link";
import { getCopy, getNav, getSite } from "@/lib/content";
import styles from "./site-footer.module.css";

export async function SiteFooter() {
  const [site, nav, copy] = await Promise.all([getSite(), getNav(), getCopy()]);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.prompt}>
          <h2 className={styles.promptHeading}>{copy.footer.promptHeading}</h2>
          <p className={styles.promptBody}>{copy.footer.promptBody}</p>
          <Link href="/contact" className="cta">
            Start a commission
          </Link>
        </div>

        <div className={styles.details}>
          <nav aria-label="Sections">
            <ul className={styles.list}>
              {nav.map((item) => (
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
              <a href={`mailto:${site.email}`} className={styles.link}>
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={`https://instagram.com/${site.instagram}`}
                className={styles.link}
                rel="me noreferrer"
                target="_blank"
              >
                Instagram
              </a>
            </li>
          </ul>

          <p className={styles.fine}>
            {site.name}, Nigeria. Objects made to order and in small runs.
          </p>
        </div>
      </div>
    </footer>
  );
}
