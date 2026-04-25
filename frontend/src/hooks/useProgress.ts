import { useState, useEffect, useCallback, useRef } from "react"
import type { ProgressData } from "@/types"

const POLL_INTERVAL = 5000

async function fetchProgress(): Promise<ProgressData | null> {
  try {
    const res = await fetch("/api/progress")
    if (res.ok) return res.json()
  } catch {}
  return null
}

export function useProgress() {
  const [data, setData] = useState<ProgressData | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    const result = await fetchProgress()
    if (result) setData(result)
  }, [])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  return { ...data, refetch: load }
}
