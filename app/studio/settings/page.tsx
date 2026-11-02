import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { getSql } from "@/lib/db";
import { getSetting } from "@/lib/studio/entries";
import { getStudioAccess } from "@/lib/studio/session";
import { SETTINGS } from "@/lib/studio/settings";
import { SignOutButton } from "../sign-out";
import { StudioNav } from "../studio-nav";
import styles from "../studio.module.css";

export const metadata: Metadata = {
  title: "Settings — Studio",
  robots: { index: false, follow: false },
};

// Blocks on the session, like the inbox. See app/studio/page.tsx.
export const instant = false;

export default async function StudioSettingsPage() {
  const studio = await getStudioAccess();
  if (!studio.ok && studio.reason !== "not-allowed") redirect("/auth/sign-in");
  if (!studio.ok) redirect("/studio/collections");

  const sql = getSql()!;
  const specs = Object.values(SETTINGS);
  const states = await Promise.all(specs.map((spec) => getSetting(sql, spec)));

  return (
    <main>
      <PageIntro title="Settings">
        Signed in as {studio.email}. Site details, the menu and page copy. Edits are drafts
        until you publish them.
      </PageIntro>

      <section className="band bandPaper">
        <div className={`wrap ${styles.layout}`}>
          <StudioNav current="/studio/settings" />

          <ul className={styles.entries}>
            {specs.map((spec, i) => {
              const state = states[i];
              const [label, tone] = !state.exists
                ? ["Built-in text", "draft"]
                : state.hasChanges
                  ? ["Live, with unpublished edits", "changed"]
                  : ["Live", "live"];
              return (
                <li key={spec.key} className={styles.entry}>
                  <div className={styles.entryMain}>
                    <Link href={`/studio/settings/${spec.key}`} className={styles.entryName}>
                      {spec.title}
                    </Link>
                    <p className={styles.meta}>
                      <span className={`${styles.badge} ${styles[tone]}`}>{label}</span> {spec.description}
                    </p>
                  </div>
                  <div className={styles.entryActions}>
                    <Link href={`/studio/settings/${spec.key}`} className="ctaQuiet">
                      Edit
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
