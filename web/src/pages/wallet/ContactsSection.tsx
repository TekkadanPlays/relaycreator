import { type CoinosContact } from "../../lib/coinos";
import ContactRow from "./ContactRow";
import { Users } from "lucide-react";

interface ContactsSectionProps {
  contacts: CoinosContact[];
  onSend: (username: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onTrust: (id: string, trusted: boolean) => void;
}

export default function ContactsSection({
  contacts,
  onSend,
  onPin,
  onTrust,
}: ContactsSectionProps) {
  const pinned = contacts.filter((c) => c.pinned);
  const unpinned = contacts.filter((c) => !c.pinned);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Contacts</h2>
        <p className="text-sm text-muted-foreground">
          People you've transacted with. Pin favorites and mark trusted contacts.
        </p>
      </div>

      {contacts.length > 0 ? (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wider">
                Pinned
              </p>
              <div className="space-y-0.5">
                {pinned.map((c) => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    onSend={onSend}
                    onPin={onPin}
                    onTrust={onTrust}
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            {pinned.length > 0 && (
              <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wider">
                All Contacts
              </p>
            )}
            <div className="space-y-0.5">
              {unpinned.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  onSend={onSend}
                  onPin={onPin}
                  onTrust={onTrust}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Users className="size-6 text-muted-foreground/40" />
          </div>
          <p className="font-medium">No contacts yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Contacts appear automatically when you send or receive payments.
          </p>
        </div>
      )}
    </div>
  );
}
