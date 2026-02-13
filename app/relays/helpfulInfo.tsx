"use client"
import { useSession } from 'next-auth/react';
import { IoRocketOutline, IoGlobeOutline, IoShieldCheckmarkOutline, IoFlashOutline, IoArrowForward } from "react-icons/io5";

export default function HelpfulInfo(props: React.PropsWithChildren<{}>) {
    const { data: session, status } = useSession();

    const features = [
        {
            icon: <IoGlobeOutline className="w-5 h-5" />,
            title: "Decentralized",
            desc: "No algorithms, no censorship. Open communication through your own relay."
        },
        {
            icon: <IoRocketOutline className="w-5 h-5" />,
            title: "Deploy in minutes",
            desc: "Name it, pay with Lightning, and you're live. Zero DevOps."
        },
        {
            icon: <IoShieldCheckmarkOutline className="w-5 h-5" />,
            title: "Your rules",
            desc: "Allow lists, block lists, keyword filters, NIP-42 auth. Full control."
        },
        {
            icon: <IoFlashOutline className="w-5 h-5" />,
            title: "Lightning-native",
            desc: "Pay with sats. Accept subscriptions from your community."
        },
    ];

    return (
        <div>
            {/* Hero */}
            <div className="text-center mb-10">
                <p className="text-xs font-medium tracking-wide uppercase text-base-content/40 mb-3">
                    Managed Nostr Relays &middot; Powered by strfry
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                    Launch your relay <span className="text-primary">in minutes</span>
                </h1>
                <p className="text-sm text-base-content/50 max-w-lg mx-auto mb-6">
                    Full control over access, moderation, and your community. No servers to manage.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <a
                        href="/signup"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-content hover:bg-primary/90 transition-colors"
                    >
                        Create a Relay
                        <IoArrowForward className="w-3.5 h-3.5" />
                    </a>
                    <a
                        href="/directory"
                        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-base-content/60 hover:text-base-content border border-base-300/60 hover:border-base-300 transition-colors"
                    >
                        Browse Directory
                    </a>
                </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {features.map((f) => (
                    <div key={f.title} className="p-4 rounded-lg border border-base-300/40 bg-base-200/20">
                        <div className="text-primary mb-2.5">{f.icon}</div>
                        <h3 className="font-medium text-sm mb-1">{f.title}</h3>
                        <p className="text-xs text-base-content/50 leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}