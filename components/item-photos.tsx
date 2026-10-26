import { ImageSlot, type Tone } from "@/components/motif-field";
import type { Item } from "@/lib/content";
import styles from "./item-photos.module.css";

type Props = {
  item: Item;
  tone: Tone;
  sizes: string;
};

/**
 * An item's photographs. None or one renders a single slot, so an item with
 * no photography yet keeps the motif stand-in. Several render as a row that
 * scrolls sideways and snaps to each shot, with the next one peeking in so
 * there is visibly more. CSS only: it swipes on touch, scrolls on a trackpad,
 * and takes arrow keys once focused.
 */
export function ItemPhotos({ item, tone, sizes }: Props) {
  const photos = item.photos ?? [];
  const fallback = `${item.name}, ${item.material}`;

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
      <ul className={styles.track} tabIndex={0} aria-label={`${item.name}, ${photos.length} photos`}>
        {photos.map((photo, index) => (
          <li key={photo.src} className={styles.shot}>
            <ImageSlot
              describes={photo.alt ?? `${fallback}, photo ${index + 1} of ${photos.length}`}
              src={photo.src}
              tone={tone}
              shape="tall"
              sizes={sizes}
            />
          </li>
        ))}
      </ul>
      <p className={`spec ${styles.count}`} aria-hidden="true">
        {photos.length} photos, swipe for more
      </p>
    </div>
  );
}
