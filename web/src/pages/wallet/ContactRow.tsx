import { type CoinosContact } from "../../lib/coinos";
import { useNostrProfile } from "../../hooks/useNostrProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Pin,
  PinOff,
  ShieldCheck,
  ShieldOff,
  Send,
} from "lucide-react";

interface ContactRowProps {
  contact: CoinosContact;
  onSend: (username: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onTrust: (id: string, trusted: boolean) => void;
}

export default function ContactRow({ contact: c, onSend, onPin, onTrust }: ContactRowProps) {
  const { profile, displayName } = useNostrProfile(c.pubkey || undefined);
  const picture = profile?.picture || c.picture;
  const name = displayName || c.username;

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors">
      <Avatar className="size-9 shrink-0">
        {picture && <AvatarImage src={picture} alt={name} />}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
          {name[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <button
        onClick={() => onSend(c.username)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{name}</p>
          {displayName && displayName !== c.username && (
            <span className="text-[10px] text-muted-foreground">@{c.username}</span>
          )}
          {c.pinned && <Pin className="size-3 text-primary" />}
          {c.trusted && <ShieldCheck className="size-3 text-emerald-500" />}
        </div>
        {c.npub && <p className="text-xs text-muted-foreground truncate">{c.npub.slice(0, 20)}...</p>}
      </button>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onPin(c.id, !!c.pinned); }}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            c.pinned ? "text-primary hover:text-primary/70" : "text-muted-foreground/40 hover:text-primary"
          )}
          title={c.pinned ? "Unpin" : "Pin"}
        >
          {c.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onTrust(c.id, !!c.trusted); }}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            c.trusted ? "text-emerald-500 hover:text-emerald-500/70" : "text-muted-foreground/40 hover:text-emerald-500"
          )}
          title={c.trusted ? "Untrust" : "Trust"}
        >
          {c.trusted ? <ShieldOff className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
        </button>
        <button
          onClick={() => onSend(c.username)}
          className="rounded-md p-1.5 text-muted-foreground/40 hover:text-blue-500 transition-colors"
          title="Send"
        >
          <Send className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
