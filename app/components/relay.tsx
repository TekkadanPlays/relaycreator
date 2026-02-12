"use client"
import { nip19 } from "nostr-tools"
import { RelayWithEverything } from "./relayWithEverything"
import { useState } from "react"

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault()
    navigator.clipboard.writeText(bolt).then(() => {
        console.log('Copied to clipboard!');
    });
}

export default function Relay(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
        showEdit: boolean;
        showSettings: boolean;
        showDetail: boolean;
        showExplorer: boolean;
        showCopy: boolean;
        modActions?: boolean;
    }>) {

    const [profileDetail, setProfileDetails] = useState(props.relay.details)
    const [profileBanner, setProfileBanner] = useState(props.relay.banner_image)
    const [edited, setEdited] = useState(false)
    const [editing, setEditing] = useState(false)

    const handleSubmitEdit = async (event: any) => {
        event.preventDefault();
        // call to API to save relay details 
        const profileDetailsObj = { details: profileDetail, banner_image: profileBanner, payment_amount: props.relay.payment_amount };
        const profileDetailsJson = JSON.stringify(profileDetailsObj);
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: profileDetailsJson
        });
        setEditing(false)
        setEdited(true)
    }

    let useRelayWSS = "wss://" + props.relay.name + "." + props.relay.domain
    // if relay is external, use full domain name here
    if(props.relay.is_external) {
        useRelayWSS = "wss://" + props.relay.domain
    }

    let useRelayHttps = "https://" + props.relay.name + "." + props.relay.domain
    if(props.relay.is_external) {
        useRelayHttps = "https://" + props.relay.domain
    }

    let useDetails = ""
    if(props.relay.details) {
        useDetails = props.relay.details.split('\n').slice(0, 2).join('\n');
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000"
    const bannerUrl = edited ? (profileBanner || null) : (props.relay.banner_image || null)
    const displayDetails = edited ? (profileDetail || "") : useDetails

    return (
        <div id={props.relay.id + "rootview"} className="group">
            {/* Card View (showDetail or showSettings or showCopy) */}
            {(props.showDetail || props.showSettings || props.showCopy) && (
                <a
                    href={props.showSettings ? `/curator?relay_id=${props.relay.id}` : useRelayHttps}
                    onClick={props.showCopy ? (e: any) => { e.preventDefault(); copyToClipboard(e, useRelayWSS); } : undefined}
                    className="block rounded-lg border border-base-300/50 overflow-hidden hover:border-base-content/20 transition-all"
                >
                    {/* Banner */}
                    <div className="h-32 bg-base-300 relative overflow-hidden">
                        {bannerUrl ? (
                            <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-base-100/90 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-4 -mt-8 relative">
                        <h3 className="font-semibold text-sm mb-1 truncate">{props.relay.name}</h3>
                        <p className="text-xs font-mono text-base-content/40 mb-2 truncate">{useRelayWSS}</p>
                        {displayDetails && (
                            <p className="text-xs text-base-content/60 line-clamp-2 leading-relaxed">{displayDetails}</p>
                        )}
                    </div>
                </a>
            )}

            {/* Copy Button */}
            {props.showCopy && (
                <button
                    className="btn btn-ghost btn-xs w-full mt-2 text-xs"
                    onClick={(e) => copyToClipboard(e, useRelayWSS)}
                >
                    Copy WSS URL
                </button>
            )}

            {/* Edit Button */}
            {props.showEdit && (
                <button
                    className="btn btn-ghost btn-xs w-full mt-2 text-xs"
                    onClick={() => setEditing(true)}
                >
                    Edit Details
                </button>
            )}

            {/* Edit Form */}
            {editing && (
                <div className="mt-3 p-4 rounded-lg border border-base-300 bg-base-200/30 space-y-3">
                    <div>
                        <label className="block text-xs font-medium mb-1">Description</label>
                        <textarea
                            id={props.relay.id + "textareaedit"}
                            className="textarea textarea-bordered w-full h-20 text-sm"
                            placeholder="Relay description..."
                            value={profileDetail || ""}
                            onChange={(e) => setProfileDetails(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Banner Image URL</label>
                        <input
                            id={props.relay.id + "urlid"}
                            type="text"
                            placeholder="https://..."
                            className="input input-bordered input-sm w-full"
                            onChange={(e) => setProfileBanner(e.target.value)}
                            value={profileBanner || ""}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={(e) => handleSubmitEdit(e)}>Save</button>
                    </div>
                </div>
            )}

            {/* Explorer Link */}
            {props.showExplorer && (
                <a href={useRelayHttps} className="btn btn-ghost btn-xs w-full mt-2 text-xs">
                    Open in Explorer
                </a>
            )}
        </div>
    )
}