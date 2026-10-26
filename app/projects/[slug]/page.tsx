import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageSlot, toneAt } from "@/components/motif-field";
import { PageIntro } from "@/components/page-intro";
import { PROJECTS } from "@/lib/content";
import styles from "../projects.module.css";

function findProject(slug: string) {
  const index = PROJECTS.findIndex((project) => project.slug === slug);
  return index === -1 ? null : { project: PROJECTS[index], index };
}

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata(
  props: PageProps<"/projects/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const found = findProject(slug);

  if (!found) return {};

  return {
    title: found.project.title,
    description: found.project.summary,
  };
}

export default async function ProjectPage(props: PageProps<"/projects/[slug]">) {
  const { slug } = await props.params;
  const found = findProject(slug);

  if (!found) notFound();

  const { project, index } = found;

  return (
    <main>
      <PageIntro title={project.title}>{project.summary}</PageIntro>

      <section className="band bandPaper">
        <div className="wrap">
          <p className={`spec ${styles.caseMeta}`}>
            {project.year}. {project.role}.
          </p>

          <div className={styles.caseMedia}>
            <ImageSlot
              describes={`${project.title}, ISE Studio project`}
              src={project.image}
              tone={toneAt(index)}
              shape="wide"
              sizes="(min-width: 46rem) 46rem, 100vw"
            />
          </div>

          <div className={styles.case}>
            {project.sections.map((section) => (
              <section key={section.heading} className={styles.caseSection}>
                <h2 className={styles.caseHeading}>{section.heading}</h2>
                <p className={styles.caseBody}>{section.body}</p>
              </section>
            ))}
          </div>

          <div className={styles.next}>
            <Link href="/projects" className={styles.nextLink}>
              All projects
            </Link>
            <Link href="/contact" className="cta">
              Talk about a project
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
