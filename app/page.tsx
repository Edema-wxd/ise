import { AdireBand } from "@/components/adire-band";
import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <span className={styles.mark} lang="yo">
          Ìṣẹ́
        </span>
        <span className={styles.status}>In progress</span>
      </header>

      <AdireBand />

      <section className={styles.say}>
        <h1 className={styles.headline}>We are building.</h1>
        <p className={styles.proverb}>
          <span lang="yo">Ìṣẹ́ ni oògùn ìṣẹ́</span>
          <span className={styles.gloss}>Work is the cure for want</span>
        </p>
        <p className={styles.note}>
          Like adire, this is made in passes. Each one goes deeper.
        </p>
      </section>

      <footer className={styles.foot}>
        <span>Back soon</span>
        <span>Motifs after adire eléko — Yorùbá indigo resist cloth</span>
      </footer>
    </main>
  );
}
