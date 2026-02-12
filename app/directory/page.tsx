import PublicRelays from "../relays/publicRelays"

export default function DirectoryPage() {
    return (
        <div className="px-4 py-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relay Directory</h1>
                        <p className="text-sm text-base-content/50 mt-1">Discover and connect to Nostr relays</p>
                    </div>
                    <a href="/relays" className="btn btn-ghost btn-sm text-xs">
                        ← Dashboard
                    </a>
                </div>
                <PublicRelays />
            </div>
        </div>
    )
}
