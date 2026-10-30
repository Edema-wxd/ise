"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { TONE_NAMES } from "@/components/motif-field";
import type { CollectionDraft, PhotoDraft, PieceDraft } from "@/lib/studio/collections";
import styles from "../../studio.module.css";
import { saveCollection } from "../actions";
import type { EditorState } from "../state";

/*
  The collection editor.

  The whole draft lives in local state and is sent as one JSON payload, so
  pieces and photos can be added, removed and reordered freely before saving.
  The server re-validates everything; the checks here are only the field
  errors it sends back, shown next to the fields they belong to.
*/

type PhotoRow = PhotoDraft & { key: number };
type PieceRow = Omit<PieceDraft, "photos"> & { key: number; photos: PhotoRow[] };
type Draft = Omit<CollectionDraft, "pieces"> & { pieces: PieceRow[] };

let nextKey = 1;
const key = () => nextKey++;

function withKeys(draft: CollectionDraft): Draft {
  return {
    ...draft,
    pieces: draft.pieces.map((piece) => ({
      ...piece,
      key: key(),
      photos: piece.photos.map((photo) => ({ ...photo, key: key() })),
    })),
  };
}

function withoutKeys(draft: Draft): CollectionDraft {
  return {
    ...draft,
    pieces: draft.pieces.map(({ key: _piece, photos, ...piece }) => ({
      ...piece,
      photos: photos.map(({ key: _photo, ...photo }) => photo),
    })),
  };
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function CollectionEditor({
  id,
  initial,
  updatedAt,
  isPublished,
}: {
  id: number;
  initial: CollectionDraft;
  updatedAt: string;
  isPublished: boolean;
}) {
  const [state, action, pending] = useActionState(saveCollection, {
    status: "idle",
    message: "",
    errors: {},
    updatedAt,
  } satisfies EditorState);
  const [draft, setDraft] = useState(() => withKeys(initial));
  const [dirty, setDirty] = useState(false);
  const [seen, setSeen] = useState(updatedAt);
  /* The version this form is editing, sent back on save as the concurrency
     check. It moves forward on this editor's own saves and when it adopts a
     version written elsewhere — never only one of the two, or the next save
     would be refused as a conflict with itself. */
  const [base, setBase] = useState(updatedAt);
  const status = useRef<HTMLParagraphElement>(null);

  // A save clears the dirty flag and moves the base forward.
  const [saved, setSaved] = useState(state);
  if (saved !== state) {
    setSaved(state);
    if (state.status === "saved" || state.status === "published") {
      setDirty(false);
      setBase(state.updatedAt);
    }
  }

  /* The page re-renders after any change. If the new version came from this
     editor's own save, keep the form as it is. If it came from elsewhere
     (loading an old version, discarding edits), take the server's draft. */
  if (updatedAt !== seen) {
    setSeen(updatedAt);
    if (updatedAt !== state.updatedAt) {
      setDraft(withKeys(initial));
      setDirty(false);
      setBase(updatedAt);
    }
  }

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (state.status !== "idle") status.current?.focus();
  }, [state]);

  const errors = state.errors;
  const update = (change: (current: Draft) => Draft) => {
    setDraft(change);
    setDirty(true);
  };
  const setField = (field: keyof Omit<Draft, "pieces">, value: string) =>
    update((current) => ({ ...current, [field]: value }));
  const setPiece = (index: number, change: (piece: PieceRow) => PieceRow) =>
    update((current) => ({
      ...current,
      pieces: current.pieces.map((piece, i) => (i === index ? change(piece) : piece)),
    }));

  const field = (
    path: string,
    label: string,
    input: React.ReactElement,
    hint?: string,
  ) => (
    <div className={styles.field}>
      <label htmlFor={path} className={styles.label}>
        {label}
      </label>
      {input}
      {errors[path] ? (
        <p id={`${path}-error`} className={styles.error}>
          {errors[path]}
        </p>
      ) : hint ? (
        <p id={`${path}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );

  const described = (path: string, hint?: boolean) =>
    errors[path] ? `${path}-error` : hint ? `${path}-hint` : undefined;

  return (
    <form action={action} className={styles.editor} noValidate>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="updatedAt" value={base} />
      <input type="hidden" name="payload" value={JSON.stringify(withoutKeys(draft))} />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>The collection</legend>

        {field(
          "name",
          "Name",
          <input
            id="name"
            className={styles.input}
            value={draft.name}
            onChange={(event) => setField("name", event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={described("name")}
          />,
        )}

        {field(
          "slug",
          "Web address",
          <div className={styles.inline}>
            <span className={styles.prefix}>/collections/</span>
            <input
              id="slug"
              className={styles.input}
              value={draft.slug}
              onChange={(event) => setField("slug", event.target.value.toLowerCase())}
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={described("slug", true)}
            />
          </div>,
          isPublished
            ? "Changing this moves the live page. Links to the old address will stop working."
            : "Lowercase letters, numbers and hyphens.",
        )}

        {field(
          "summary",
          "Summary",
          <input
            id="summary"
            className={styles.input}
            value={draft.summary}
            onChange={(event) => setField("summary", event.target.value)}
            aria-invalid={errors.summary ? true : undefined}
            aria-describedby={described("summary", true)}
          />,
          "One line, shown on the home page and the collections page.",
        )}

        {field(
          "intro",
          "Intro",
          <textarea
            id="intro"
            rows={4}
            className={styles.input}
            value={draft.intro}
            onChange={(event) => setField("intro", event.target.value)}
            aria-invalid={errors.intro ? true : undefined}
            aria-describedby={described("intro", true)}
          />,
          "Two or three sentences for the top of the collection page.",
        )}

        <fieldset className={styles.tones}>
          <legend className={styles.label}>Tone</legend>
          <div className={styles.toneChoices}>
            {TONE_NAMES.map((tone) => (
              <label key={tone} className={styles.toneChoice}>
                <input
                  type="radio"
                  name="tone-choice"
                  value={tone}
                  checked={draft.tone === tone}
                  onChange={() => setField("tone", tone)}
                />
                <span className={styles.swatch} style={{ background: `var(--${tone})` }} aria-hidden="true" />
                {tone}
              </label>
            ))}
          </div>
          {errors.tone ? <p className={styles.error}>{errors.tone}</p> : null}
        </fieldset>

        {field(
          "image",
          "Lead photo link (optional)",
          <input
            id="image"
            type="url"
            className={styles.input}
            value={draft.image}
            placeholder="https://ok2jcu82ma.ufs.sh/f/…"
            onChange={(event) => setField("image", event.target.value)}
            aria-invalid={errors.image ? true : undefined}
            aria-describedby={described("image", true)}
          />,
          "From the UploadThing dashboard. Empty shows the pattern.",
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Pieces ({draft.pieces.length})</legend>

        {draft.pieces.map((piece, i) => {
          const base = `pieces.${i}`;
          const label = piece.name || `Piece ${i + 1}`;
          return (
            <div key={piece.key} className={styles.piece}>
              <div className={styles.pieceHead}>
                <h3 className={styles.pieceTitle}>{label}</h3>
                <div className={styles.inline}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={i === 0}
                    onClick={() => update((c) => ({ ...c, pieces: move(c.pieces, i, i - 1) }))}
                    aria-label={`Move ${label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={i === draft.pieces.length - 1}
                    onClick={() => update((c) => ({ ...c, pieces: move(c.pieces, i, i + 1) }))}
                    aria-label={`Move ${label} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => update((c) => ({ ...c, pieces: c.pieces.filter((_, j) => j !== i) }))}
                    aria-label={`Remove ${label}`}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className={styles.pieceFields}>
                {(["name", "material", "dimension"] as const).map((key) =>
                  field(
                    `${base}.${key}`,
                    { name: "Name", material: "Material", dimension: "Size" }[key],
                    <input
                      id={`${base}.${key}`}
                      className={styles.input}
                      value={piece[key]}
                      onChange={(event) => setPiece(i, (p) => ({ ...p, [key]: event.target.value }))}
                      aria-invalid={errors[`${base}.${key}`] ? true : undefined}
                      aria-describedby={described(`${base}.${key}`)}
                    />,
                  ),
                )}
              </div>

              <div className={styles.photos}>
                <p className={styles.label}>Photos ({piece.photos.length})</p>
                {piece.photos.map((photo, j) => {
                  const path = `${base}.photos.${j}`;
                  return (
                    <div key={photo.key} className={styles.photo}>
                      {field(
                        `${path}.src`,
                        j === 0 ? "Lead photo link" : `Photo ${j + 1} link`,
                        <input
                          id={`${path}.src`}
                          type="url"
                          className={styles.input}
                          value={photo.src}
                          placeholder="https://ok2jcu82ma.ufs.sh/f/…"
                          onChange={(event) =>
                            setPiece(i, (p) => ({
                              ...p,
                              photos: p.photos.map((ph, k) => (k === j ? { ...ph, src: event.target.value } : ph)),
                            }))
                          }
                          aria-invalid={errors[`${path}.src`] ? true : undefined}
                          aria-describedby={described(`${path}.src`)}
                        />,
                      )}
                      {field(
                        `${path}.alt`,
                        "What it shows",
                        <input
                          id={`${path}.alt`}
                          className={styles.input}
                          value={photo.alt}
                          placeholder={`${piece.name || "Piece"}, worn on the wrist`}
                          onChange={(event) =>
                            setPiece(i, (p) => ({
                              ...p,
                              photos: p.photos.map((ph, k) => (k === j ? { ...ph, alt: event.target.value } : ph)),
                            }))
                          }
                          aria-describedby={described(`${path}.alt`, true)}
                        />,
                        "For people who cannot see the photo, and for search.",
                      )}
                      <div className={styles.inline}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          disabled={j === 0}
                          onClick={() => setPiece(i, (p) => ({ ...p, photos: move(p.photos, j, j - 1) }))}
                          aria-label={`Move photo ${j + 1} of ${label} earlier`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          disabled={j === piece.photos.length - 1}
                          onClick={() => setPiece(i, (p) => ({ ...p, photos: move(p.photos, j, j + 1) }))}
                          aria-label={`Move photo ${j + 1} of ${label} later`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => setPiece(i, (p) => ({ ...p, photos: p.photos.filter((_, k) => k !== j) }))}
                          aria-label={`Remove photo ${j + 1} of ${label}`}
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="ctaQuiet"
                  onClick={() =>
                    setPiece(i, (p) => ({ ...p, photos: [...p.photos, { key: key(), src: "", alt: "" }] }))
                  }
                >
                  Add a photo
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="ctaQuiet"
          onClick={() =>
            update((c) => ({
              ...c,
              pieces: [...c.pieces, { key: key(), name: "", material: "", dimension: "", photos: [] }],
            }))
          }
        >
          Add a piece
        </button>
      </fieldset>

      <div className={styles.saveBar}>
        <button type="submit" name="intent" value="save" className="ctaQuiet" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button type="submit" name="intent" value="publish" className="cta" disabled={pending}>
          {isPublished ? "Publish changes" : "Publish"}
        </button>
        <p
          ref={status}
          tabIndex={-1}
          aria-live="polite"
          className={
            state.status === "saved" || state.status === "published"
              ? styles.success
              : state.status === "idle"
                ? styles.meta
                : styles.error
          }
        >
          {/* After a save, further edits make the "saved" line stale. Errors stay
              up until the next submit, since they say what still needs fixing. */}
          {dirty && (state.status === "idle" || state.status === "saved" || state.status === "published")
            ? "Unsaved edits."
            : state.message}
          {errors.form ? ` ${errors.form}` : ""}
        </p>
      </div>
    </form>
  );
}
