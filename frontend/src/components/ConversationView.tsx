import { useEffect, useRef } from "react"
import { ChatBubble } from "@/components/ChatBubble"
import { Sparkles, Volume2, Ear } from "lucide-react"
import type { ChatMessage } from "@/types"

interface ConversationViewProps {
  messages: ChatMessage[]
  isConnecting: boolean
  isTutorSpeaking: boolean
  isUserSpeaking: boolean
}

export function ConversationView({
  messages,
  isConnecting,
  isTutorSpeaking,
  isUserSpeaking,
}: ConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0 && !isTutorSpeaking) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200">
            <Sparkles className="h-7 w-7 text-cyan-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Your English Tutor</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tap the microphone to start practicing English with your AI
              tutor. It will guide you through fun, interactive scenes.
            </p>
          </div>
          {isConnecting ? (
            <p className="text-xs text-muted-foreground animate-pulse">
              Connecting to your tutor…
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ready when you are
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            role={msg.role}
            text={msg.text}
            category={msg.category}
          />
        ))}

        {isTutorSpeaking && (
          <div className="flex items-center gap-2 text-sm text-cyan-600 animate-in fade-in slide-in-from-bottom-2 duration-300 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600">
              <Volume2 className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-card border px-4 py-3 shadow-sm">
              <span className="text-muted-foreground">Speaking</span>
              <span className="flex gap-0.5">
                <span className="h-2 w-0.5 animate-bounce rounded-full bg-cyan-500 [animation-delay:0ms]" />
                <span className="h-3 w-0.5 animate-bounce rounded-full bg-cyan-500 [animation-delay:150ms]" />
                <span className="h-2 w-0.5 animate-bounce rounded-full bg-cyan-500 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {isUserSpeaking && !isTutorSpeaking && (
          <div className="flex flex-row-reverse items-center gap-2 text-sm text-emerald-600 animate-in fade-in slide-in-from-bottom-2 duration-300 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600">
              <Ear className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tr-sm bg-emerald-600 text-white px-4 py-3 shadow-md">
              <span>Listening</span>
              <span className="flex gap-0.5">
                <span className="h-2 w-0.5 animate-bounce rounded-full bg-white/70 [animation-delay:0ms]" />
                <span className="h-3 w-0.5 animate-bounce rounded-full bg-white [animation-delay:150ms]" />
                <span className="h-2 w-0.5 animate-bounce rounded-full bg-white/70 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
