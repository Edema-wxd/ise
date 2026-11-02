import type { Metadata } from "next";
import { EntryEditPage } from "../../entry-pages";

export const metadata: Metadata = {
  title: "Edit project — Studio",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function EditProjectPage(props: PageProps<"/studio/projects/[id]">) {
  return <EntryEditPage kind="project" params={props.params} searchParams={props.searchParams} />;
}
