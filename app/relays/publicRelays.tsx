"use client"
import { RelayWithEverything } from "../components/relayWithEverything"
import { useState, useEffect } from "react"
import Relay from "../components/relay"

export default function PublicRelays() {
    const [results, setResults] = useState<RelayWithEverything[]>([])
    const [allRelays, setAllRelays] = useState<RelayWithEverything[]>([])

    useEffect(() => {
        const fetchRelays = async () => {
            try {
                const response = await fetch(`/api/relay/guiRelays`)
                const data = await response.json()
                setResults(data.publicRelays)
                setAllRelays(data.publicRelays)
            } catch (error) {
                console.error('Error fetching relays:', error)
            }
        }
        fetchRelays()
    }, [])

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        const targetToLower = e.target.value.toLowerCase()
        const r = allRelays.filter((relay) => {
            if (relay.name.toLowerCase().includes(targetToLower)) {
                return true
            }

            if (relay.details && relay.details.toLowerCase().includes(targetToLower)) {
                return true
            }
            return false
        })
        setResults(r)
    }

    return (
        <div>
            {/* Search Bar */}
            <div className="mb-5">
                <div className="relative max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        className="w-full rounded-md border border-base-300/50 bg-base-200/30 pl-9 pr-3 py-2 text-sm placeholder:text-base-content/30 focus:outline-none focus:border-base-300 transition-colors"
                        placeholder="Search relays..."
                        onChange={(e) => handleSearch(e)}
                    />
                </div>
                <p className="text-[11px] text-base-content/35 mt-1.5">{results.length} relay{results.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Relay Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((relay) => (
                    <Relay key={"pub" + relay.id} modActions={false} relay={relay} showEdit={false} showSettings={false} showDetail={true} showExplorer={false} showCopy={false} />
                ))}
            </div>

            {results.length === 0 && allRelays.length > 0 && (
                <div className="text-center py-10 text-base-content/35">
                    <p className="text-sm">No relays match your search.</p>
                </div>
            )}
        </div>
    )
}