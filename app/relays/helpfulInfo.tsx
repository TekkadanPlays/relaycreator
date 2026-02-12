"use client"
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IoRocketOutline, IoGlobeOutline, IoShieldCheckmarkOutline, IoFlashOutline, IoArrowForward } from "react-icons/io5";

export default function HelpfulInfo(props: React.PropsWithChildren<{}>) {
    const { data: session, status } = useSession();
    const siteName = process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com";

    const features = [
        {
            icon: <IoGlobeOutline className="w-6 h-6" />,
            title: "Decentralized Protocol",
            desc: "Nostr puts you in control. No algorithms, no censorship — just open communication through a network of relays."
        },
        {
            icon: <IoRocketOutline className="w-6 h-6" />,
            title: "Deploy in Minutes",
            desc: "Choose your plan, name your relay, and deploy. Fully managed infrastructure with zero DevOps required."
        },
        {
            icon: <IoShieldCheckmarkOutline className="w-6 h-6" />,
            title: "Your Rules",
            desc: "Public or private, open or invite-only. Configure allow lists, block lists, and moderation policies on the fly."
        },
        {
            icon: <IoFlashOutline className="w-6 h-6" />,
            title: "Lightning Payments",
            desc: "Pay with Bitcoin Lightning. Accept subscriptions from your community. No credit cards, no middlemen."
        },
    ];

    return (
        <div className="py-4">
            {/* Hero */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
                    <IoFlashOutline className="w-3.5 h-3.5" />
                    Powered by strfry &middot; Lightning-native
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-4">
                    Launch your Nostr relay
                    <br />
                    <span className="text-primary">in minutes, not months.</span>
                </h1>
                <p className="text-base-content/60 text-lg max-w-2xl mx-auto mb-8">
                    The fastest way to deploy managed Nostr relays. Full control over your community, powered by Lightning.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a href="/signup" className="btn btn-primary gap-2 px-6">
                        Create a Relay
                        <IoArrowForward className="w-4 h-4" />
                    </a>
                    <a href="/directory" className="btn btn-ghost gap-2">
                        Browse Directory
                    </a>
                </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {features.map((f) => (
                    <div key={f.title} className="group p-5 rounded-lg border border-base-300/50 bg-base-200/30 hover:bg-base-200/60 hover:border-base-300 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                            {f.icon}
                        </div>
                        <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                        <p className="text-xs text-base-content/60 leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}