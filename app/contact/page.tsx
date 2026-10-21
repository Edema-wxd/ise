import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { SITE } from "@/lib/content";
import { InquiryForm } from "./inquiry-form";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Custom orders",
  description:
    "Commission a piece from ISE Studio, or get in touch about stockists, press and collaborations.",
};

export default function ContactPage() {
  return (
    <main>
      <PageIntro title="Custom orders">
        Most of what the studio makes starts as somebody&rsquo;s specific idea. Bring
        the idea, a size, and a rough deadline, and you will get a price and a
        timeline back.
      </PageIntro>

      <section className="band bandPaper">
        <div className={`wrap ${styles.layout}`}>
          <InquiryForm />

          <aside className={styles.aside}>
            <h2 className={styles.asideHeading}>Faster, if you prefer</h2>
            <p className={styles.asideBody}>
              Email goes straight to the bench. A DM with a photo of what you have in
              mind is just as good.
            </p>
            <ul className={styles.contacts}>
              <li>
                <a href={`mailto:${SITE.email}`} className={styles.contactLink}>
                  {SITE.email}
                </a>
              </li>
              <li>
                <a
                  href={`https://instagram.com/${SITE.instagram}`}
                  className={styles.contactLink}
                  rel="me noreferrer"
                  target="_blank"
                >
                  @{SITE.instagram} on Instagram
                </a>
              </li>
            </ul>

            <h2 className={styles.asideHeading}>How a commission runs</h2>
            <ol className={styles.steps}>
              <li>You describe the piece. The studio asks about material and size.</li>
              <li>You get a quote and a timeline, in writing.</li>
              <li>Work starts on deposit. You see progress as it happens.</li>
            </ol>
          </aside>
        </div>
      </section>
    </main>
  );
}
