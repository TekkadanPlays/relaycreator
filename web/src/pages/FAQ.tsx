import { Link } from "react-router";
import { Radio, Shield, Zap, Users, Lock, Globe, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  },
  {
    icon: Lock,
    title: "Private Relay",
    description:
      "Like a community relay but with NIP-42 authentication required. Enhanced privacy for DMs and private groups. Read access is also restricted.",
  },
  {
    icon: Zap,
    title: "Paid Public Relay",
    description:
      "Open to anyone who pays a Lightning fee. After payment, the user's pubkey is added to the allow list. A great way to reduce spam while keeping the relay open.",
  },
  {
    icon: Globe,
    title: "Free Public Relay",
    description:
      "Allows anyone to post freely. Not recommended unless you have a solid moderation team, as it can attract spam. Best paired with keyword and kind filters.",
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
  {
    q: "What is NIP-11 relay information?",
    a: "NIP-11 defines a standard way for relays to describe themselves. Your relay's profile — name, description, contact, supported NIPs — is served as a JSON document at your relay's URL. You can edit all of this from the General settings tab.",
  },
  {
    q: "Can I request payment from connecting clients?",
    a: "Yes. The Billing settings tab lets you enable 'Request Payment', which suggests a Lightning payment to any client that connects. You can also require payment for access, where users must pay before their pubkey is added to the allow list. Both amounts are configurable in sats.",
  },
];

export default function FAQ() {
  return (
    <div className="space-y-12 pb-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">FAQ & Relay Types</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you need to know about running your own Nostr relay.
        </p>
      </div>

      {/* Relay Types */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Popular Relay Configurations</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {relayTypes.map((type) => (
            <Card key={type.title} className="border-border/50 transition-colors hover:border-border">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <type.icon className="size-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">{type.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
        <Card>
          <CardContent className="p-1 sm:p-2">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="px-4">
                  <AccordionTrigger className="text-left font-medium py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="rounded-lg border border-border/50 bg-card p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Ready to launch your relay?</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Pick a plan, choose a name, and be live in under a minute.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button className="gap-2" asChild>
            <Link to="/signup">
              Get Started <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/directory">
              <Globe className="size-4" /> Browse Directory
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
