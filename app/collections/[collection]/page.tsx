import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemPhotos } from "@/components/item-photos";
import { toneAt } from "@/components/motif-field";
import { PageIntro } from "@/components/page-intro";
import { COLLECTIONS } from "@/lib/content";
import styles from "../collections.module.css";

/*
  One template for every collection, per the build conventions. Adding a
  collection means adding an entry to COLLECTIONS — no new route, no new
  component.
*/

function findCollection(slug: string) {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}

export function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ collection: collection.slug }));
}

export async function generateMetadata(
  props: PageProps<"/collections/[collection]">,
): Promise<Metadata> {
  const { collection: slug } = await props.params;
  const collection = findCollection(slug);

  if (!collection) return {};

  return {
    title: collection.name,
    description: collection.summary,
  };
}

export default async function CollectionPage(props: PageProps<"/collections/[collection]">) {
  const { collection: slug } = await props.params;
  const collection = findCollection(slug);

  if (!collection) notFound();

  // The collection keeps its own tone for the first item, then walks the
  // palette, so a row of four items is not four identical blocks.
  const offset = COLLECTIONS.indexOf(collection);

  return (
    <main>
      <PageIntro title={collection.name}>{collection.intro}</PageIntro>

      <section className="band bandPaper">
        <div className="wrap">
          <ul className={styles.items}>
            {collection.items.map((item, index) => (
              <li key={item.name} className={styles.item}>
                <ItemPhotos
                  item={item}
                  tone={toneAt(offset + index)}
                  sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 50vw, 100vw"
                />
                <h2 className={styles.itemName}>{item.name}</h2>
                <p className={`spec ${styles.itemSpec}`}>
                  {item.material}. {item.dimension}.
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
            All {COLLECTIONS.length} collections
          </Link>
        </div>
      </section>
    </main>
  );
}
