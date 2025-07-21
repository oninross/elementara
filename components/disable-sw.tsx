"use client"

import { useEffect } from "react"

/**
 * Unregister every Service Worker (preview only).
 */
export default function DisableSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {
          /* ignore */
        })
    }
  }, [])

  return null
}
