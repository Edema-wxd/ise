import type { Metadata } from "next";
import Link from "next/link";
import { ImageSlot, toneAt } from "@/components/motif-field";
import { PageIntro } from "@/components/page-intro";
import { getCopy, getEvents, eventMeta } from "@/lib/content";
import styles from "./events.module.css";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Exhibitions and pop-up shops where ISE Studio has shown and sold work.",
};

export default async function EventsPage() {
  const [events, copy] = await Promise.all([getEvents(), getCopy()]);

  return (
    <main>
      <PageIntro title={copy.events.title}>{copy.events.intro}</PageIntro>

      <section className="band bandPaper">
        <div className="wrap">
          <ul className={styles.list}>
            {events.map((event, index) => (
              <li key={event.title} className={styles.item}>
                <ImageSlot
                  describes={`${event.title}, installation`}
                  src={event.image}
                  tone={toneAt(index)}
                  shape="wide"
                  sizes="(min-width: 50rem) 50vw, 100vw"
                />
                <div className={styles.copy}>
                  <h2 className={styles.title}>{event.title}</h2>
                  <p className={`spec ${styles.meta}`}>{eventMeta(event)}</p>
                  <p className={styles.note}>{event.note}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.next}>
            <h2>Showing something, or want the studio to?</h2>
            <p className={styles.nextBody}>
              The studio takes on pop-ups, group shows and stockists. Tell it what you
              are planning.
            </p>
            <Link href="/contact" className="cta">
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
