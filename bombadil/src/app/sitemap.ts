import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bombadil-three.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/consentimiento`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
