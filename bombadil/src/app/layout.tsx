import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bombadil-three.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  applicationName: "Bombadil",
  title: { default: "Bombadil", template: "%s · Bombadil" },
  description: "Entiende tus exámenes de sangre y mejora tu salud con hábitos pequeños, basados en evidencia.",
  openGraph: { type: "website", locale: "es_CO", siteName: "Bombadil" },
  twitter: { card: "summary_large_image" },
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
