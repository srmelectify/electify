"use client"

import { useSearchParams } from "next/navigation"
import { Info } from "lucide-react"

/** Shown on /login?expired=1 after a page found the session revoked. */
export function SessionEndedNotice() {
  const params = useSearchParams()
  if (params.get("expired") !== "1") return null
  return (
    <div role="status" className="mb-4 flex items-start gap-2.5 rounded-control border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-200">
      <Info className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
      <span>
        <strong>Single device policy:</strong> Your session was signed out because your account was logged in on another device (laptop or phone). Students are allowed only <strong>1 active device</strong> at a time.
      </span>
    </div>
  )
}
