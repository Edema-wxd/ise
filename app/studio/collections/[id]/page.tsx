import type { Metadata } from "next";
import { EntryEditPage } from "../../entry-pages";

export const metadata: Metadata = {
  title: "Edit collection — Studio",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function EditCollectionPage(props: PageProps<"/studio/collections/[id]">) {
  return <EntryEditPage kind="collection" params={props.params} searchParams={props.searchParams} />;
}
