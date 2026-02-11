import { HelpCircle, Radio, Shield, Zap, Users, Lock, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const relayTypes = [
  {
    icon: Users,
    title: "Community Relay",
    description:
      "A shared relay for a group of people. Uses pubkey allow-lists so only approved members can post. Great for friend groups, communities, or organizations.",
    color: "text-violet-400",
  },
  {
    icon: Lock,
    title: "Private Relay",
    description:
      "Like a community relay but with NIP-42 authentication required. Enhanced privacy for DMs and private groups. Read access is also restricted.",
    color: "text-emerald-400",
  },
  {
    icon: Zap,
    title: "Paid Public Relay",
    description:
      "Open to anyone who pays a Lightning fee. After payment, the user's pubkey is added to the allow list. A great way to reduce spam while keeping the relay open.",
    color: "text-amber-400",
  },
  {
    icon: Globe,
    title: "Free Public Relay",
    description:
      "Allows anyone to post freely. Not recommended unless you have a solid moderation team, as it can attract spam. Best paired with keyword and kind filters.",
    color: "text-sky-400",
  },
];

const faqs = [
  {
    q: "What is a Nostr relay?",
    a: "A Nostr relay is a server that stores and forwards events (messages, posts, reactions, etc.) between Nostr clients. Think of it like your own mail server for the Nostr protocol. Running your own relay gives you control over your data and who can participate.",
  },
  {
    q: "Do I need technical knowledge to run a relay?",
    a: "No! That's the whole point of this service. We handle all the server setup, configuration, and maintenance. You just pick your relay type, configure your settings through the dashboard, and we take care of the rest.",
  },
  {
    q: "What is NIP-42 authentication?",
    a: "NIP-42 is a Nostr protocol extension that requires clients to prove their identity before connecting to a relay. This is useful for private relays where you want to control who can read events, not just who can write them.",
  },
  {
    q: "What are access control lists (ACLs)?",
    a: "ACLs let you control who can post to your relay. You can allow or block specific pubkeys, filter by keywords, or restrict by event kinds. There are two modes: 'block by default' (only allow listed pubkeys) or 'allow by default' (block specific bad actors).",
  },
  {
    q: "What are streams?",
    a: "Streams let your relay sync events with other relays. You can configure upstream (send events to another relay), downstream (receive events from another relay), or bidirectional syncing. This is useful for relay federation and backup.",
  },
  {
    q: "Can I add moderators to my relay?",
    a: "Yes! You can add moderators by their Nostr pubkey. Moderators can edit access control lists and have posting access by default. Only the relay owner can add or remove moderators.",
  },
  {
    q: "How do Lightning payments work?",
    a: "When you enable Lightning payments, users must pay a configurable amount in sats to get their pubkey added to your relay's allow list. This is handled automatically — no manual approval needed.",
  },
  {
    q: "Can I delete my relay?",
    a: "Yes. You can delete your relay from the Settings page under the Danger Zone tab. This action is irreversible and will permanently remove your relay and all associated data.",
  },
  {
    q: "What does 'Allow Tagged Events' mean?",
    a: "When enabled, users outside your relay can send events that tag (mention) your relay's members. This lets non-members reply to or DM your members. Useful for keeping conversations flowing across the wider Nostr network.",
  },
];

export default function FAQ() {
  return (
    <div className="space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center justify-center gap-3">
          <HelpCircle className="size-7 text-primary" />
          FAQ & Relay Types
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Everything you need to know about running your own Nostr relay.
        </p>
      </div>

      {/* Relay Types */}
      <div>
        <h2 className="text-xl font-bold mb-4">Popular Relay Types</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {relayTypes.map((type) => (
            <Card key={type.title} className="transition-all hover:border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <type.icon className={`size-5 ${type.color}`} />
                  {type.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div>
        <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
