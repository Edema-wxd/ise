import type { MetadataRoute } from "next";
import { getCollections, getProjects, getSite } from "@/lib/content";

/**
 * Generated from the same content module the pages render, so a new collection
 * or project appears in the sitemap without anyone remembering to add it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";

  const [site, collections, projects] = await Promise.all([
    getSite(),
    getCollections(),
    getProjects(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/collections`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site.url}/projects`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/events`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.7 },
  ];

  for (const collection of collections) {
    entries.push({
      url: `${site.url}/collections/${collection.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const project of projects) {
    entries.push({
      url: `${site.url}/projects/${project.slug}`,
      changeFrequency: "yearly",
      priority: 0.6,
    });
  }

  return entries;
}
