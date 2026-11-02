import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HRVSTMN",
  description: "An ASCII tribute to Harvest Moon: Friends of Mineral Town drawn in the base16 Isotope Dark palette.",
  openGraph: {
    title: "HRVSTMN",
    description: "An ASCII tribute to Harvest Moon: Friends of Mineral Town drawn in the base16 Isotope Dark palette.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HRVSTMN",
    description: "An ASCII tribute to Harvest Moon: Friends of Mineral Town drawn in the base16 Isotope Dark palette.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>{children}</body>
    </html>
  );
}
