import { useNostrProfile } from "../hooks/useNostrProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface NostrIdentityProps {
  pubkey: string;
  fallbackName?: string | null;
  size?: "xs" | "sm" | "md";
  showPubkey?: boolean;
  className?: string;
}

/**
 * Displays a Nostr user identity: profile picture orb + display name.
 * Falls back to truncated pubkey if no profile is found.
 */
export function NostrIdentity({
  pubkey,
  fallbackName,
  size = "sm",
  showPubkey = false,
  className,
}: NostrIdentityProps) {
  const { profile, displayName, loading } = useNostrProfile(pubkey);
  const picture = profile?.picture;
  const name = displayName || fallbackName || pubkey.slice(0, 12) + "...";
  const initials = (displayName || fallbackName || pubkey.slice(0, 2)).slice(0, 2).toUpperCase();

  const avatarSize = size === "xs" ? "size-5" : size === "sm" ? "size-6" : "size-8";
  const textSize = size === "xs" ? "text-[11px]" : size === "sm" ? "text-xs" : "text-sm";
  const subTextSize = size === "xs" ? "text-[9px]" : size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <Avatar className={cn(avatarSize, "shrink-0")}>
        {picture && <AvatarImage src={picture} alt={name} />}
        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
          {loading ? <Loader2 className="size-3 animate-spin" /> : initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn(textSize, "font-medium truncate")}>{name}</p>
        {showPubkey && (
          <p className={cn(subTextSize, "font-mono text-muted-foreground truncate")}>
            {pubkey.slice(0, 16)}...
          </p>
        )}
      </div>
    </div>
  );
}
