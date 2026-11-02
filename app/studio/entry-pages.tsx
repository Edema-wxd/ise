import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { getSql } from "@/lib/db";
import { getEntry, listEntries, listRevisions, type Entry } from "@/lib/studio/entries";
import { KINDS, type Kind, type KindSpec } from "@/lib/studio/kinds";
import { getStudioAccess } from "@/lib/studio/session";
import { deleteEntry, loadRevision, moveEntry, restoreEntry, revertEntry, unpublishEntry } from "./actions";
import { CollectionEditor } from "./collections/[id]/editor";
import { ConfirmButton } from "./confirm-button";
import { EventEditor } from "./events/[id]/editor";
import { NewEntryForm } from "./new-entry-form";
import { ProjectEditor } from "./projects/[id]/editor";
import { SignOutButton } from "./sign-out";
import { StudioNav } from "./studio-nav";
import styles from "./studio.module.css";

/*
  The list and editor pages for every kind of content entry. The route files
  under app/studio/<kind>/ are one line each; the pages are written once here
  against the kind's spec.
*/

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** What a visitor to the live site sees of this entry right now. */
function status<D>(entry: Entry<D>): { label: string; tone: "live" | "changed" | "draft" } {
  if (!entry.isPublished) return { label: "Not published", tone: "draft" };
  if (entry.hasChanges) return { label: "Live, with unpublished edits", tone: "changed" };
  return { label: "Live", tone: "live" };
}

/** The hidden fields every entry action reads. */
function Target({ kind, id }: { kind: Kind; id: number }) {
  return (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
    </>
  );
}

function NotAllowed({ title }: { title: string }) {
  return (
    <main>
      <PageIntro title={title}>This account is not on the studio list.</PageIntro>
      <section className="band bandPaper">
        <div className={`wrap ${styles.layout}`}>
          <p className={styles.error}>Ask whoever runs the site to add your email to STUDIO_EMAILS.</p>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}

/** Where a live entry is, and where it moves on publish if renamed. */
function Address<D>({ spec, entry }: { spec: KindSpec<D>; entry: Entry<D> }) {
  if (!spec.addressed) return null;
  const live = entry.publishedSlug ?? entry.slug;
  return (
    <>
      {spec.publicPath(live)}
      {entry.publishedSlug && entry.publishedSlug !== entry.slug
        ? ` (moving to ${spec.publicPath(entry.slug)} on publish)`
        : ""}{" "}
      ·{" "}
    </>
  );
}

export async function EntryListPage({ kind }: { kind: Kind }) {
  const spec = KINDS[kind];
  const title = capital(spec.many);
  const studio = await getStudioAccess();
  if (!studio.ok && studio.reason !== "not-allowed") redirect("/auth/sign-in");
  if (!studio.ok) return <NotAllowed title={title} />;

  const entries = await listEntries(getSql()!, spec);
  const live = entries.filter((entry) => !entry.deletedAt);
  const deleted = entries.filter((entry) => entry.deletedAt);
  const untitled = `Untitled ${spec.one}`;

  return (
    <main>
      <PageIntro title={title}>
        Signed in as {studio.email}. Edits are drafts until you publish them; the live
        site shows the published version, in this order.
      </PageIntro>

      <section className="band bandPaper">
        <div className={`wrap ${styles.layout}`}>
          <StudioNav current={spec.studioPath} />

          <ol className={styles.entries}>
            {live.map((entry, index) => {
              const s = status(entry);
              const name = spec.nameOf(entry.draft);
              return (
                <li key={entry.id} className={styles.entry}>
                  <div className={styles.entryMain}>
                    <Link href={`${spec.studioPath}/${entry.id}`} className={styles.entryName}>
                      {name || untitled}
                    </Link>
                    <p className={styles.meta}>
                      <span className={`${styles.badge} ${styles[s.tone]}`}>{s.label}</span>{" "}
                      <Address spec={spec} entry={entry} />
                      {spec.detail(entry.draft)}
                    </p>
                  </div>

                  <div className={styles.entryActions}>
                    <form action={moveEntry}>
                      <Target kind={kind} id={entry.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button className={styles.iconButton} disabled={index === 0} aria-label={`Move ${name} up`}>
                        ↑
                      </button>
                    </form>
                    <form action={moveEntry}>
                      <Target kind={kind} id={entry.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        className={styles.iconButton}
                        disabled={index === live.length - 1}
                        aria-label={`Move ${name} down`}
                      >
                        ↓
                      </button>
                    </form>
                    <Link href={`${spec.studioPath}/${entry.id}`} className="ctaQuiet">
                      Edit
                    </Link>
                    <form action={deleteEntry}>
                      <Target kind={kind} id={entry.id} />
                      <ConfirmButton
                        className={styles.textButton}
                        label={`Delete ${name}`}
                        confirm={`Delete “${name}”? It comes off the live site straight away. You can restore it from Deleted.`}
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
              No {spec.many} yet. If the site shows some, the database has not been seeded:
              run <code>npm run db:seed</code>.
            </p>
          ) : null}

          <NewEntryForm kind={kind} one={spec.one} placeholder={spec.newPlaceholder} />

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
                      <span className={styles.entryName}>{spec.nameOf(entry.draft) || untitled}</span>
                      <p className={styles.meta}>
                        {spec.addressed ? spec.publicPath(entry.slug) : spec.detail(entry.draft)}
                      </p>
                    </div>
                    <div className={styles.entryActions}>
                      <form action={restoreEntry}>
                        <Target kind={kind} id={entry.id} />
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

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

const ACTIONS: Record<string, string> = {
  save: "Draft saved",
  publish: "Published",
  unpublish: "Unpublished",
  revert: "Draft replaced",
  delete: "Deleted",
  restore: "Restored",
};

/** The kind's own editor, which knows its fields. */
function Editor({ kind, ...props }: { kind: Kind; id: number; initial: unknown; updatedAt: string; isPublished: boolean }) {
  switch (kind) {
    case "collection":
      return <CollectionEditor {...props} initial={props.initial as Parameters<typeof CollectionEditor>[0]["initial"]} />;
    case "project":
      return <ProjectEditor {...props} initial={props.initial as Parameters<typeof ProjectEditor>[0]["initial"]} />;
    case "event":
      return <EventEditor {...props} initial={props.initial as Parameters<typeof EventEditor>[0]["initial"]} />;
  }
}

export async function EntryEditPage({
  kind,
  params,
  searchParams,
}: {
  kind: Kind;
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spec = KINDS[kind];
  const studio = await getStudioAccess();
  if (!studio.ok) {
    if (studio.reason === "not-allowed") redirect(spec.studioPath);
    redirect("/auth/sign-in");
  }

  const [{ id: raw }, query] = await Promise.all([params, searchParams]);
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const sql = getSql()!;
  const [entry, revisions] = await Promise.all([getEntry(sql, spec, id), listRevisions(sql, id)]);
  if (!entry) notFound();

  const name = spec.nameOf(entry.draft) || `Untitled ${spec.one}`;
  const takenSlug = typeof query.slug === "string" ? query.slug : "";
  const notice =
    query.notice === "slug-taken"
      ? `That version uses ${spec.publicPath(takenSlug)}, which another ${spec.one} has taken since. The draft is unchanged.`
      : query.notice === "slug-deleted"
        ? `That version uses ${spec.publicPath(takenSlug)}, which a deleted ${spec.one} still holds. Restore or rename that one first. The draft is unchanged.`
        : "";

  if (entry.deletedAt) {
    return (
      <main>
        <PageIntro title={name}>This {spec.one} is deleted and off the site.</PageIntro>
        <section className="band bandPaper">
          <div className={`wrap ${styles.layout}`}>
            <StudioNav current={spec.studioPath} />
            <form action={restoreEntry}>
              <Target kind={kind} id={entry.id} />
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
            <StudioNav current={spec.studioPath} />
            <p className={styles.meta}>
              <Link href={spec.studioPath}>← All {spec.many}</Link>
            </p>
            {notice ? (
              <p className={styles.error} role="alert">
                {notice}
              </p>
            ) : null}
            <Editor
              kind={kind}
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
                  <Link href={spec.publicPath(entry.publishedSlug ?? entry.slug)} target="_blank" rel="noopener">
                    View the live page ↗
                  </Link>
                </p>
                {entry.hasChanges ? (
                  <form action={revertEntry}>
                    <Target kind={kind} id={entry.id} />
                    <ConfirmButton
                      className={styles.textButton}
                      confirm="Throw away every edit since the last publish? The draft goes back to what the site shows."
                    >
                      Discard unpublished edits
                    </ConfirmButton>
                  </form>
                ) : null}
                <form action={unpublishEntry}>
                  <Target kind={kind} id={entry.id} />
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
            <form action={deleteEntry}>
              <Target kind={kind} id={entry.id} />
              <ConfirmButton
                className={styles.textButton}
                confirm={`Delete “${name}”? It comes off the live site straight away. You can restore it from Deleted.`}
              >
                Delete {spec.one}
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
                        <Target kind={kind} id={entry.id} />
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
