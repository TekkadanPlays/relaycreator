import { IoGlobeOutline, IoLockClosedOutline, IoFlashOutline, IoChatbubblesOutline } from "react-icons/io5";

export default function Faq() {
    const relayTypes = [
        {
            icon: <IoChatbubblesOutline className="w-5 h-5" />,
            title: "Topical Relay",
            desc: "Uses keyword filters to selectively decide what topics show up on the relay. Great for communities focused on specific interests.",
        },
        {
            icon: <IoLockClosedOutline className="w-5 h-5" />,
            title: "Invite-Only Relay",
            desc: "Uses pubkey allow lists to control who can post. Only approved members can write events to the relay.",
        },
        {
            icon: <IoFlashOutline className="w-5 h-5" />,
            title: "Paid Public Relay",
            desc: "Accepts a Lightning payment and then adds the pubkey to the allowed list. Reduces spam while keeping the relay open.",
        },
        {
            icon: <IoGlobeOutline className="w-5 h-5" />,
            title: "Free Public Relay",
            desc: "Open to everyone. Anyone can read and write events. The simplest configuration to get started.",
        },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-tight">Relay Types</h1>
                <p className="text-xs text-base-content/40 mt-0.5">Common configurations for Nostr relays</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relayTypes.map((type) => (
                    <div key={type.title} className="p-5 rounded-lg border border-base-300/40">
                        <div className="text-primary mb-3">{type.icon}</div>
                        <h3 className="font-medium text-sm mb-1.5">{type.title}</h3>
                        <p className="text-xs text-base-content/50 leading-relaxed">{type.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}