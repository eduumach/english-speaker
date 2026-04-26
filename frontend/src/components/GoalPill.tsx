import type { LearningPath } from "@/types"

interface GoalPillProps {
  path: LearningPath | null | undefined
  fallbackTopic?: string
  onClick?: () => void
}

export function GoalPill({ path, fallbackTopic, onClick }: GoalPillProps) {
  const wrapperClass =
    "mx-auto block w-full max-w-2xl text-left rounded-3xl bg-white px-6 py-4 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition hover:ring-blue-200"

  if (!path || path.modules.length === 0) {
    return (
      <button type="button" onClick={onClick} className={wrapperClass}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
          Lesson
        </p>
        <p className="mt-1 text-base font-semibold leading-snug text-neutral-900 sm:text-lg">
          <span className="capitalize">{fallbackTopic ?? "Free conversation"}</span>
        </p>
      </button>
    )
  }

  const currentModule = path.modules[path.current_module_idx] ?? path.modules[path.modules.length - 1]
  const currentLesson =
    currentModule?.lessons[path.current_lesson_idx] ??
    currentModule?.lessons[currentModule.lessons.length - 1]

  return (
    <button type="button" onClick={onClick} className={wrapperClass}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-blue-600">
          {currentModule?.title ?? path.title}
        </p>
        <span className="shrink-0 text-[10px] font-medium text-neutral-400">
          {path.completed_lessons}/{path.total_lessons}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-neutral-900 sm:text-lg">
        {currentLesson?.title ?? path.title}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${path.progress_pct}%` }}
        />
      </div>
    </button>
  )
}
