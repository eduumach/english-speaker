import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sparkles, User } from "lucide-react"

interface ChatBubbleProps {
  role: "tutor" | "user"
  text: string
  category?: string
}

export function ChatBubble({ role, text, category }: ChatBubbleProps) {
  const isTutor = role === "tutor"

  return (
    <div
      className={cn(
        "flex gap-3 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isTutor ? "flex-row" : "flex-row-reverse",
      )}
    >
      <Avatar
        className={cn(
          "h-9 w-9 shrink-0 ring-2 ring-background",
          isTutor
            ? "bg-gradient-to-br from-cyan-400 to-cyan-600"
            : "bg-gradient-to-br from-emerald-400 to-emerald-600",
        )}
      >
        <AvatarFallback className="text-white">
          {isTutor ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isTutor
            ? "bg-card border shadow-sm rounded-tl-sm"
            : "bg-gradient-to-br from-cyan-600 to-cyan-500 text-white rounded-tr-sm shadow-md",
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {text}
        </p>
        {category && isTutor && (
          <Badge variant="secondary" className="mt-2 text-[10px] font-normal">
            {category}
          </Badge>
        )}
      </div>
    </div>
  )
}
