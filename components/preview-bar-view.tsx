"use client";

import { usePathname } from "next/navigation";
import { exitPreview } from "@/app/preview-actions";
import styles from "./preview-bar.module.css";

export function PreviewBarView() {
  const pathname = usePathname();
  return (
    <aside className={styles.bar} aria-label="Preview">
      <p className={styles.text}>
        <strong>Previewing drafts.</strong> Saved edits show here before they are published.
        Visitors still see the live site.
      </p>
      <div className={styles.actions}>
        <a href="/studio" className={styles.link}>
          Back to the studio
        </a>
        <form action={exitPreview}>
          <input type="hidden" name="path" value={pathname} />
          <button className={styles.button}>Exit preview</button>
        </form>
      </div>
    </aside>
  );
}
