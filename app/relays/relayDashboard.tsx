"use client";
import Link from "next/link";
import { IoRadio, IoFlashOutline, IoKeyOutline, IoGlobeOutline, IoArrowForward, IoAddCircleOutline } from "react-icons/io5";

export default function RelayDashboard() {

    const cards = [
        {
            href: "/relays/myrelays",
            icon: <IoRadio className="w-6 h-6" />,
            title: "My Relays",
            desc: "Configure & manage your relays",
            color: "text-primary",
            bg: "bg-primary/10",
            hoverBg: "hover:bg-primary/5",
            border: "hover:border-primary/30",
        },
        {
            href: "/clientinvoices",
            icon: <IoFlashOutline className="w-6 h-6" />,
            title: "Subscriptions",
            desc: "Lightning payments & memberships",
            color: "text-secondary",
            bg: "bg-secondary/10",
            hoverBg: "hover:bg-secondary/5",
            border: "hover:border-secondary/30",
        },
        {
            href: "/nip05",
            icon: <IoKeyOutline className="w-6 h-6" />,
            title: "NIP-05 Identity",
            desc: "Setup your Nostr identity",
            color: "text-accent",
            bg: "bg-accent/10",
            hoverBg: "hover:bg-accent/5",
            border: "hover:border-accent/30",
        },
        {
            href: "/directory",
            icon: <IoGlobeOutline className="w-6 h-6" />,
            title: "Browse Relays",
            desc: "Discover & explore the directory",
            color: "text-info",
            bg: "bg-info/10",
            hoverBg: "hover:bg-info/5",
            border: "hover:border-info/30",
        },
    ];

    return (
        <div className="px-4 py-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-sm text-base-content/50 mt-1">Manage your relays and account</p>
                    </div>
                    <Link href="/signup" className="btn btn-primary btn-sm gap-2">
                        <IoAddCircleOutline className="w-4 h-4" />
                        New Relay
                    </Link>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((card) => (
                        <Link
                            key={card.href}
                            href={card.href}
                            className={`group p-5 rounded-lg border border-base-300/50 ${card.hoverBg} ${card.border} transition-all`}
                        >
                            <div className={`w-10 h-10 rounded-lg ${card.bg} ${card.color} flex items-center justify-center mb-4`}>
                                {card.icon}
                            </div>
                            <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
                            <p className="text-xs text-base-content/50 mb-3">{card.desc}</p>
                            <div className={`flex items-center gap-1 text-xs font-medium ${card.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                Open <IoArrowForward className="w-3 h-3" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
