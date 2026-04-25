import { useState } from "react"
import { cn } from "@/lib/utils"
import { useProgress } from "@/hooks/useProgress"
import { ProgressPanel } from "@/components/ProgressPanel"
import { X, CheckCircle2, Circle, BookOpen, TrendingUp, MessageCircle } from "lucide-react"
import type { SessionInfo, Scene, Mistake, ChatMessage } from "@/types"

interface SessionSheetProps {
  open: boolean
  onClose: () => void
  sessionInfo: SessionInfo | null
  scenes: Scene[]
  mistakes: Mistake[]
  messages: ChatMessage[]
}

type Tab = "session" | "progress"

const categoryColors: Record<string, string> = {
  grammar: "bg-amber-50 text-amber-700 ring-amber-200",
  vocabulary: "bg-blue-50 text-blue-700 ring-blue-200",
  pronunciation: "bg-purple-50 text-purple-700 ring-purple-200",
  word_order: "bg-rose-50 text-rose-700 ring-rose-200",
}

export function SessionSheet({
  open,
  onClose,
  sessionInfo,
  scenes,
  mistakes,
  messages,
}: SessionSheetProps) {
  const [tab, setTab] = useState<Tab>("session")
  const progress = useProgress()

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab("session")}
              className={cn(
                "text-sm font-medium transition",
                tab === "session" ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              Session
            </button>
            <button
              onClick={() => setTab("progress")}
              className={cn(
                "text-sm font-medium transition",
                tab === "progress" ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              Progress
            </button>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {tab === "session" && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {sessionInfo && (
              <section className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Topic" value={sessionInfo.topic} />
                <Stat label="Level" value={sessionInfo.level} />
                <Stat label="Sessions" value={String(sessionInfo.totalSessions)} />
              </section>
            )}

            {scenes.length > 0 && (
              <section>
                <SectionTitle icon={<BookOpen className="h-4 w-4" />} label="Scenes" />
                <ul className="mt-3 space-y-2.5">
                  {scenes.map((scene) => (
                    <li key={scene.idx} className="flex items-start gap-2.5 text-sm">
                      {scene.completed ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
                      )}
                      <span
                        className={
                          scene.completed
                            ? "text-neutral-400 line-through"
                            : "text-neutral-800"
                        }
                      >
                        {scene.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {mistakes.length > 0 && (
              <section>
                <SectionTitle
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Recent corrections"
                />
                <ul className="mt-3 space-y-2.5">
                  {mistakes.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-2xl border border-neutral-200 bg-white p-3 space-y-1.5"
                    >
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1",
                          categoryColors[m.category]
                        )}
                      >
                        {m.category.replace("_", " ")}
                      </span>
                      <p className="text-sm text-neutral-400 line-through">
                        {m.original}
                      </p>
                      <p className="text-sm font-medium text-emerald-600">
                        {m.correction}
                      </p>
                      {m.explanation && (
                        <p className="text-xs text-neutral-500">{m.explanation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {messages.length > 0 && (
              <section>
                <SectionTitle
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="Transcript"
                />
                <ul className="mt-3 space-y-2">
                  {messages.slice(-30).map((m) => (
                    <li
                      key={m.id}
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm",
                        m.role === "tutor"
                          ? "bg-blue-50 text-blue-900"
                          : "bg-neutral-100 text-neutral-800"
                      )}
                    >
                      {m.text}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!sessionInfo && scenes.length === 0 && mistakes.length === 0 && (
              <p className="text-center text-sm text-neutral-400 py-12">
                No session data yet. Tap the mic to start.
              </p>
            )}
          </div>
        )}

        {tab === "progress" && (
          <ProgressPanel
            path={progress.path}
            level={progress.profile?.level ?? "A1"}
            totalSessions={progress.profile?.total_sessions ?? 0}
            student={progress.student}
            levelHistory={progress.level_history ?? []}
          />
        )}
      </aside>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold capitalize text-neutral-900">
        {value}
      </p>
    </div>
  )
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
      {icon}
      {label}
    </div>
  )
}
