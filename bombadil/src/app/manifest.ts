import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bombadil",
    short_name: "Bombadil",
    description: "Entiende tus exámenes y mejora tu salud, un hábito a la vez.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#2457a6",
    lang: "es-CO",
    icons: [
      { src: "/bombadil-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/bombadil-icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
