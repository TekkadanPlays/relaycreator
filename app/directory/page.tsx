import PublicRelays from "../relays/publicRelays"

export default function DirectoryPage() {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Relay Directory</h1>
                    <p className="text-xs text-base-content/40 mt-0.5">Discover and connect to Nostr relays</p>
                </div>
                <a href="/relays" className="text-xs text-base-content/50 hover:text-base-content transition-colors">
                    ← Back
                </a>
            </div>
            <PublicRelays />
        </div>
    )
}
