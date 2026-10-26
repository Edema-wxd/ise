import type { Collection, Copy, Event, Logo, NavItem, Project, Site } from "./content";

/*
  The initial content, and the fallback when the database is unreachable.

  This is where the site's content used to live outright. It is now the seed
  that `npm run db:seed` writes into `content_entries` and `settings` on a
  fresh database, and what the readers in `content.ts` fall back to when
  `DATABASE_URL` is unset or Postgres cannot be reached — on the same
  reasoning as `lib/db.ts`: a portfolio should keep serving.

  Once the database is seeded, editing this file changes nothing on the site.
  Edit content in the studio instead.

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
export const LOGO: Logo | null = null;
export const SITE: Site = {
  name: "ISE Studio",
  /** Canonical origin, used by metadata and the sitemap. */
  url: "https://isestudiong.com",
  tagline: "Industrial design out of Nigeria — objects for the body and the room.",
  /** TODO(client): confirm the inbox that custom-order mail should reach. */
  email: "hello@isestudiong.com",
  /** TODO(client): confirm the DM handle to publish. */
  instagram: "isestudiong",
};

export const NAV: NavItem[] = [
  { href: "/collections", label: "Collections" },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Custom orders" },
];

export const COLLECTIONS: Collection[] = [
  {
    slug: "jewellery-and-accessories",
    name: "Jewellery and accessories",
    summary: "Brass, bone and cord, cut and formed by hand.",
    intro:
      "Pieces built the way a tool is built: for a specific hand, a specific weight, a specific job. Brass is worked cold, finished dull, and left to take on whoever wears it.",
    tone: "coral",
    pieces: [
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
    pieces: [
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
    pieces: [
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
    pieces: [
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
    pieces: [
      { name: "Stool study", material: "PLA print, oiled ply", dimension: "420 mm tall" },
      { name: "Vessel series", material: "Cast resin", dimension: "180–260 mm" },
      { name: "Mask form", material: "Printed nylon", dimension: "280 mm" },
      { name: "Hinge study", material: "Cast brass", dimension: "90 mm" },
    ],
  },
];

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

/** Copy that used to be written straight into the JSX of each page. It moved
 *  here so the studio can edit it; the wording is unchanged. */
export const COPY: Copy = {
  home: {
    heroHeading: "Brass, hardwood and cotton, worked in Nigeria.",
    heroLead:
      "ISE Studio is an industrial design practice making jewellery, accessories, apparel and objects for the room. Everything starts as a drawing and ends on a bench.",
    collectionsHeading: "What the studio makes",
    projectsHeading: "Projects, and how they got made",
    eventsHeading: "Where to see the work",
  },
  footer: {
    promptHeading: "Want something made for you?",
    promptBody:
      "Commissions start with a conversation about material, size and how long it takes. Send the idea and the studio will tell you what it needs.",
  },
  collections: {
    title: "Collections",
    intro:
      "Five collections, one palette, one set of motifs. Nothing here sells through the site — pieces are made to order and in small runs, so pick what you want and the studio will quote it.",
  },
  projects: {
    title: "Projects",
    intro:
      "Longer pieces of work, written up with the part that usually gets left out: what did not work first.",
  },
  events: {
    title: "Events",
    intro:
      "The work is easier to understand in a room with it. These are the shows and pop-ups where it has been put in front of people.",
  },
  contact: {
    title: "Custom orders",
    intro:
      "Most of what the studio makes starts as somebody’s specific idea. Bring the idea, a size, and a rough deadline, and you will get a price and a timeline back.",
  },
};
