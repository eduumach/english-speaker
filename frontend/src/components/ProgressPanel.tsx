import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, ChevronRight, GraduationCap, TrendingUp, Clock, Target } from "lucide-react"
import type { LearningPath, LevelAssessment, StudentProfile, PathModule } from "@/types"

interface ProgressPanelProps {
  path: LearningPath | null
  level: string
  totalSessions: number
  student: StudentProfile | null
  levelHistory: LevelAssessment[]
}

export function ProgressPanel({ path, level, totalSessions, student, levelHistory }: ProgressPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-5 space-y-6">
      {student && (
        <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-900">Welcome back, {student.name}!</p>
          <div className="flex flex-wrap gap-2 text-xs text-blue-700">
            {student.goals && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5">
                <Target className="h-3 w-3" />
                {student.goals}
              </span>
            )}
            {student.time_commitment && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5">
                <Clock className="h-3 w-3" />
                {student.time_commitment}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-neutral-50 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Level</p>
          <p className="mt-0.5 text-lg font-bold text-blue-600">{level}</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Sessions</p>
          <p className="mt-0.5 text-lg font-bold text-neutral-900">{totalSessions}</p>
        </div>
      </section>

      {levelHistory.length > 1 && (
        <section>
          <SectionTitle icon={<TrendingUp className="h-4 w-4" />} label="Level progress" />
          <div className="mt-2 space-y-1">
            {levelHistory.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-neutral-500">
                <GraduationCap className="h-3 w-3 shrink-0 text-blue-400" />
                <span className="font-semibold text-blue-600">{a.level}</span>
                <span className="truncate">{a.reason}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {path && (
        <section>
          <SectionTitle label="Learning path" />
          <div className="mt-2 mb-3 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${path.progress_pct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-neutral-500">{path.progress_pct}%</span>
          </div>

          <div className="space-y-2">
            {path.modules.map((mod, mi) => (
              <ModuleCard
                key={mi}
                module={mod}
                index={mi}
                isCurrent={mi === path.current_module_idx}
              />
            ))}
          </div>
        </section>
      )}

      {!student && !path && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
          <GraduationCap className="h-10 w-10 text-neutral-300" />
          <p className="text-sm text-neutral-400">Start a session to begin your learning journey!</p>
        </div>
      )}
    </div>
  )
}

function ModuleCard({ module, index, isCurrent }: { module: PathModule; index: number; isCurrent: boolean }) {
  const completed = module.lessons.filter((l) => l.completed).length
  const total = module.lessons.length

  return (
    <details className={cn("group rounded-xl border transition", isCurrent ? "border-blue-200 bg-blue-50/40" : "border-neutral-200")}>
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium text-neutral-800">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400 transition group-open:rotate-90" />
        <span className="flex-1">{module.title}</span>
        <span className="text-xs text-neutral-400">{completed}/{total}</span>
      </summary>
      <div className="border-t border-inherit px-3 py-2 space-y-1.5">
        {module.lessons.map((lesson, li) => (
          <div key={li} className="flex items-start gap-2 text-xs">
            {lesson.completed ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-300" />
            )}
            <span className={lesson.completed ? "text-neutral-400 line-through" : "text-neutral-700"}>
              {lesson.title}
            </span>
          </div>
        ))}
      </div>
    </details>
  )
}

function SectionTitle({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
      {icon}
      {label}
    </div>
  )
}
