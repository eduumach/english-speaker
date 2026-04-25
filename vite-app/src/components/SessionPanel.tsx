import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  GraduationCap,
  TrendingUp,
} from "lucide-react"
import type { SessionInfo, Scene, Mistake } from "@/types"

interface SessionPanelProps {
  sessionInfo: SessionInfo | null
  scenes: Scene[]
  mistakes: Mistake[]
}

const categoryColors: Record<string, string> = {
  grammar: "text-amber-600 bg-amber-50 border-amber-200",
  vocabulary: "text-blue-600 bg-blue-50 border-blue-200",
  pronunciation: "text-purple-600 bg-purple-50 border-purple-200",
  word_order: "text-rose-600 bg-rose-50 border-rose-200",
}

export function SessionPanel({ sessionInfo, scenes, mistakes }: SessionPanelProps) {
  if (!sessionInfo) {
    return (
      <Card className="h-full border-0 rounded-none bg-card/60 backdrop-blur-sm">
        <CardContent className="flex h-full items-center justify-center p-6">
          <div className="text-center space-y-2">
            <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Start a session to see details here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-0 rounded-none bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-cyan-500" />
          Session
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Topic</span>
            <span className="text-sm font-medium capitalize">
              {sessionInfo.topic}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Level</span>
            <Badge variant="outline" className="text-xs capitalize">
              {sessionInfo.level}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Sessions</span>
            <span className="text-sm font-medium">
              {sessionInfo.totalSessions}
            </span>
          </div>
        </div>
      </CardContent>

      {scenes.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="px-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-cyan-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Scenes
              </span>
            </div>
            <div className="space-y-2.5">
              {scenes.map((scene) => (
                <div
                  key={scene.idx}
                  className="flex items-start gap-2.5 text-sm"
                >
                  {scene.completed ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                  )}
                  <span
                    className={
                      scene.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }
                  >
                    {scene.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {mistakes.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Mistakes
              </span>
            </div>
            <ScrollArea className="h-48 pr-3">
              <div className="space-y-3">
                {mistakes.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-background/50 p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", categoryColors[m.category])}
                      >
                        {m.category.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs line-through text-muted-foreground">
                      {m.original}
                    </p>
                    <p className="text-xs font-medium text-emerald-600">
                      {m.correction}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </Card>
  )
}
