import { useMemo, useState } from "react"
import { useVoiceChat } from "@/hooks/useVoiceChat"
import { useProgress } from "@/hooks/useProgress"
import { MicButton } from "@/components/MicButton"
import { ConnectionDialog } from "@/components/ConnectionDialog"
import { SessionSheet } from "@/components/SessionSheet"
import { GoalPill } from "@/components/GoalPill"
import { GraduationCap } from "lucide-react"

export function App() {
  const {
    status,
    isMuted,
    isTutorSpeaking,
    isUserSpeaking,
    messages,
    sessionInfo,
    scenes,
    mistakes,
    url,
    token,
    connect,
    disconnect,
    toggleMic,
  } = useVoiceChat()

  const progress = useProgress()
  const [sheetOpen, setSheetOpen] = useState(false)

  const lastTutorMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tutor") return messages[i].text
    }
    return ""
  }, [messages])

  return (
    <div className="relative flex h-screen flex-col bg-white text-neutral-900 overflow-hidden">
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
        <ConnectionDialog
          defaultUrl={url}
          defaultToken={token}
          onConnect={connect}
          isConnecting={status === "connecting"}
        />
        <button
          onClick={() => setSheetOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
          aria-label="Learning journey"
        >
          <GraduationCap className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-12 sm:pt-10">
        <GoalPill
          path={progress.path ?? null}
          fallbackTopic={sessionInfo?.topic}
          onClick={() => setSheetOpen(true)}
        />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <p className="mb-5 select-none text-base italic text-neutral-700">
          {status === "connected" && !isMuted ? "Tap to mute" : "Tap to speak"}
        </p>

        <MicButton
          status={status}
          isMuted={isMuted}
          isTutorSpeaking={isTutorSpeaking}
          isUserSpeaking={isUserSpeaking}
          onToggle={toggleMic}
        />

        <div className="mt-10 flex min-h-[6rem] max-w-md items-center justify-center text-center">
          {lastTutorMessage ? (
            <p className="text-2xl italic leading-snug text-blue-600">
              {lastTutorMessage}
            </p>
          ) : (
            <p className="text-base text-neutral-400">
              {status === "connecting"
                ? "Connecting to your tutor…"
                : "Tap the circle to begin"}
            </p>
          )}
        </div>
      </main>

      <div className="flex flex-col items-center gap-1.5 pb-10">
        <span className="text-xs text-neutral-500">
          {status === "connected" ? "Session in progress" : "Not connected"}
        </span>
        <button
          onClick={disconnect}
          disabled={status !== "connected"}
          className="rounded-full bg-neutral-100 px-8 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          End Conversation
        </button>
      </div>

      <SessionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        sessionInfo={sessionInfo}
        scenes={scenes}
        mistakes={mistakes}
        messages={messages}
        progress={progress}
      />
    </div>
  )
}

export default App
