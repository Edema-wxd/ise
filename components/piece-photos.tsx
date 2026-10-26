import { ImageSlot, type Tone } from "@/components/motif-field";
import type { Piece } from "@/lib/content";
import styles from "./piece-photos.module.css";

type Props = {
  piece: Piece;
  tone: Tone;
  sizes: string;
};

/**
 * A piece's photographs. None or one renders a single slot, so a piece with
 * no photography yet keeps the motif stand-in. Several render as a row that
 * scrolls sideways and snaps to each shot. Each shot is full width, so the
 * card is the same height as its single-photo neighbours, and carries its own
 * "1 of 3" label that scrolls with it. CSS only: it swipes on touch, scrolls
 * on a trackpad, and takes arrow keys once focused.
 */
export function PiecePhotos({ piece, tone, sizes }: Props) {
  const photos = piece.photos ?? [];
  const fallback = `${piece.name}, ${piece.material}`;

  if (photos.length <= 1) {
    return (
      <ImageSlot
        describes={photos[0]?.alt ?? fallback}
        src={photos[0]?.src}
        tone={tone}
        shape="tall"
        sizes={sizes}
      />
    );
  }

  return (
    <div className={styles.gallery}>
      {/* Focusable so keyboard users can scroll it; labelled so a screen
          reader announces what the region holds before reading the shots. */}
      <ul className={styles.track} tabIndex={0} aria-label={`${piece.name}, ${photos.length} photos`}>
        {photos.map((photo, index) => (
          <li key={photo.src} className={styles.shot}>
            <ImageSlot
              describes={photo.alt ?? `${fallback}, photo ${index + 1} of ${photos.length}`}
              src={photo.src}
              tone={tone}
              shape="tall"
              sizes={sizes}
            />
            {/* The alt text already numbers the shot for screen readers. */}
            <span className={styles.count} aria-hidden="true">
              {index + 1} of {photos.length}
              {index === 0 ? " · swipe" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
