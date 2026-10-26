import type { Tone } from "@/components/motif-field";

/*
  All site content lives here so the routes stay templates.

  PLACEHOLDER COPY. Every string below is written to the brand voice and to
  the right length for its slot, but it is not client-approved, and no claim
  in it has been verified. Collection names come from CLAUDE.md; the two events
  are the ones named there. Object names, materials, years and project details
  are stand-ins — replace wholesale from Discovery before launch, and do not
  publish any of it as fact.
*/

/** The header renders this when set, and falls back to the wordmark in type
 *  when it is null. Per the brand guide the hand-drawn mark must not be
 *  redrawn — this points at the client's own file. See public/brand/README.md. */
export const LOGO: { src: string; width: number; height: number; alt: string } | null = {
  // The client's plain mark as delivered: black line art, 611.51 × 609.65.
  src: "/brand/logo.svg",
  width: 611.51,
  height: 609.65,
  alt: "ISE Studio",
};

export const SITE = {
  name: "ISE Studio",
  /** Canonical origin, used by metadata and the sitemap. */
  url: "https://www.isestudiong.com",
  tagline: "Industrial design out of Nigeria — objects for the body and the room.",
  /** TODO(client): confirm the inbox that custom-order mail should reach. */
  email: "hello@isestudiong.com",
  /** TODO(client): confirm the DM handle to publish. */
  instagram: "isestudiong",
} as const;

/** One photograph on UploadThing. */
export type Photo = {
  /** `https://<APP_ID>.ufs.sh/f/<FILE_KEY>`. */
  src: string;
  /** What this shot shows, for someone who cannot see it: "Wide cuff, worn on
   *  the wrist". Defaults to the item's name and material, which is fine for
   *  one photo and too vague for several. */
  alt?: string;
};

/** One thing in a collection. */
export type Item = {
  name: string;
  /** Material first: it is the thing a buyer asks about before anything else. */
  material: string;
  /** Free text, because a cuff is measured differently from a stool. */
  dimension: string;
  /** Lead photo first. Empty or absent means the motif stands in. */
  photos?: Photo[];
};

export type Collection = {
  slug: string;
  name: string;
  /** One line, for the collections index. */
  summary: string;
  /** Two or three sentences, for the top of the collection page. */
  intro: string;
  tone: Tone;
  /** UploadThing URL for the collection's lead image. */
  image?: string;
  items: Item[];
};

export const COLLECTIONS: Collection[] = [
  {
    slug: "jewellery-and-accessories",
    name: "Jewellery and accessories",
    summary: "Brass, bone and cord, cut and formed by hand.",
    intro:
      "Pieces built the way a tool is built: for a specific hand, a specific weight, a specific job. Brass is worked cold, finished dull, and left to take on whoever wears it.",
    tone: "coral",
    items: [
      { name: "Wide cuff", material: "Cast brass", dimension: "58 mm inner, 24 mm face" },
      { name: "Spine collar", material: "Brass, waxed cord", dimension: "Adjustable, 38–46 cm" },
      { name: "Weight earrings", material: "Brass, steel post", dimension: "42 mm drop" },
      { name: "Signal ring", material: "Brass, blackened", dimension: "Sizes 6–12" },
    ],
  },
  {
    slug: "afrocentric-and-gemstone",
    name: "Afrocentric and gemstone pieces",
    summary: "Set stones against pattern drawn from Yorùbá form.",
    intro:
      "Stones are chosen for colour before clarity, then set in geometry borrowed from carved and woven work. The setting is meant to be read, not to disappear under the stone.",
    tone: "mauve",
    items: [
      { name: "Field pendant", material: "Brass, agate", dimension: "46 mm face" },
      { name: "Stacked bangle", material: "Brass, carnelian", dimension: "62 mm inner" },
      { name: "Mask stud", material: "Silver, onyx", dimension: "16 mm" },
      { name: "Vessel pendant", material: "Brass, tiger's eye", dimension: "52 mm drop" },
    ],
  },
  {
    slug: "engraved-wood",
    name: "Engraved wood accessories",
    summary: "Hardwood cut, engraved and oiled.",
    intro:
      "Wood holds a line better than most people expect. Pattern is engraved deep enough to catch light across the grain, then the surface is oiled rather than lacquered so it keeps moving.",
    tone: "peach",
    items: [
      { name: "Lattice tray", material: "Iroko", dimension: "320 × 220 mm" },
      { name: "Grain comb", material: "Mahogany", dimension: "140 mm" },
      { name: "Engraved box", material: "Iroko, brass pin", dimension: "180 × 120 × 70 mm" },
      { name: "Hand mirror", material: "Mahogany, glass", dimension: "240 mm" },
    ],
  },
  {
    slug: "apparel",
    name: "Apparel",
    summary: "Cut flat, printed in the studio palette.",
    intro:
      "Garments are patterned flat and printed in the same six colours as everything else here, so a shirt and a cuff can be worn together without argument.",
    tone: "eggplant",
    items: [
      { name: "Motif shirt", material: "Cotton poplin", dimension: "S–XXL" },
      { name: "Work jacket", material: "Cotton canvas", dimension: "S–XXL" },
      { name: "Wrap trouser", material: "Cotton", dimension: "S–XXL" },
      { name: "Field cap", material: "Cotton twill", dimension: "One size" },
    ],
  },
  {
    slug: "3d-design",
    name: "3D design",
    summary: "Objects modelled, printed and cast.",
    intro:
      "Where the form is easier to model than to carve, it gets modelled — then printed, cast, or milled, and finished by hand like everything else.",
    tone: "brick",
    items: [
      { name: "Stool study", material: "PLA print, oiled ply", dimension: "420 mm tall" },
      { name: "Vessel series", material: "Cast resin", dimension: "180–260 mm" },
      { name: "Mask form", material: "Printed nylon", dimension: "280 mm" },
      { name: "Hinge study", material: "Cast brass", dimension: "90 mm" },
    ],
  },
];

export type NavItem = {
  href: string;
  label: string;
  /** Shown as a menu under this entry in the header. */
  children?: NavItem[];
};

export const NAV: NavItem[] = [
  {
    href: "/collections",
    label: "Collections",
    // Built from COLLECTIONS, so a new collection joins the menu on its own.
    children: [
      { href: "/collections", label: "All collections" },
      ...COLLECTIONS.map((collection) => ({
        href: `/collections/${collection.slug}`,
        label: collection.name,
      })),
    ],
  },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Custom orders" },
];

export type Project = {
  slug: string;
  title: string;
  year: string;
  /** What the studio did, in the client's own terms. */
  role: string;
  summary: string;
  /** UploadThing URL for the lead process photograph. */
  image?: string;
  /** The story, in order: brief, process, outcome. Headings are the content. */
  sections: { heading: string; body: string }[];
};

export const PROJECTS: Project[] = [
  {
    slug: "brass-cuff-series",
    title: "Brass cuff series",
    year: "2024",
    role: "Design, fabrication",
    summary:
      "Twelve cuffs from one profile, worked until the profile stopped fighting the wrist.",
    sections: [
      {
        heading: "The problem with a flat cuff",
        body: "A cuff cut from flat stock sits on two points and rocks on everything in between. The series started by cutting the same profile twelve times and changing only the curve, until one of them stayed put through a day of wear.",
      },
      {
        heading: "Working cold",
        body: "Brass was formed cold over a hardwood buck so the surface kept its tool marks. Nothing was polished to mirror; the finish stops at a dull sheen that takes fingerprints and then loses them.",
      },
      {
        heading: "What shipped",
        body: "The eighth profile went into production as the wide cuff. The other eleven stay in the studio as the record of how it got there.",
      },
    ],
  },
  {
    slug: "engraved-tray",
    title: "Engraved lattice tray",
    year: "2024",
    role: "Design, engraving",
    summary: "A tray that reads as pattern from standing and as grain up close.",
    sections: [
      {
        heading: "Two viewing distances",
        body: "The brief was a serving tray for a Lagos home, which meant it had to work on a table at arm's length and across a room. Those are different drawings. The lattice is cut at two depths so the shallow pass disappears at distance and the deep pass holds the pattern.",
      },
      {
        heading: "Iroko, not imported hardwood",
        body: "Iroko was chosen because it is here, it moves predictably, and it takes an engraved line without tearing. It also darkens, which the pattern was drawn to allow for.",
      },
      {
        heading: "Oil over lacquer",
        body: "Lacquer would have locked the surface and flattened the cut. Oiling keeps the tray repairable: a scratch comes out with a cloth rather than a refinish.",
      },
    ],
  },
  {
    slug: "pattern-system",
    title: "Studio pattern system",
    year: "2023",
    role: "Design system",
    summary:
      "One set of motifs, drawn once, cut into metal, wood, cloth and print.",
    sections: [
      {
        heading: "One drawing, four materials",
        body: "Each motif was drawn to survive every process the studio uses — engraved into wood, pierced in brass, printed on cotton, modelled in 3D. A line that only works in one of those was redrawn until it worked in all four.",
      },
      {
        heading: "Six colours, no more",
        body: "The palette was fixed at six so a garment, a cuff and a printed card could be put on a table together and still look like one studio made them.",
      },
      {
        heading: "Where it runs now",
        body: "The system underpins the current product lines and this site, which is drawn from the same motifs rather than from photography of them.",
      },
    ],
  },
];

export type Event = {
  title: string;
  /** Both optional: an event is listed as soon as its name is confirmed, and
   *  gains its venue and year when those are. */
  venue?: string;
  year?: string;
  note: string;
  /** UploadThing URL for the install photograph. */
  image?: string;
};

/** Returns the venue-and-year line, or a single honest stand-in when neither
 *  has been confirmed, so an unconfirmed event never says "to be confirmed"
 *  twice in one line. */
export function eventMeta(event: Event): string {
  const parts = [event.venue, event.year].filter(Boolean);
  return parts.length > 0 ? `${parts.join(". ")}.` : "Venue and dates to come.";
}

/** TODO(client): confirm venues, dates and which events should be listed. */
export const EVENTS: Event[] = [
  {
    title: "ISE: Work at 25",
    note: "A survey of the studio's first body of work, shown as a single room of objects.",
  },
  {
    title: "ISE Pop-Up Shop",
    note: "Product lines sold directly, with the workbench set up in the room.",
  },
];
