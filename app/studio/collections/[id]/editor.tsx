"use client";

import { TONE_NAMES } from "@/components/motif-field";
import type { CollectionDraft, PhotoDraft, PieceDraft } from "@/lib/studio/kinds/collection";
import { EntryForm, ImageField, move, rowKey, useEntryEditor } from "../../entry-editor";
import { PhotoPreview, PhotoUpload } from "../../photo-upload";
import styles from "../../studio.module.css";

/* The collection editor: its fields. Saving, versions and guards are the
   shared EntryForm's. */

type PhotoRow = PhotoDraft & { key: number };
type PieceRow = Omit<PieceDraft, "photos"> & { key: number; photos: PhotoRow[] };
type Draft = Omit<CollectionDraft, "pieces"> & { pieces: PieceRow[] };

function withKeys(draft: CollectionDraft): Draft {
  return {
    ...draft,
    pieces: draft.pieces.map((piece) => ({
      ...piece,
      key: rowKey(),
      photos: piece.photos.map((photo) => ({ ...photo, key: rowKey() })),
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
  const editor = useEntryEditor({ one: "collection", hidden: { kind: "collection", id }, initial, updatedAt, withKeys, withoutKeys });
  const { draft, update, reshape, errors, pending, field, described } = editor;

  const setField = (name: keyof Omit<Draft, "pieces">, value: string) =>
    update((current) => ({ ...current, [name]: value }));
  const setPiece = (index: number, change: (piece: PieceRow) => PieceRow, shape = false) =>
    (shape ? reshape : update)((current) => ({
      ...current,
      pieces: current.pieces.map((piece, i) => (i === index ? change(piece) : piece)),
    }));

  return (
    <EntryForm editor={editor} isPublished={isPublished}>
      <fieldset className={styles.fieldset} disabled={pending}>
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

        <ImageField editor={editor} label="Lead photo link (optional)" />
      </fieldset>

      <fieldset className={styles.fieldset} disabled={pending}>
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
                    onClick={() => reshape((c) => ({ ...c, pieces: move(c.pieces, i, i - 1) }))}
                    aria-label={`Move ${label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={i === draft.pieces.length - 1}
                    onClick={() => reshape((c) => ({ ...c, pieces: move(c.pieces, i, i + 1) }))}
                    aria-label={`Move ${label} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => reshape((c) => ({ ...c, pieces: c.pieces.filter((_, j) => j !== i) }))}
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
                      <PhotoPreview src={photo.src} />
                      <PhotoUpload
                        label={photo.src ? "Replace photo" : "Upload photo"}
                        onUploaded={([url]) =>
                          url &&
                          setPiece(i, (p) => ({
                            ...p,
                            photos: p.photos.map((ph, k) => (k === j ? { ...ph, src: url } : ph)),
                          }))
                        }
                      />
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
                          onClick={() => setPiece(i, (p) => ({ ...p, photos: move(p.photos, j, j - 1) }), true)}
                          aria-label={`Move photo ${j + 1} of ${label} earlier`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          disabled={j === piece.photos.length - 1}
                          onClick={() => setPiece(i, (p) => ({ ...p, photos: move(p.photos, j, j + 1) }), true)}
                          aria-label={`Move photo ${j + 1} of ${label} later`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => setPiece(i, (p) => ({ ...p, photos: p.photos.filter((_, k) => k !== j) }), true)}
                          aria-label={`Remove photo ${j + 1} of ${label}`}
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className={styles.inline}>
                  {/* Each pick adds a row per photo, in the order picked. The
                      "What it shows" line is still to write for each. */}
                  <PhotoUpload
                    label="Upload photos"
                    multiple
                    onUploaded={(urls) =>
                      setPiece(
                        i,
                        (p) => ({
                          ...p,
                          photos: [...p.photos, ...urls.map((src) => ({ key: rowKey(), src, alt: "" }))],
                        }),
                        true,
                      )
                    }
                  />
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() =>
                      setPiece(i, (p) => ({ ...p, photos: [...p.photos, { key: rowKey(), src: "", alt: "" }] }), true)
                    }
                  >
                    Add a photo by link
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="ctaQuiet"
          onClick={() =>
            reshape((c) => ({
              ...c,
              pieces: [...c.pieces, { key: rowKey(), name: "", material: "", dimension: "", photos: [] }],
            }))
          }
        >
          Add a piece
        </button>
      </fieldset>
    </EntryForm>
  );
}
