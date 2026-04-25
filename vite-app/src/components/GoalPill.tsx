interface GoalPillProps {
  lesson: string
}

export function GoalPill({ lesson }: GoalPillProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-white px-6 py-4 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
        <p className="text-base leading-snug text-neutral-900 sm:text-lg">
          <span className="font-bold">Lesson:</span>{" "}
          <span className="capitalize">{lesson}</span>
        </p>
      </div>
    </div>
  )
}
