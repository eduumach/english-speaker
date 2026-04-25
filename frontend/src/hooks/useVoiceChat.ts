import { useState, useCallback, useRef, useEffect } from "react"
import {
  Room,
  RoomEvent,
  ConnectionState,
  RemoteTrackPublication,
  Track,
} from "livekit-client"
import type {
  ChatMessage,
  SessionInfo,
  Scene,
  Mistake,
  ConnectionStatus,
} from "@/types"

const URL_KEY = "lk_url"
const TOKEN_KEY = "lk_token"

function statusFromState(state: ConnectionState): ConnectionStatus {
  switch (state) {
    case ConnectionState.Connected:
      return "connected"
    case ConnectionState.Connecting:
    case ConnectionState.Reconnecting:
      return "connecting"
    case ConnectionState.Disconnected:
    default:
      return "disconnected"
  }
}

async function fetchConfig(): Promise<{ livekit_url: string } | null> {
  try {
    const res = await fetch("/api/config")
    if (res.ok) return res.json()
  } catch {}
  return null
}

async function fetchToken(room: string, identity: string) {
  const res = await fetch(
    `/api/token?room=${encodeURIComponent(room)}&identity=${encodeURIComponent(identity)}`
  )
  if (!res.ok) throw new Error("Failed to fetch token")
  return res.json() as Promise<{ token: string; url: string }>
}

export function useVoiceChat() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [isMuted, setIsMuted] = useState(false)
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [url, setUrl] = useState(
    () => localStorage.getItem(URL_KEY) || "ws://localhost:7880"
  )
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || ""
  )
  const [roomName] = useState("tutor-room")
  const roomRef = useRef<Room | null>(null)
  const muteRef = useRef(false)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const addMessageRef = useRef<(msg: Omit<ChatMessage, "id" | "timestamp">) => void>(null!)
  const setActivityRef = useRef<(info: SessionInfo, scenes: Scene[]) => void>(null!)
  const addMistakeRef = useRef<(m: Mistake) => void>(null!)
  const setIsTutorSpeakingRef = useRef(setIsTutorSpeaking)
  const setIsUserSpeakingRef = useRef(setIsUserSpeaking)
  const tutorSpeakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userSpeakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setIsTutorSpeakingRef.current = setIsTutorSpeaking }, [setIsTutorSpeaking])
  useEffect(() => { setIsUserSpeakingRef.current = setIsUserSpeaking }, [setIsUserSpeaking])

  const setTutorSpeakingDebounced = useCallback((active: boolean) => {
    if (tutorSpeakingTimerRef.current) {
      clearTimeout(tutorSpeakingTimerRef.current)
      tutorSpeakingTimerRef.current = null
    }
    if (active) {
      setIsTutorSpeakingRef.current(true)
    } else {
      tutorSpeakingTimerRef.current = setTimeout(() => {
        setIsTutorSpeakingRef.current(false)
        tutorSpeakingTimerRef.current = null
      }, 800)
    }
  }, [])

  const setUserSpeakingDebounced = useCallback((active: boolean) => {
    if (userSpeakingTimerRef.current) {
      clearTimeout(userSpeakingTimerRef.current)
      userSpeakingTimerRef.current = null
    }
    if (active) {
      setIsUserSpeakingRef.current(true)
    } else {
      userSpeakingTimerRef.current = setTimeout(() => {
        setIsUserSpeakingRef.current(false)
        userSpeakingTimerRef.current = null
      }, 600)
    }
  }, [])

  const attachAudio = useCallback((pub: RemoteTrackPublication) => {
    if (pub.kind !== Track.Kind.Audio || !pub.track) return

    const existing = audioElementsRef.current.get(pub.trackSid)
    if (existing) return

    const stream = new MediaStream()
    stream.addTrack(pub.track.mediaStreamTrack)
    const audio = new Audio()
    audio.srcObject = stream
    audio.autoplay = true

    audio
      .play()
      .catch(() => {})

    audioElementsRef.current.set(pub.trackSid, audio)

    pub.on("unsubscribed", () => {
      setIsTutorSpeakingRef.current(false)
      audio.remove()
      audio.srcObject = null
      audioElementsRef.current.delete(pub.trackSid)
    })
  }, [])

  const setupRoomListeners = useCallback(
    (room: Room) => {
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setStatus(statusFromState(state))
      })

      room.on(RoomEvent.TrackSubscribed, (_track, pub, participant) => {
        if (participant.isLocal) return
        attachAudio(pub)
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setUserSpeakingDebounced(speakers.some((p) => p.isLocal))
        setTutorSpeakingDebounced(speakers.some((p) => !p.isLocal))
      })

      room.on(RoomEvent.DataReceived, (data, _participant) => {
        try {
          const input = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
          const text = new TextDecoder().decode(input)
          const msg = JSON.parse(text)
          switch (msg.type) {
            case "user":
            case "tutor":
              addMessageRef.current?.({ role: msg.type, text: msg.text })
              break
            case "activity":
              setActivityRef.current?.(msg.info, msg.scenes)
              break
            case "mistake":
              addMistakeRef.current?.(msg.mistake)
              break
          }
        } catch {}
      })

      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          attachAudio(pub as RemoteTrackPublication)
        })
      })
    },
    [attachAudio, setTutorSpeakingDebounced, setUserSpeakingDebounced],
  )

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const autoConnect = async () => {
      const config = await fetchConfig()
      if (cancelled) return

      let resolvedUrl = url
      let resolvedToken = token

      if (config?.livekit_url) {
        resolvedUrl = config.livekit_url
        setUrl(resolvedUrl)
        localStorage.setItem(URL_KEY, resolvedUrl)
      }

      if (!resolvedToken) {
        try {
          const data = await fetchToken(roomName, "student")
          resolvedToken = data.token
          resolvedUrl = data.url
          setToken(resolvedToken)
          setUrl(resolvedUrl)
          localStorage.setItem(TOKEN_KEY, resolvedToken)
          localStorage.setItem(URL_KEY, resolvedUrl)
        } catch {
          return
        }
      }

      if (cancelled) return

      roomRef.current?.disconnect()
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room

      setupRoomListeners(room)

      setStatus("connecting")

      try {
        await room.connect(resolvedUrl, resolvedToken)
        setIsMuted(false)
        muteRef.current = false
        room.localParticipant.setMicrophoneEnabled(true)
      } catch {
        if (!cancelled) setStatus("error")
      }
    }

    autoConnect()

    return () => {
      cancelled = true
    }
  }, [])

  const connect = useCallback(
    async (overrideUrl: string, overrideToken: string) => {
      const connectUrl = overrideUrl || url
      const connectToken = overrideToken || token

      localStorage.setItem(URL_KEY, connectUrl)
      localStorage.setItem(TOKEN_KEY, connectToken)
      setUrl(connectUrl)
      setToken(connectToken)

      roomRef.current?.disconnect()

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })
      roomRef.current = room

      setupRoomListeners(room)

      setStatus("connecting")

      try {
        await room.connect(connectUrl, connectToken)
        setIsMuted(false)
        muteRef.current = false
        room.localParticipant.setMicrophoneEnabled(true)
      } catch {
        setStatus("error")
      }
    },
    [url, token],
  )

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect()
    setStatus("disconnected")
  }, [])

  const toggleMic = useCallback(() => {
    if (status === "disconnected" || status === "error") {
      connect(url, token)
      return
    }

    muteRef.current = !muteRef.current
    setIsMuted(muteRef.current)
    roomRef.current?.localParticipant.setMicrophoneEnabled(
      !muteRef.current,
    )
  }, [status, url, token, connect])

  const addMessage = useCallback(
    (msg: Omit<ChatMessage, "id" | "timestamp">) => {
      setMessages((prev) => [
        ...prev,
        { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
      ])
    },
    [],
  )

  const setActivity = useCallback(
    (info: SessionInfo, sceneList: Scene[]) => {
      setSessionInfo(info)
      setScenes(sceneList)
    },
    [],
  )

  const addMistake = useCallback((m: Mistake) => {
    setMistakes((prev) => [m, ...prev])
  }, [])

  useEffect(() => { addMessageRef.current = addMessage }, [addMessage])
  useEffect(() => { setActivityRef.current = setActivity }, [setActivity])
  useEffect(() => { addMistakeRef.current = addMistake }, [addMistake])

  return {
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
    addMessage,
    setActivity,
    addMistake,
  }
}
