"use client";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ShowSmallSession(
    props: React.PropsWithChildren<{
        pubkey: string;
    }>
) {
    const doNip07Login = async (e: any) => {
        e.preventDefault();
        // call to api to get a LoginToken

        const tokenResponse = await fetch(`/api/auth/logintoken`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const tokenData = await tokenResponse.json();
        const token = tokenData.token;

        // we could support keys.band by requesting the pubkey,
        // for now we will wait and see if upstream accepts the pull request to not require this:
        // https://github.com/toastr-space/keys-band/pull/13
        // now tracking issue in Spring as well.
        // adding additional call to support new signing clients -- until we can get bugs fixed upstream
        // oct-20 update, attempting to re-enable one event sign-in
        try {
            //const thisPubkeyRes = await (window as any).nostr.getPublicKey();
            const thisPubkeyRes = props.pubkey;

            let signThis = {
                kind: 27235,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                pubkey: thisPubkeyRes,
                content: token,
            };
            let useMe = await (window as any).nostr.signEvent(signThis);
            toast.success("Signing in...", {
                position: "bottom-right",
                autoClose: 2000,
            });
            signIn("credentials", {
                kind: useMe.kind,
                created_at: useMe.created_at,
                content: useMe.content,
                pubkey: useMe.pubkey,
                sig: useMe.sig,
                id: useMe.id,
                callbackUrl: "/#",
                // callbackUrl: "/signup?relayname=" + name
            });
        } catch {
            console.log("error signing event");
            toast.error("Failed to sign in. Please check your Nostr extension.", {
                position: "bottom-right",
                autoClose: 4000,
            });
            setShowLoginHelp(true);
        }
    };

    const { data: session, status } = useSession();
    const [showLoginHelp, setShowLoginHelp] = useState(false);

    // using absolute urls so that we can serve subdomain landing pages
    const rootDomain =
        process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000";

    const supportURL = process.env.NEXT_PUBLIC_SUPPORT_URL || "#";

    return (
        <div className="mb-2 flex items-center justify-center">
            {showLoginHelp && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLoginHelp(false)} />
                    <div className="relative w-full max-w-md mx-4 bg-base-100 border border-base-300 rounded-lg shadow-2xl p-6">
                        <h3 className="font-semibold text-lg mb-2">NIP-07 Extension Required</h3>
                        <p className="text-sm text-base-content/60 mb-4">You need a NIP-07 browser extension to sign in.</p>
                        <div className="space-y-2 text-sm">
                            {[
                                { label: "iOS", name: "Nostore", href: "https://apps.apple.com/us/app/nostore/id1666553677" },
                                { label: "Android", name: "Kiwi Browser + nos2x", href: "https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&pli=1" },
                                { label: "Desktop", name: "nos2x", href: "https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" },
                                { label: "Desktop", name: "Alby", href: "https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe" },
                            ].map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-3 rounded-md bg-base-200/50">
                                    <span className="text-base-content/60">{item.label}</span>
                                    <a href={item.href} className="text-xs font-medium text-primary hover:underline">{item.name}</a>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => setShowLoginHelp(false)} className="text-sm text-base-content/60 hover:text-base-content transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {!session ? (
                <button
                    onClick={(e) => doNip07Login(e)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-content hover:bg-primary/90 transition-colors"
                >
                    Sign In
                    <Image
                        alt="nostr"
                        src="/nostr_logo_prpl_wht_rnd.svg"
                        width={20}
                        height={20}
                    />
                </button>
            ) : (
                <button
                    className="inline-flex items-center px-3 py-1.5 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors cursor-pointer"
                    onClick={() => {
                        toast.info("Signing out...", {
                            position: "bottom-right",
                            autoClose: 2000,
                        });
                        signOut({ callbackUrl: "/#" });
                    }}
                >
                    Signed in as moderator
                </button>
            )}
            <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="auto"
            />
        </div>
    );
}
