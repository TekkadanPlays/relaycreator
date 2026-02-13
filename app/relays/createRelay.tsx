"use client";
import { IoLogoGithub, IoCheckmarkCircle, IoArrowForward, IoFlashOutline, IoStarOutline } from "react-icons/io5";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nip19 } from "nostr-tools";
import { convertOrValidatePubkey } from "../../lib/pubkeyValidation";

export default function CreateRelay(props: React.PropsWithChildren<{}>) {
    const { data: session, status } = useSession();
    const p = useSearchParams();

    const [referrer, setReferrer] = useState("");

    useEffect(() => {
        setReferrer(document.referrer);
    }, []);

    if (p == null) {
        return <>no p</>;
    }
    const relayname = p.get("relayname");
    let useName = "";
    if (relayname) {
        useName = relayname;
    }

    const [name, setName] = useState(useName);
    const [nameError, setNameError] = useState("");
    const [pubkeyError, setPubkeyError] = useState("✅");
    const [nameErrorDescription, setNameErrorDescription] = useState("");
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("");

    const [pubkey, setPubkey] = useState("");
    const [selectedPlan, setSelectedPlan] = useState("standard");

    const router = useRouter();

    function setRelayName(name: string) {
        setName(name);
        if (validateRelayName(name)) {
            setNameError("");
        } else {
            setNameError("❌");
        }
    }

    if (session && session.user?.name) {
        if (pubkey != session.user.name) {
            setPubkey(session.user.name);
        }
    }

    function setAndValidatePubkey(pubkey: string) {
        setPubkey(pubkey);
        const validPubkey = convertOrValidatePubkey(pubkey);
        setPubkeyError("");
        if (validPubkey) {
            setPubkeyError("✅");
            setPubkeyErrorDescription("");
        } else {
            setPubkeyError("❌");
            setPubkeyErrorDescription("key must be valid hex or npub");
        }
    }

    function validateRelayName(name: string) {
        const valid = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}$/.test(name);

        if (name == "") {
            setNameErrorDescription("name cannot be blank");
            return false;
        }

        if (valid) {
            setNameErrorDescription("");
        } else {
            setNameErrorDescription("name must be valid hostname");
        }
        return valid;
    }

    function isValidForm() {
        if (
            pubkey != "" &&
            pubkeyError == "✅" &&
            nameError == "" &&
            name != ""
        ) {
            return true;
        } else {
            return false;
        }
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();

        const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey);
        let submitHex: any;
        if (validNpub) {
            const decoded = nip19.decode(pubkey);
            submitHex = decoded.data;
        } else {
            submitHex = pubkey;
        }

        const response = await fetch(
            `/api/invoices?relayname=${name}&pubkey=${submitHex}&plan=${selectedPlan}`
        );
        const newdata = await response.json();

        if (response.ok) {
            router.push(
                `/invoices?relayname=${name}&pubkey=${submitHex}&order_id=${newdata.order_id}&referrer=${referrer}&plan=${selectedPlan}`
            );
        } else {
            setNameError("❌");
            setNameErrorDescription(newdata.error);
        }
    };

    const useDomain = process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com";

    const standardFeatures = [
        "Customizable on-the-fly",
        "Inbox / Outbox support",
        "Public / Private modes",
        "Communities / DMs",
    ];

    const premiumFeatures = [
        "All standard features",
        "Streaming from other relays",
        "Enhanced filtering by social graph",
    ];

    return (
        <div>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">
                        Deploy Your Relay
                    </h1>
                    <p className="text-sm text-base-content/50">
                        Choose a plan, configure, and launch in under a minute.
                    </p>
                </div>

                {/* Plan Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Standard Plan */}
                    <button
                        type="button"
                        className={`text-left p-6 rounded-lg border-2 transition-all ${
                            selectedPlan === "standard"
                                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                                : "border-base-300 hover:border-base-content/20"
                        }`}
                        onClick={() => setSelectedPlan("standard")}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <IoFlashOutline className="w-5 h-5 text-primary" />
                                    <span className="font-semibold text-lg">Standard</span>
                                </div>
                                <div className="text-2xl font-bold">
                                    {process.env.NEXT_PUBLIC_INVOICE_AMOUNT || "21"}{" "}
                                    <span className="text-sm font-normal text-base-content/50">sats / mo</span>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                selectedPlan === "standard" ? "border-primary bg-primary" : "border-base-300"
                            }`}>
                                {selectedPlan === "standard" && (
                                    <div className="w-2 h-2 rounded-full bg-primary-content" />
                                )}
                            </div>
                        </div>
                        <ul className="space-y-2">
                            {standardFeatures.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-sm text-base-content/70">
                                    <IoCheckmarkCircle className="w-4 h-4 text-secondary shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </button>

                    {/* Premium Plan */}
                    <button
                        type="button"
                        className={`text-left p-6 rounded-lg border-2 transition-all relative ${
                            selectedPlan === "premium"
                                ? "border-secondary bg-secondary/5 shadow-lg shadow-secondary/10"
                                : "border-base-300 hover:border-base-content/20"
                        }`}
                        onClick={() => setSelectedPlan("premium")}
                    >
                        <div className="absolute -top-2.5 right-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-content">
                                <IoStarOutline className="w-3 h-3" />
                                Recommended
                            </span>
                        </div>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <IoStarOutline className="w-5 h-5 text-secondary" />
                                    <span className="font-semibold text-lg">Premium</span>
                                </div>
                                <div className="text-2xl font-bold">
                                    {process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || "2100"}{" "}
                                    <span className="text-sm font-normal text-base-content/50">sats / mo</span>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                selectedPlan === "premium" ? "border-secondary bg-secondary" : "border-base-300"
                            }`}>
                                {selectedPlan === "premium" && (
                                    <div className="w-2 h-2 rounded-full bg-secondary-content" />
                                )}
                            </div>
                        </div>
                        <ul className="space-y-2">
                            {premiumFeatures.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-sm text-base-content/70">
                                    <IoCheckmarkCircle className="w-4 h-4 text-secondary shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </button>
                </div>

                {/* Configuration Form */}
                <div className="rounded-lg border border-base-300 bg-base-200/30 p-6 sm:p-8 mb-6">
                    <h3 className="font-semibold text-lg mb-6">Configure Your Relay</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pubkey */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Your Pubkey
                            </label>
                            <input
                                type="text"
                                name="pubkey"
                                className="w-full rounded-md border border-base-300/50 bg-base-200/30 px-3 py-2 text-sm placeholder:text-base-content/30 focus:outline-none focus:border-base-300 transition-colors"
                                placeholder="sign-in or paste pubkey"
                                autoComplete="off"
                                value={pubkey}
                                onChange={(event) => setAndValidatePubkey(event.target.value)}
                            />
                            {pubkeyErrorDescription && (
                                <p className="text-xs text-error mt-1.5">{pubkeyErrorDescription}</p>
                            )}
                        </div>

                        {/* Relay Name */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Relay Subdomain
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 min-w-0 rounded-md border border-base-300/50 bg-base-200/30 px-3 py-2 text-sm placeholder:text-base-content/30 focus:outline-none focus:border-base-300 transition-colors"
                                    placeholder="yourname"
                                    autoComplete="off"
                                    value={name}
                                    onChange={(event) => setRelayName(event.target.value)}
                                />
                                <span className="flex items-center px-3 text-sm text-base-content/50 bg-base-300/50 border border-base-300 rounded-lg whitespace-nowrap">
                                    .{useDomain}
                                </span>
                            </div>
                            {nameErrorDescription && (
                                <p className="text-xs text-error mt-1.5">{nameErrorDescription}</p>
                            )}
                            {name && !nameErrorDescription && (
                                <p className="text-xs text-base-content/50 mt-1.5">
                                    Your relay will be at <span className="font-mono text-primary">{name}.{useDomain}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Deploy Button */}
                    <div className="flex justify-center mt-8">
                        <button
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-content hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            onClick={handleSubmit}
                            disabled={!isValidForm()}
                        >
                            Deploy {selectedPlan === "premium" ? "Premium" : "Standard"} Relay
                            <IoArrowForward className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-base-content/40">
                    {useDomain} {new Date().getFullYear()} &middot;{" "}
                    <a href="https://github.com/relaytools" className="hover:text-base-content/60 transition-colors inline-flex items-center gap-1">
                        <IoLogoGithub className="w-3.5 h-3.5" />
                        Open Source
                    </a>
                </div>
            </div>
        </div>
    );
}
