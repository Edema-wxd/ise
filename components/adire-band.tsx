import styles from "./adire-band.module.css";

// 60 strips at the 64px ceiling covers 3840px, so the cloth still runs edge
// to edge on a 4K display; the overflow is clipped on narrower ones.
const STRIPS = 60;
const ROWS = 4;
// One full pass spans 14 strips, so the wave is legible on a phone showing six
// of them as well as on a wide screen showing twenty-odd.
const STAGGER = 0.4;
const MOTIFS = ["nested", "comb", "seeds", "meander", "rings", "frond"];

/**
 * A band of adire eléko motifs, hand-drawn in cassava-paste resist on indigo.
 * The cloth is the progress indicator: dye deepens strip by strip, pass after
 * pass, and never finishes — which is the honest state of the site.
 */
export function AdireBand() {
  return (
    <div className={styles.band} aria-hidden="true">
      <svg className={styles.defs} xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Coordinates sit slightly off-true throughout: resist is painted
              by hand with a feather, and it never runs perfectly straight. */}
          <symbol id="nested" viewBox="0 0 24 24">
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.15"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3.6 3.9 20.4 3.3 20.8 20.3 3.2 20.7Z" />
              <path d="M7.8 8.2 16.4 7.8 16.6 16.5 7.6 16.2Z" />
            </g>
            <circle cx="12.1" cy="12.2" r="1.5" fill="currentColor" />
          </symbol>

          <symbol id="comb" viewBox="0 0 24 24">
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.05"
              strokeLinecap="round"
            >
              <path d="M4.2 3.6 4 20.4" />
              <path d="M8.1 3.3 8.3 20.6" />
              <path d="M12 3.6 11.9 20.3" />
              <path d="M15.9 3.4 16.1 20.5" />
              <path d="M19.8 3.7 19.6 20.4" />
              <path d="M3.4 12.1 20.6 11.9" />
            </g>
          </symbol>

          <symbol id="seeds" viewBox="0 0 24 24">
            <path
              d="M3.5 3.6 20.5 3.4 20.6 20.5 3.4 20.6Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            <g fill="currentColor">
              <circle cx="7.7" cy="7.5" r="1.35" />
              <circle cx="12.1" cy="7.7" r="1.35" />
              <circle cx="16.4" cy="7.4" r="1.35" />
              <circle cx="7.5" cy="12.1" r="1.35" />
              <circle cx="12" cy="12" r="1.35" />
              <circle cx="16.5" cy="12.2" r="1.35" />
              <circle cx="7.6" cy="16.5" r="1.35" />
              <circle cx="12.2" cy="16.3" r="1.35" />
              <circle cx="16.3" cy="16.6" r="1.35" />
            </g>
          </symbol>

          <symbol id="meander" viewBox="0 0 24 24">
            <path
              d="M4 20.4 4.2 3.8 20.2 4 20 16.6 8.6 16.4 8.4 8.6 16.2 8.4 16 12.9 12.4 12.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </symbol>

          <symbol id="rings" viewBox="0 0 24 24">
            <g fill="none" stroke="currentColor" strokeWidth="1.1">
              <circle cx="12" cy="12" r="8.6" />
              <circle cx="12.1" cy="11.9" r="5.1" />
            </g>
            <circle cx="12" cy="12" r="1.9" fill="currentColor" />
          </symbol>

          <symbol id="frond" viewBox="0 0 24 24">
            <g
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1"
            >
              <path d="M12 3.4 11.9 20.6" strokeWidth="1.2" />
              <path d="M12 6.5 7.4 9.2M12 6.5 16.6 9.1" />
              <path d="M11.9 10.7 7.2 13.4M11.9 10.7 16.8 13.3" />
              <path d="M12 14.8 7.5 17.5M12 14.8 16.5 17.4" />
            </g>
          </symbol>
        </defs>
      </svg>

      {Array.from({ length: STRIPS }, (_, strip) => (
        <div
          key={strip}
          className={styles.strip}
          style={{ animationDelay: `${-(strip * STAGGER).toFixed(2)}s` }}
        >
          {Array.from({ length: ROWS }, (_, row) => (
            <svg key={row} className={styles.cell} viewBox="0 0 24 24">
              {/* Mixed by coprime steps: no motif ever stacks on itself, and
                  the repeat runs on a diagonal like strip-woven cloth. */}
              <use href={`#${MOTIFS[(strip * 7 + row * 11) % MOTIFS.length]}`} />
            </svg>
          ))}
        </div>
      ))}
    </div>
  );
}
