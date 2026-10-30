import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { getSql } from "@/lib/db";
import { getCollectionEntry, listRevisions } from "@/lib/studio/collections";
import { getStudioAccess } from "@/lib/studio/session";
import { ConfirmButton } from "../../confirm-button";
import { StudioNav } from "../../studio-nav";
import styles from "../../studio.module.css";
import {
  deleteCollection,
  loadRevision,
  restoreCollection,
  revertCollection,
  unpublishCollection,
} from "../actions";
import { CollectionEditor } from "./editor";

export const metadata: Metadata = {
  title: "Edit collection — Studio",
  robots: { index: false, follow: false },
};

export const instant = false;

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

const ACTIONS: Record<string, string> = {
  save: "Draft saved",
  publish: "Published",
  unpublish: "Unpublished",
  revert: "Draft replaced",
  delete: "Deleted",
  restore: "Restored",
};

export default async function EditCollectionPage(props: PageProps<"/studio/collections/[id]">) {
  const studio = await getStudioAccess();
  if (!studio.ok) {
    if (studio.reason === "not-allowed") redirect("/studio/collections");
    redirect("/auth/sign-in");
  }

  const { id: raw } = await props.params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const sql = getSql()!;
  const [entry, revisions] = await Promise.all([getCollectionEntry(sql, id), listRevisions(sql, id)]);
  if (!entry) notFound();

  const name = entry.draft.name || "Untitled collection";

  if (entry.deletedAt) {
    return (
      <main>
        <PageIntro title={name}>This collection is deleted and off the site.</PageIntro>
        <section className="band bandPaper">
          <div className={`wrap ${styles.layout}`}>
            <StudioNav current="/studio/collections" />
            <form action={restoreCollection}>
              <input type="hidden" name="id" value={entry.id} />
              <button className="cta">Restore it</button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <PageIntro title={name}>
        {entry.isPublished
          ? entry.hasChanges
            ? "Live, with edits that are not published yet."
            : "Live. The site shows exactly this version."
          : "Not published. Nobody outside the studio can see it yet."}
      </PageIntro>

      <section className="band bandPaper">
        <div className={`wrap ${styles.editorLayout}`}>
          <div className={styles.editorMain}>
            <StudioNav current="/studio/collections" />
            <p className={styles.meta}>
              <Link href="/studio/collections">← All collections</Link>
            </p>
            <CollectionEditor
              id={entry.id}
              initial={entry.draft}
              updatedAt={entry.updatedAt}
              isPublished={entry.isPublished}
            />
          </div>

          <aside className={styles.editorSide} aria-label="Publishing and history">
            <h2 className={styles.subheading}>On the site</h2>
            {entry.isPublished ? (
              <>
                <p className={styles.meta}>
                  <Link href={`/collections/${entry.slug}`} target="_blank" rel="noopener">
                    View the live page ↗
                  </Link>
                </p>
                {entry.hasChanges ? (
                  <form action={revertCollection}>
                    <input type="hidden" name="id" value={entry.id} />
                    <ConfirmButton
                      className={styles.textButton}
                      confirm="Throw away every edit since the last publish? The draft goes back to what the site shows."
                    >
                      Discard unpublished edits
                    </ConfirmButton>
                  </form>
                ) : null}
                <form action={unpublishCollection}>
                  <input type="hidden" name="id" value={entry.id} />
                  <ConfirmButton
                    className={styles.textButton}
                    confirm={`Take “${name}” off the live site? The draft stays here and can be published again.`}
                  >
                    Unpublish
                  </ConfirmButton>
                </form>
              </>
            ) : (
              <p className={styles.meta}>Not on the site. Publish from the editor when it is ready.</p>
            )}
            <form action={deleteCollection}>
              <input type="hidden" name="id" value={entry.id} />
              <ConfirmButton
                className={styles.textButton}
                confirm={`Delete “${name}”? It comes off the live site straight away. You can restore it from Deleted.`}
              >
                Delete collection
              </ConfirmButton>
            </form>

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
                    {revision.hasPayload ? (
                      <form action={loadRevision}>
                        <input type="hidden" name="id" value={entry.id} />
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
