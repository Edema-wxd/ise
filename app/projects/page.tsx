import type { Metadata } from "next";
import Link from "next/link";
import { ImageSlot, toneAt } from "@/components/motif-field";
import { PageIntro } from "@/components/page-intro";
import { PROJECTS } from "@/lib/content";
import styles from "./projects.module.css";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Design projects from ISE Studio, with the brief, the process and what came out of it.",
};

export default function ProjectsPage() {
  return (
    <main>
      <PageIntro title="Projects">
        Longer pieces of work, written up with the part that usually gets left out:
        what did not work first.
      </PageIntro>

      <section className="band bandPaper">
        <div className="wrap">
          <ul className={styles.list}>
            {PROJECTS.map((project, index) => (
              <li key={project.slug} className={styles.item}>
                <Link href={`/projects/${project.slug}`} className={styles.media}>
                  <ImageSlot
                    describes={`${project.title}, ISE Studio project`}
                    src={project.image}
                    tone={toneAt(index)}
                    shape="wide"
                    sizes="(min-width: 50rem) 55vw, 100vw"
                  />
                </Link>
                <div className={styles.copy}>
                  <h2 className={styles.title}>
                    <Link href={`/projects/${project.slug}`} className={styles.titleLink}>
                      {project.title}
                    </Link>
                  </h2>
                  <p className={`spec ${styles.meta}`}>
                    {project.year}. {project.role}.
                  </p>
                  <p className={styles.summary}>{project.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
