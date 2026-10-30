import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { getSql } from "@/lib/db";
import { listCollections, type CollectionEntry } from "@/lib/studio/collections";
import { getStudioAccess } from "@/lib/studio/session";
import { ConfirmButton } from "../confirm-button";
import { SignOutButton } from "../sign-out";
import { StudioNav } from "../studio-nav";
import styles from "../studio.module.css";
import { deleteCollection, moveCollection, restoreCollection } from "./actions";
import { NewCollectionForm } from "./new-collection-form";

export const metadata: Metadata = {
  title: "Collections — Studio",
  robots: { index: false, follow: false },
};

// Blocks on the session, like the inbox: no useful static shell for an
// auth-gated page. See app/studio/page.tsx.
export const instant = false;

/** What a visitor to the live site sees of this collection right now. */
function status(entry: CollectionEntry): { label: string; tone: "live" | "changed" | "draft" } {
  if (!entry.isPublished) return { label: "Not published", tone: "draft" };
  if (entry.hasChanges) return { label: "Live, with unpublished edits", tone: "changed" };
  return { label: "Live", tone: "live" };
}

export default async function StudioCollectionsPage() {
  const studio = await getStudioAccess();
  if (!studio.ok && studio.reason !== "not-allowed") redirect("/auth/sign-in");

  if (!studio.ok) {
    return (
      <main>
        <PageIntro title="Collections">This account is not on the studio list.</PageIntro>
        <section className="band bandPaper">
          <div className={`wrap ${styles.layout}`}>
            <p className={styles.error}>
              Ask whoever runs the site to add your email to STUDIO_EMAILS.
            </p>
            <SignOutButton />
          </div>
        </section>
      </main>
    );
  }

  const entries = await listCollections(getSql()!);
  const live = entries.filter((entry) => !entry.deletedAt);
  const deleted = entries.filter((entry) => entry.deletedAt);

  return (
    <main>
      <PageIntro title="Collections">
        Signed in as {studio.email}. Edits are drafts until you publish them; the live
        site shows the published version, in this order.
      </PageIntro>

      <section className="band bandPaper">
        <div className={`wrap ${styles.layout}`}>
          <StudioNav current="/studio/collections" />

          <ol className={styles.entries}>
            {live.map((entry, index) => {
              const s = status(entry);
              return (
                <li key={entry.id} className={styles.entry}>
                  <div className={styles.entryMain}>
                    <Link href={`/studio/collections/${entry.id}`} className={styles.entryName}>
                      {entry.draft.name || "Untitled collection"}
                    </Link>
                    <p className={styles.meta}>
                      <span className={`${styles.badge} ${styles[s.tone]}`}>{s.label}</span>{" "}
                      /collections/{entry.slug} · {entry.draft.pieces.length}{" "}
                      {entry.draft.pieces.length === 1 ? "piece" : "pieces"}
                    </p>
                  </div>

                  <div className={styles.entryActions}>
                    <form action={moveCollection}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        className={styles.iconButton}
                        disabled={index === 0}
                        aria-label={`Move ${entry.draft.name} up`}
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveCollection}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        className={styles.iconButton}
                        disabled={index === live.length - 1}
                        aria-label={`Move ${entry.draft.name} down`}
                      >
                        ↓
                      </button>
                    </form>
                    <Link href={`/studio/collections/${entry.id}`} className="ctaQuiet">
                      Edit
                    </Link>
                    <form action={deleteCollection}>
                      <input type="hidden" name="id" value={entry.id} />
                      <ConfirmButton
                        className={styles.textButton}
                        label={`Delete ${entry.draft.name}`}
                        confirm={`Delete “${entry.draft.name}”? It comes off the live site straight away. You can restore it from Deleted.`}
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>

          {live.length === 0 ? (
            <p className={styles.meta}>
              No collections yet. If the site shows some, the database has not been seeded:
              run <code>npm run db:seed</code>.
            </p>
          ) : null}

          <NewCollectionForm />

          {deleted.length > 0 ? (
            <section className={styles.deleted} aria-labelledby="deleted-heading">
              <h2 id="deleted-heading" className={styles.subheading}>
                Deleted
              </h2>
              <p className={styles.meta}>Off the site. Restore one to put it back at the end of the list.</p>
              <ul className={styles.entries}>
                {deleted.map((entry) => (
                  <li key={entry.id} className={styles.entry}>
                    <div className={styles.entryMain}>
                      <span className={styles.entryName}>{entry.draft.name || "Untitled collection"}</span>
                      <p className={styles.meta}>/collections/{entry.slug}</p>
                    </div>
                    <div className={styles.entryActions}>
                      <form action={restoreCollection}>
                        <input type="hidden" name="id" value={entry.id} />
                        <button className="ctaQuiet">Restore</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
