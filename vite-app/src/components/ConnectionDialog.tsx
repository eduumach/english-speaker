import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Settings, Link, Key } from "lucide-react"

interface ConnectionDialogProps {
  defaultUrl: string
  defaultToken: string
  onConnect: (url: string, token: string) => void
  isConnecting: boolean
}

export function ConnectionDialog({
  defaultUrl,
  defaultToken,
  onConnect,
  isConnecting,
}: ConnectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(defaultUrl)
  const [token, setToken] = useState(defaultToken)

  const handleConnect = () => {
    onConnect(url, token)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to LiveKit</DialogTitle>
          <DialogDescription>
            Enter your LiveKit server URL and access token to start the session.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lk-url" className="flex items-center gap-1.5 text-xs">
              <Link className="h-3 w-3" />
              Server URL
            </Label>
            <Input
              id="lk-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://localhost:7880"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lk-token" className="flex items-center gap-1.5 text-xs">
              <Key className="h-3 w-3" />
              Access Token
            </Label>
            <Input
              id="lk-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your LiveKit access token"
            />
          </div>
          <Button
            onClick={handleConnect}
            disabled={isConnecting || !url || !token}
            className="w-full"
          >
            {isConnecting ? "Connecting…" : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
