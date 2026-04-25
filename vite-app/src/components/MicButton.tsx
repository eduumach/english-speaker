import { cn } from "@/lib/utils"
import { Mic, MicOff, Loader2 } from "lucide-react"
import type { ConnectionStatus } from "@/types"

function SpeakingDots() {
  return (
    <div className="flex items-end gap-2.5">
      <span className="h-3.5 w-3.5 rounded-full bg-white animate-[speakingDot_1s_ease-in-out_infinite]" />
      <span
        className="h-3.5 w-3.5 rounded-full bg-white animate-[speakingDot_1s_ease-in-out_infinite]"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-3.5 w-3.5 rounded-full bg-white animate-[speakingDot_1s_ease-in-out_infinite]"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  )
}

interface MicButtonProps {
  status: ConnectionStatus
  isMuted: boolean
  isTutorSpeaking?: boolean
  isUserSpeaking?: boolean
  onToggle: () => void
}

export function MicButton({
  status,
  isMuted,
  isTutorSpeaking,
  isUserSpeaking,
  onToggle,
}: MicButtonProps) {
  const isLive = status === "connected" && !isMuted
  const isConnecting = status === "connecting"
  void isUserSpeaking

  return (
    <div className="relative flex items-center justify-center">
      {(isLive || isUserSpeaking || isTutorSpeaking) && (
        <>
          <span className="absolute h-56 w-56 animate-ping rounded-full bg-blue-600/10" />
          <span className="absolute h-48 w-48 animate-pulse rounded-full bg-blue-600/15" />
        </>
      )}

      <button
        onClick={onToggle}
        disabled={isConnecting}
        aria-label={isLive ? "Mute microphone" : "Unmute microphone"}
        className={cn(
          "relative flex h-44 w-44 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300",
          status === "disconnected" && "bg-blue-600 text-white hover:scale-105",
          isConnecting && "bg-neutral-300 text-white cursor-wait",
          status === "connected" &&
            !isMuted &&
            "bg-blue-600 text-white hover:scale-105 active:scale-95",
          status === "connected" &&
            isMuted &&
            "bg-neutral-300 text-white hover:bg-neutral-400 active:scale-95",
          status === "error" && "bg-red-500 text-white hover:scale-105",
          isTutorSpeaking && "bg-blue-500 scale-105",
        )}
      >
        {isConnecting ? (
          <Loader2 className="h-12 w-12 animate-spin" />
        ) : isTutorSpeaking ? (
          <SpeakingDots />
        ) : isLive ? (
          <Mic className="h-14 w-14" strokeWidth={2.2} />
        ) : (
          <MicOff className="h-14 w-14" strokeWidth={2.2} />
        )}
      </button>
    </div>
  )
}
