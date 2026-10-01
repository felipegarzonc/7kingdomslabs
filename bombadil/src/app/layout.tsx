import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bombadil", template: "%s · Bombadil" },
  description: "Longevidad sin humo: tus exámenes y hábitos, en una sola línea de tiempo.",
  // New file names on each logo change: browsers cache favicons for a long time.
  icons: {
    icon: [
      { url: "/bombadil-icon.svg", type: "image/svg+xml" },
      { url: "/bombadil-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/bombadil-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7fb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Light only for now: the gamified design (blue, gold) is drawn for light; the dark palette stays in globals.css for later.
    <html lang="es-CO" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
