import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import DisableSW from "@/components/disable-sw"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DisableSW /> {/* ← unregister Service Workers in the preview */}
        {children}
      </body>
    </html>
  )
}
