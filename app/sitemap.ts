import type { MetadataRoute } from "next";
import { COLLECTIONS, PROJECTS, SITE } from "@/lib/content";

/**
 * Generated from the same content module the pages render, so a new collection
 * or project appears in the sitemap without anyone remembering to add it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE.url}/collections`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/projects`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/events`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE.url}/contact`, changeFrequency: "yearly", priority: 0.7 },
  ];

  for (const collection of COLLECTIONS) {
    entries.push({
      url: `${SITE.url}/collections/${collection.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const project of PROJECTS) {
    entries.push({
      url: `${SITE.url}/projects/${project.slug}`,
      changeFrequency: "yearly",
      priority: 0.6,
    });
  }

  return entries;
}
