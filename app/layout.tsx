import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import DisableSW from "@/components/disable-sw";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Elementara Card Game",
  description: "A digital card game experience.",
  generator: "v0.dev",
  manifest: "/manifest.json", // Link to your web app manifest
  themeColor: "#000000", // Define the theme color for the browser UI
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Elementara",
    startupImage: [
      "/icons/apple-touch-icon.png", // Example for startup image
    ],
  },
  icons: {
    apple: "/icons/apple-touch-icon.png", // Apple touch icon
  },
};

import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSans.className} bg-black/50`}>
        <Suspense fallback={null}>
          <DisableSW /> {/* ← unregister Service Workers in the preview */}
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
