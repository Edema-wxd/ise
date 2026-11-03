import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { previewHref } from "@/lib/preview";
import { PageIntro } from "@/components/page-intro";
import { getSql } from "@/lib/db";
import { getSetting, listRevisions } from "@/lib/studio/entries";
import { getStudioAccess } from "@/lib/studio/session";
import { isSettingKey, SETTINGS } from "@/lib/studio/settings";
import { ConfirmButton } from "../../confirm-button";
import { StudioNav } from "../../studio-nav";
import styles from "../../studio.module.css";
import { loadSettingRevision, revertSetting } from "../actions";
import { SettingEditor } from "../editors";

export const metadata: Metadata = {
  title: "Edit settings — Studio",
  robots: { index: false, follow: false },
};

export const instant = false;

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

const ACTIONS: Record<string, string> = {
  save: "Draft saved",
  publish: "Published",
  revert: "Draft replaced",
};

export default async function EditSettingPage(props: PageProps<"/studio/settings/[key]">) {
  const studio = await getStudioAccess();
  if (!studio.ok) {
    if (studio.reason === "not-allowed") redirect("/studio/collections");
    redirect("/auth/sign-in");
  }

  const { key } = await props.params;
  if (!isSettingKey(key)) notFound();
  const spec = SETTINGS[key];

  const sql = getSql()!;
  const [state, revisions] = await Promise.all([getSetting(sql, spec), listRevisions(sql, `settings:${key}`)]);

  return (
    <main>
      <PageIntro title={spec.title}>
        {!state.exists
          ? "Not saved in the studio yet. The site shows its built-in text, which is what you see below; publishing makes this the live version."
          : !state.isPublished
            ? "Saved as a draft. The site still shows its built-in text until you publish."
            : state.hasChanges
              ? "Live, with edits that are not published yet."
              : "Live. The site shows exactly this version."}
      </PageIntro>

      <section className="band bandPaper">
        <div className={`wrap ${styles.editorLayout}`}>
          <div className={styles.editorMain}>
            <StudioNav current="/studio/settings" />
            <p className={styles.meta}>
              <Link href="/studio/settings">← All settings</Link>
            </p>
            <SettingEditor
              settingKey={key}
              initial={state.draft}
              updatedAt={state.updatedAt}
              isPublished={state.isPublished}
            />
          </div>

          <aside className={styles.editorSide} aria-label="Publishing and history">
            <h2 className={styles.subheading}>On the site</h2>
            <p className={styles.meta}>
              <Link href="/" target="_blank" rel="noopener">
                View the live site ↗
              </Link>
            </p>
            <p className={styles.meta}>
              <a href={previewHref("/")} target="_blank" rel="noopener">
                Preview the saved draft ↗
              </a>
              <br />
              Shows this and every other unpublished edit, as the site would. Save first.
            </p>
            {state.isPublished && state.hasChanges ? (
              <form action={revertSetting}>
                <input type="hidden" name="key" value={key} />
                <ConfirmButton
                  className={styles.textButton}
                  confirm="Throw away every edit since the last publish? The draft goes back to what the site shows."
                >
                  Discard unpublished edits
                </ConfirmButton>
              </form>
            ) : null}

            <h2 className={styles.subheading}>History</h2>
            {revisions.length === 0 ? (
              <p className={styles.meta}>No changes recorded yet.</p>
            ) : (
              <ol className={styles.history}>
                {revisions.map((revision) => (
                  <li key={revision.id} className={styles.historyItem}>
                    <p>
                      {ACTIONS[revision.action] ?? revision.action}
                      <span className={styles.meta}>
                        {" "}
                        · <time dateTime={revision.createdAt}>{when.format(new Date(revision.createdAt))}</time>
                        {revision.actor ? ` · ${revision.actor}` : ""}
                      </span>
                    </p>
                    {revision.hasPayload && state.exists ? (
                      <form action={loadSettingRevision}>
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="revision" value={revision.id} />
                        <ConfirmButton
                          className={styles.textButton}
                          confirm="Replace the current draft with this version? The live site is unchanged until you publish."
                        >
                          Load into draft
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
