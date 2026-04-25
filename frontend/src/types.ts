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

export interface Lesson {
  title: string
  description: string
  module_idx?: number
  lesson_idx?: number
  completed?: boolean
}

export interface PathModule {
  title: string
  description: string
  lessons: Lesson[]
}

export interface LearningPath {
  id: number
  title: string
  description: string
  modules: PathModule[]
  current_module_idx: number
  current_lesson_idx: number
  total_lessons: number
  completed_lessons: number
  progress_pct: number
}

export interface LevelAssessment {
  level: string
  reason: string
  assessed_at: string
}

export interface StudentProfile {
  name: string
  goals: string
  interests: string
  time_commitment: string
}

export interface ProgressData {
  profile: { level: string; total_sessions: number }
  student: StudentProfile | null
  path: LearningPath | null
  level_history: LevelAssessment[]
}
