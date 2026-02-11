import { Link } from "react-router";
import { HelpCircle, Radio, Shield, Zap, Users, Lock, Globe, ArrowRight } from "lucide-react";
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
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "group-hover:border-violet-500/30",
  },
  {
    icon: Lock,
    title: "Private Relay",
    description:
      "Like a community relay but with NIP-42 authentication required. Enhanced privacy for DMs and private groups. Read access is also restricted.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "group-hover:border-emerald-500/30",
  },
  {
    icon: Zap,
    title: "Paid Public Relay",
    description:
      "Open to anyone who pays a Lightning fee. After payment, the user's pubkey is added to the allow list. A great way to reduce spam while keeping the relay open.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "group-hover:border-amber-500/30",
  },
  {
    icon: Globe,
    title: "Free Public Relay",
    description:
      "Allows anyone to post freely. Not recommended unless you have a solid moderation team, as it can attract spam. Best paired with keyword and kind filters.",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "group-hover:border-sky-500/30",
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
    <div className="space-y-16 pb-12 animate-fade-up">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
          <HelpCircle className="size-3.5" /> Knowledge Base
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          FAQ & <span className="text-gradient">Relay Types</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Everything you need to know about running your own Nostr relay.
        </p>
      </div>

      {/* Relay Types */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Popular Relay Configurations</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {relayTypes.map((type, i) => (
            <Card
              key={type.title}
              className={`group relative overflow-hidden border-border/30 bg-card/30 backdrop-blur-sm transition-all duration-500 hover:bg-card/60 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 ${type.border} animate-fade-up`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
              <CardContent className="relative p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl ${type.bg} p-2.5 transition-transform duration-300 group-hover:scale-110`}>
                    <type.icon className={`size-5 ${type.color}`} />
                  </div>
                  <h3 className="text-lg font-bold">{type.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <Card className="border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <CardContent className="p-1 sm:p-2">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-border/20 px-4">
                  <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors py-5">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 animate-fade-up">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent" />
        <div className="absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 px-8 py-14 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Ready to launch your relay?
          </h2>
          <p className="max-w-md text-muted-foreground">
            Pick a plan, choose a name, and be live in under a minute.
          </p>
          <Button size="lg" className="gap-2 px-8 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0 shadow-xl shadow-primary/25" asChild>
            <Link to="/signup">
              Get Started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
