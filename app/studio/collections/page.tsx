import type { Metadata } from "next";
import { EntryListPage } from "../entry-pages";

export const metadata: Metadata = {
  title: "Collections — Studio",
  robots: { index: false, follow: false },
};

// Blocks on the session, like the inbox: no useful static shell for an
// auth-gated page. See app/studio/page.tsx.
export const instant = false;

export default function StudioCollectionsPage() {
  return <EntryListPage kind="collection" />;
}
