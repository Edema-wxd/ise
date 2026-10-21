import Image from "next/image";

import styles from "./motif-field.module.css";

/**
 * Palette pairings. Both halves of every pair are brand colors; a field never
 * picks its own colour, it picks one of these.
 */
const TONES = {
  coral: { ground: "var(--coral)", ink: "var(--eggplant)" },
  peach: { ground: "var(--peach)", ink: "var(--brick)" },
  brick: { ground: "var(--brick)", ink: "var(--peach)" },
  mauve: { ground: "var(--mauve)", ink: "var(--paper)" },
  eggplant: { ground: "var(--eggplant)", ink: "var(--coral)" },
  paper: { ground: "var(--paper)", ink: "var(--mauve)" },
} as const;

export type Tone = keyof typeof TONES;

/** Rotates through the palette so a list of fields never repeats a pairing
 *  side by side. */
export function toneAt(index: number): Tone {
  const order: Tone[] = ["coral", "mauve", "peach", "eggplant", "brick", "paper"];
  return order[index % order.length];
}

type FieldProps = {
  tone?: Tone;
  /** `field` is the large hero cloth; `tile` is a single object's worth. */
  scale?: "field" | "tile";
  className?: string;
};

/**
 * A field of studio motifs on one palette pairing. The drawing itself lives in
 * `motif-field.module.css` as a tiling mask, so the pattern fills whatever box
 * it is given. Decorative throughout — it carries no information, so it stays
 * out of the accessibility tree.
 */
export function MotifField({ tone = "coral", scale = "tile", className }: FieldProps) {
  const { ground, ink } = TONES[tone];

  return (
    <div
      aria-hidden="true"
      className={[
        styles.field,
        scale === "field" ? styles.scaleField : styles.tile,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--ground": ground, "--ink": ink } as React.CSSProperties}
    />
  );
}

type SlotProps = {
  /** What the photograph shows. Used as alt text, so write it for someone who
   *  cannot see the image: "Wide cuff, cast brass", not "product photo". */
  describes: string;
  /** UploadThing URL. Without one the motif stands in. */
  src?: string;
  tone?: Tone;
  /** Tall for worn pieces and apparel, wide for objects and installs. */
  shape?: "tall" | "wide" | "square";
  /** How wide this slot renders at each breakpoint, so the browser fetches the
   *  right size. Each layout passes its own; the default assumes full width. */
  sizes?: string;
};

/**
 * One image on the page. Renders the photograph when there is one, and the
 * studio motif labelled "Photography to come" when there is not — so a missing
 * asset reads as a designed state rather than a hole, and the layout does not
 * move when the real image lands.
 */
export function ImageSlot({
  describes,
  src,
  tone = "coral",
  shape = "square",
  sizes = "100vw",
}: SlotProps) {
  return (
    <figure className={[styles.slot, styles[shape]].join(" ")}>
      {src ? (
        <Image src={src} alt={describes} fill sizes={sizes} className={styles.slotImage} />
      ) : (
        <>
          <MotifField tone={tone} className={styles.slotField} />
          <figcaption className={styles.slotLabel}>Photography to come</figcaption>
        </>
      )}
    </figure>
  );
}
