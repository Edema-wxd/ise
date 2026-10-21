import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { NAV } from "@/lib/content";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main>
      <PageIntro title="That page is not here">
        The link may be old, or the piece may have moved to another line. Start from
        one of these.
      </PageIntro>

      <section className="band">
        <div className="wrap">
          <ul className={styles.links}>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
