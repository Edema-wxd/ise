import Link from "next/link";
import { ImageSlot, MotifField } from "@/components/motif-field";
import { COLLECTIONS, EVENTS, PROJECTS, eventMeta } from "@/lib/content";
import styles from "./page.module.css";

export default function HomePage() {
  const featured = PROJECTS.slice(0, 3);

  return (
    <main>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>Brass, hardwood and cotton, worked in Nigeria.</h1>
          <p className={`lead ${styles.heroLead}`}>
            ISE Studio is an industrial design practice making jewellery, accessories,
            apparel and objects for the room. Everything starts as a drawing and ends
            on a bench.
          </p>
          <div className={styles.heroActions}>
            <Link href="/collections" className="cta">
              See the collections
            </Link>
            <Link href="/projects" className="ctaQuiet">
              Read the projects
            </Link>
          </div>
        </div>

        <MotifField scale="field" tone="coral" className={styles.heroField} />
      </section>

      <section className="band bandPaper">
        <div className="wrap">
          <h2>What the studio makes</h2>
          <ul className={styles.collections}>
            {COLLECTIONS.map((collection) => (
              <li key={collection.slug} className={styles.collection}>
                <Link href={`/collections/${collection.slug}`} className={styles.collectionLink}>
                  <ImageSlot
                    describes={`${collection.name} from ISE Studio`}
                    src={collection.image}
                    tone={collection.tone}
                    shape="wide"
                    sizes="(min-width: 64rem) 25vw, (min-width: 42rem) 50vw, 100vw"
                  />
                  <h3 className={styles.collectionName}>{collection.name}</h3>
                  <p className={styles.collectionSummary}>{collection.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band bandPeach">
        <div className="wrap">
          <h2>Projects, and how they got made</h2>
          <ul className={styles.projects}>
            {featured.map((project) => (
              <li key={project.slug} className={styles.project}>
                <h3>
                  <Link href={`/projects/${project.slug}`} className={styles.projectLink}>
                    {project.title}
                  </Link>
                </h3>
                <p className={`spec ${styles.projectSpec}`}>
                  {project.year}. {project.role}.
                </p>
                <p className={styles.projectSummary}>{project.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Where to see the work</h2>
          <ul className={styles.events}>
            {EVENTS.map((event) => (
              <li key={event.title} className={styles.event}>
                <h3>{event.title}</h3>
                <p className={`spec ${styles.eventSpec}`}>{eventMeta(event)}</p>
              </li>
            ))}
          </ul>
          <Link href="/events" className="ctaQuiet">
            All exhibitions and pop-ups
          </Link>
        </div>
      </section>
    </main>
  );
}
