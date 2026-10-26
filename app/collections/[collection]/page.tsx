import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageSlot, toneAt } from "@/components/motif-field";
import { PageIntro } from "@/components/page-intro";
import { getCollection, getCollectionParams, getCollections } from "@/lib/content";
import styles from "../collections.module.css";

/*
  One template for every collection, per the build conventions. Adding a
  collection means adding an entry in the studio — no new route, no new
  component.
*/

export const generateStaticParams = getCollectionParams;

export async function generateMetadata(
  props: PageProps<"/collections/[collection]">,
): Promise<Metadata> {
  "use cache";

  const { collection: slug } = await props.params;
  const collection = await getCollection(slug);

  if (!collection) return {};

  return {
    title: collection.name,
    description: collection.summary,
  };
}

export default async function CollectionPage(props: PageProps<"/collections/[collection]">) {
  const { collection: slug } = await props.params;
  const [collection, collections] = await Promise.all([
    getCollection(slug),
    getCollections(),
  ]);

  if (!collection) notFound();

  // The collection keeps its own tone for the first piece, then walks the
  // palette, so a row of four pieces is not four identical blocks.
  const offset = collections.indexOf(collection);

  return (
    <main>
      <PageIntro title={collection.name}>{collection.intro}</PageIntro>

      <section className="band bandPaper">
        <div className="wrap">
          <ul className={styles.pieces}>
            {collection.pieces.map((piece, index) => (
              <li key={piece.name} className={styles.piece}>
                <ImageSlot
                  describes={`${piece.name}, ${piece.material}`}
                  src={piece.image}
                  tone={toneAt(offset + index)}
                  shape="tall"
                  sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 50vw, 100vw"
                />
                <h2 className={styles.pieceName}>{piece.name}</h2>
                <p className={`spec ${styles.pieceSpec}`}>
                  {piece.material}. {piece.dimension}.
                </p>
              </li>
            ))}
          </ul>

          <div className={styles.order}>
            <h2>Want one of these?</h2>
            <p className={styles.orderBody}>
              Pieces in this collection are made to order. Tell the studio which one,
              what size, and when you need it, and you will get a price and a
              timeline back.
            </p>
            <Link href="/contact" className="cta">
              Ask about this collection
            </Link>
          </div>

          <Link href="/collections" className={styles.back}>
            All {collections.length} collections
          </Link>
        </div>
      </section>
    </main>
  );
}
