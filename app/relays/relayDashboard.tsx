"use client";
import Link from "next/link";
import { IoRadio, IoFlashOutline, IoKeyOutline, IoGlobeOutline, IoArrowForward, IoAddCircleOutline } from "react-icons/io5";

export default function RelayDashboard() {

    const cards = [
        {
            href: "/relays/myrelays",
            icon: <IoRadio className="w-5 h-5" />,
            title: "My Relays",
            desc: "Configure & manage your relays",
        },
        {
            href: "/clientinvoices",
            icon: <IoFlashOutline className="w-5 h-5" />,
            title: "Subscriptions",
            desc: "Lightning payments & memberships",
        },
        {
            href: "/nip05",
            icon: <IoKeyOutline className="w-5 h-5" />,
            title: "NIP-05 Identity",
            desc: "Setup your Nostr identity",
        },
        {
            href: "/directory",
            icon: <IoGlobeOutline className="w-5 h-5" />,
            title: "Browse Relays",
            desc: "Discover & explore the directory",
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
                    <p className="text-xs text-base-content/40 mt-0.5">Manage your relays and account</p>
                </div>
                <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-content hover:bg-primary/90 transition-colors"
                >
                    <IoAddCircleOutline className="w-4 h-4" />
                    New Relay
                </Link>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((card) => (
                    <Link
                        key={card.href}
                        href={card.href}
                        className="group flex flex-col p-4 rounded-lg border border-base-300/40 hover:border-base-300 transition-colors"
                    >
                        <div className="text-primary mb-3">{card.icon}</div>
                        <h3 className="font-medium text-sm mb-0.5">{card.title}</h3>
                        <p className="text-xs text-base-content/45 mb-3">{card.desc}</p>
                        <div className="mt-auto flex items-center gap-1 text-xs text-base-content/30 group-hover:text-primary transition-colors">
                            Open <IoArrowForward className="w-3 h-3" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
