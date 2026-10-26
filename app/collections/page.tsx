import type { Metadata } from "next";
import Link from "next/link";
import { ImageSlot } from "@/components/motif-field";
import { PageIntro } from "@/components/page-intro";
import { COLLECTIONS } from "@/lib/content";
import styles from "./collections.module.css";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Jewellery, gemstone pieces, engraved wood, apparel and 3D objects from ISE Studio, grouped into five collections.",
};

export default function CollectionsPage() {
  return (
    <main>
      <PageIntro title="Collections">
        Five collections, one palette, one set of motifs. Nothing here sells through
        the site — pieces are made to order and in small runs, so pick what you want
        and the studio will quote it.
      </PageIntro>

      <section className="band bandPaper">
        <div className="wrap">
          <ul className={styles.collections}>
            {COLLECTIONS.map((collection, index) => (
              <li key={collection.slug} className={styles.collection}>
                <Link href={`/collections/${collection.slug}`} className={styles.link}>
                  <ImageSlot
                    describes={`${collection.name} from ISE Studio`}
                    src={collection.image}
                    tone={collection.tone}
                    shape="wide"
                    sizes="(min-width: 50rem) 50vw, 100vw"
                  />
                </Link>
                <div className={styles.copy}>
                  <h2 className={styles.name}>
                    <Link href={`/collections/${collection.slug}`} className={styles.nameLink}>
                      {collection.name}
                    </Link>
                  </h2>
                  <p className={styles.blurb}>{collection.intro}</p>
                  <p className={`spec ${styles.count}`}>
                    {collection.pieces.length} pieces in this collection
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
