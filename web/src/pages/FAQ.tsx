import { Link } from "react-router";
import {
  Radio, Shield, Zap, Users, Lock, Globe, ArrowRight,
  ExternalLink, Database, Server, Network, Cpu,
} from "lucide-react";
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
    desc: "Pubkey allow-lists for approved members. Great for friend groups, communities, or organizations.",
  },
  {
    icon: Lock,
    title: "Private Relay",
    desc: "NIP-42 authentication required. Enhanced privacy for DMs and private groups. Read access is also restricted.",
  },
  {
    icon: Zap,
    title: "Paid Public Relay",
    desc: "Lightning paywall — users pay, get auto-added to the allow list. Reduces spam while keeping the relay open.",
  },
  {
    icon: Globe,
    title: "Free Public Relay",
    desc: "Open to all. Best paired with keyword and kind filters and a solid moderation team.",
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
    q: "Can I request payment from connecting clients?",
    a: "Yes. The Billing settings tab lets you enable 'Request Payment', which suggests a Lightning payment to any client that connects. You can also require payment for access, where users must pay before their pubkey is added to the allow list. Both amounts are configurable in sats.",
  },
  {
    q: "What is NIP-11 relay information?",
    a: "NIP-11 defines a standard way for relays to describe themselves. Your relay's profile — name, description, contact, supported NIPs — is served as a JSON document at your relay's URL. You can edit all of this from the General settings tab.",
  },
  {
    q: "What does 'Allow Tagged Events' mean?",
    a: "When enabled, users outside your relay can send events that tag (mention) your relay's members. This lets non-members reply to or DM your members. Useful for keeping conversations flowing across the wider Nostr network.",
  },
  {
    q: "Can I delete my relay?",
    a: "Yes. You can delete your relay from the Settings page under the Danger Zone tab. This action is irreversible and will permanently remove your relay and all associated data.",
  },
];

const stack = [
  {
    name: "strfry",
    desc: "High-performance Nostr relay written in C++. The engine behind every relay on this platform.",
    url: "https://github.com/hoytech/strfry",
  },
  {
    name: "Nostr Protocol",
    desc: "Simple, open protocol for decentralized, censorship-resistant social networking.",
    url: "https://github.com/nostr-protocol/nostr",
  },
  {
    name: "CoinOS",
    desc: "Open-source Bitcoin Lightning wallet. Powers the integrated payment and banking features.",
    url: "https://github.com/coinos/coinos-server",
  },
  {
    name: "Core Lightning",
    desc: "Lightning Network implementation by Blockstream. The backbone of our Lightning payment infrastructure.",
    url: "https://github.com/ElementsProject/lightning",
  },
  {
    name: "HAProxy",
    desc: "High-availability load balancer and reverse proxy. Handles TLS termination, HTTP/2, rate limiting, and routing.",
    url: "https://github.com/haproxy/haproxy",
  },
  {
    name: "MariaDB",
    desc: "Community-developed relational database. Stores relay configurations, user accounts, and platform state.",
    url: "https://github.com/MariaDB/server",
  },
  {
    name: "systemd-nspawn",
    desc: "Lightweight Linux container manager. Each relay runs in its own isolated container for security and resource control.",
    url: "https://www.freedesktop.org/software/systemd/man/latest/systemd-nspawn.html",
  },
  {
    name: "Prisma",
    desc: "Type-safe ORM for Node.js and TypeScript. Manages database schema and queries.",
    url: "https://github.com/prisma/prisma",
  },
  {
    name: "React",
    desc: "UI library for building the web interface. Combined with Vite, Tailwind CSS, and shadcn/ui.",
    url: "https://github.com/facebook/react",
  },
  {
    name: "nostr-tools",
    desc: "TypeScript library for Nostr protocol operations — event signing, relay communication, NIP implementations.",
    url: "https://github.com/nbd-wtf/nostr-tools",
  },
];

export default function FAQ() {
  return (
    <div className="space-y-16 pb-12 animate-in">
      {/* Header */}
      <section className="pt-6 sm:pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Learn & <span className="text-gradient">Explore</span>
        </h1>
        <p className="mt-2 text-muted-foreground max-w-lg">
          Everything you need to know about running your own Nostr relay, the technology behind the platform, and the open-source projects that make it possible.
        </p>
      </section>

      {/* Relay Configurations */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Relay Configurations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the setup that fits your community.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {relayTypes.map((type) => (
            <div key={type.title} className="flex gap-3 rounded-lg border border-border/30 p-4 hover:border-border/60 transition-colors">
              <div className="rounded-md bg-primary/10 p-2 h-fit shrink-0">
                <type.icon className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{type.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{type.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Common questions about relays, access control, payments, and more.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Stack Credits */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">The Stack</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            relay.tools is built on battle-tested open-source software. Every component is free and auditable.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {stack.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-border/30 p-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{item.name}</h3>
                  <ExternalLink className="size-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </a>
          ))}
        </div>
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
