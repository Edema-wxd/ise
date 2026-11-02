import type { Metadata } from "next";
import { EntryEditPage } from "../../entry-pages";

export const metadata: Metadata = {
  title: "Edit event — Studio",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function EditEventPage(props: PageProps<"/studio/events/[id]">) {
  return <EntryEditPage kind="event" params={props.params} searchParams={props.searchParams} />;
}
