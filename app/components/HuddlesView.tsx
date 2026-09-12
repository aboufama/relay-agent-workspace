import { useState } from "react";
import { Headphones, Mic, MicOff, Plus, Video, VideoOff, PhoneOff, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/buzz/PageHeader";
export function HuddlesView() {
  const [rooms, setRooms] = useState(["engineering-release", "horizon-validation"]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(false);
  return (
    <div className="view-content">
      <div className="page huddles-page">
        <PageHeader
          className="page-heading"
          title="Huddles"
          action={
            <button className="btn btn-secondary" onClick={() => setAdding((v) => !v)}>
              <Plus size={16} />
              New room
            </button>
          }
        />
        {adding && (
          <form
            className="huddle-create"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setRooms((r) => [...r, name.trim()]);
              setName("");
              setAdding(false);
            }}
          >
            <input
              className="input"
              aria-label="Room name"
              placeholder="Room name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button className="btn btn-primary" type="submit">
              Create
            </button>
            <button
              className="icon-btn"
              type="button"
              aria-label="Cancel new room"
              onClick={() => setAdding(false)}
            >
              <X size={16} />
            </button>
          </form>
        )}
        <div className="huddle-list">
          {rooms.map((room, index) => (
            <div className="huddle-list-row" key={`${room}-${index}`}>
              <Headphones size={19} />
              <div>
                <strong>{room}</strong>
                <span>Voice not connected</span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setActive(room);
                  setMuted(false);
                  setCamera(false);
                }}
              >
                Open room
              </button>
            </div>
          ))}
        </div>
        <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
          <DialogContent className="huddle-session">
            <DialogHeader>
              <DialogTitle>
                <Headphones size={18} />
                {active}
              </DialogTitle>
            </DialogHeader>
            <div className="huddle-session-status">Voice not connected</div>
            <div className="huddle-participant-tile">
              <span className="avatar">YO</span>
              <strong>You</strong>
              {muted && <MicOff size={15} />}
              <span>{camera ? "Camera requested" : "Camera off"}</span>
            </div>
            <div className="huddle-controls">
              <button
                className="btn btn-secondary"
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                aria-pressed={muted}
                onClick={() => setMuted((v) => !v)}
              >
                {muted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                className="btn btn-secondary"
                aria-label={camera ? "Turn camera off" : "Turn camera on"}
                aria-pressed={camera}
                onClick={() => setCamera((v) => !v)}
              >
                {camera ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <span className="badge">
                <Users size={13} />1
              </span>
              <button className="btn btn-primary" onClick={() => setActive(null)}>
                <PhoneOff size={17} />
                Leave
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
