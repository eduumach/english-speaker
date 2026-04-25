export interface ChatMessage {
  id: string
  role: "tutor" | "user"
  text: string
  category?: string
  timestamp: number
}

export interface Mistake {
  original: string
  correction: string
  category: "grammar" | "vocabulary" | "pronunciation" | "word_order"
  explanation: string
}

export interface Scene {
  idx: number
  description: string
  completed: boolean
}

export interface SessionInfo {
  topic: string
  level: string
  totalSessions: number
  numScenes: number
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"
