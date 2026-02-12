"use client";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { IoRadio, IoLogOutOutline, IoMenuOutline, IoCloseOutline, IoFlashOutline, IoKeyOutline, IoReceiptOutline, IoGridOutline, IoAddCircleOutline, IoHelpCircleOutline, IoChatbubblesOutline } from "react-icons/io5";

export default function ShowSession(
    props: React.PropsWithChildren<{
        theme: string;
    }>
) {
    const doNip07Login = async () => {
        const tokenResponse = await fetch(`/api/auth/logintoken`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const tokenData = await tokenResponse.json();
        const token = tokenData.token;

        try {
            let signThis = {
                kind: 27235,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: token,
            };
            let useMe = await (window as any).nostr.signEvent(signThis);
            signIn("credentials", {
                kind: useMe.kind,
                created_at: useMe.created_at,
                content: useMe.content,
                pubkey: useMe.pubkey,
                sig: useMe.sig,
                id: useMe.id,
                callbackUrl: "/#",
            });
        } catch {
            console.log("error signing event");
            setShowLoginHelp(true);
        }
    };

    const { data: session, status } = useSession();
    const [showLoginHelp, setShowLoginHelp] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [curTheme, setCurTheme] = useState(props.theme);

    useEffect(() => {
        const savedTheme = document.documentElement.getAttribute("data-theme");
        if (savedTheme) {
            setCurTheme(savedTheme);
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "data-theme"
                ) {
                    const newTheme =
                        document.documentElement.getAttribute("data-theme");
                    if (newTheme) {
                        setCurTheme(newTheme);
                    }
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const rootDomain =
        process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000";
    const supportURL = process.env.NEXT_PUBLIC_SUPPORT_URL || "#";
    const siteName = process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com";

    const navLinks = [
        { href: rootDomain + "/", label: "Home" },
        { href: rootDomain + "/directory", label: "Directory" },
        { href: rootDomain + "/signup", label: "Create Relay" },
        { href: supportURL, label: "Support" },
    ];

    const userLinks = [
        { href: rootDomain + "/relays/myrelays", label: "My Relays", icon: <IoRadio className="w-4 h-4" /> },
        { href: rootDomain + "/clientinvoices", label: "Subscriptions", icon: <IoFlashOutline className="w-4 h-4" /> },
        { href: rootDomain + "/nip05", label: "NIP-05 Identity", icon: <IoKeyOutline className="w-4 h-4" /> },
        { href: rootDomain + "/invoices", label: "Invoices", icon: <IoReceiptOutline className="w-4 h-4" /> },
        { href: rootDomain + "/signup", label: "Create Relay", icon: <IoAddCircleOutline className="w-4 h-4" /> },
        { href: supportURL, label: "Support", icon: <IoChatbubblesOutline className="w-4 h-4" /> },
    ];

    return (
        <>
            {/* NIP-07 Help Modal */}
            {showLoginHelp && (
                <dialog className="modal modal-bottom modal-open sm:modal-middle">
                    <div className="modal-box border border-base-300">
                        <h3 className="font-bold text-lg mb-4">Sign in with Nostr</h3>
                        <p className="text-sm opacity-70 mb-4">You need a NIP-07 browser extension to sign in.</p>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                                <div>
                                    <p className="font-medium text-sm">iOS</p>
                                    <p className="text-xs opacity-60">Nostore</p>
                                </div>
                                <a className="btn btn-sm btn-primary" href="https://apps.apple.com/us/app/nostore/id1666553677">Install</a>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                                <div>
                                    <p className="font-medium text-sm">Android</p>
                                    <p className="text-xs opacity-60">Kiwi Browser + nos2x</p>
                                </div>
                                <a className="btn btn-sm btn-primary" href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&pli=1">Install</a>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                                <div>
                                    <p className="font-medium text-sm">Desktop</p>
                                    <p className="text-xs opacity-60">nos2x or Alby extension</p>
                                </div>
                                <div className="flex gap-2">
                                    <a className="btn btn-sm btn-ghost" href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp">nos2x</a>
                                    <a className="btn btn-sm btn-ghost" href="https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe">Alby</a>
                                </div>
                            </div>
                        </div>
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setShowLoginHelp(false)}>Close</button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setShowLoginHelp(false)}>close</button>
                    </form>
                </dialog>
            )}

            {/* Main Navbar */}
            <nav className="sticky top-0 z-50 border-b border-base-300/50 bg-base-100/80 backdrop-blur-lg">
                <div className="flex items-center justify-between h-16 px-4">
                    {/* Logo */}
                    <a href={rootDomain + "/"} className="flex items-center gap-2 shrink-0">
                        <IoRadio className="w-6 h-6 text-primary" />
                        <span className="font-bold text-lg tracking-tight">{siteName}</span>
                    </a>

                    {/* Center Nav Links - Desktop */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="px-3 py-2 text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-200/60 rounded-lg transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        {!session ? (
                            <>
                                <button
                                    onClick={doNip07Login}
                                    className="btn btn-primary btn-sm hidden lg:inline-flex"
                                >
                                    Sign In
                                </button>
                                {/* Mobile menu button */}
                                <button
                                    onClick={() => setMobileOpen(!mobileOpen)}
                                    className="btn btn-ghost btn-sm btn-square lg:hidden"
                                >
                                    {mobileOpen ? <IoCloseOutline className="w-5 h-5" /> : <IoMenuOutline className="w-5 h-5" />}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* User dropdown - Desktop */}
                                <div className="dropdown dropdown-end hidden lg:block">
                                    <label tabIndex={0} className="btn btn-ghost btn-sm gap-2 cursor-pointer">
                                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                                            <span className="text-xs font-bold text-primary">
                                                {session.user?.name?.substring(0, 2)?.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-sm font-mono opacity-60">
                                            {session.user?.name?.substring(0, 8)}...
                                        </span>
                                    </label>
                                    <ul tabIndex={0} className="dropdown-content mt-2 p-1 shadow-xl bg-base-100 border border-base-300 rounded-lg w-56 z-50">
                                        {userLinks.map((link) => (
                                            <li key={link.label}>
                                                <a href={link.href} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-base-200 rounded-md transition-colors">
                                                    <span className="opacity-60">{link.icon}</span>
                                                    {link.label}
                                                </a>
                                            </li>
                                        ))}
                                        <li className="border-t border-base-200 mt-1 pt-1">
                                            <a
                                                onClick={() => signOut({ callbackUrl: "/" })}
                                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-error hover:bg-error/10 rounded-md cursor-pointer transition-colors"
                                            >
                                                <IoLogOutOutline className="w-4 h-4" />
                                                Sign Out
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                {/* Mobile menu button */}
                                <button
                                    onClick={() => setMobileOpen(!mobileOpen)}
                                    className="btn btn-ghost btn-sm btn-square lg:hidden"
                                >
                                    {mobileOpen ? <IoCloseOutline className="w-5 h-5" /> : <IoMenuOutline className="w-5 h-5" />}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileOpen && (
                    <div className="lg:hidden border-t border-base-300/50 bg-base-100 pb-4">
                        <div className="px-4 pt-3 space-y-1">
                            {session ? (
                                <>
                                    <div className="px-3 py-2 mb-2">
                                        <p className="text-xs font-mono opacity-50">{session.user?.name?.substring(0, 16)}...</p>
                                    </div>
                                    {userLinks.map((link) => (
                                        <a
                                            key={link.label}
                                            href={link.href}
                                            className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-base-200 rounded-lg transition-colors"
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            <span className="opacity-60">{link.icon}</span>
                                            {link.label}
                                        </a>
                                    ))}
                                    <div className="border-t border-base-200 mt-2 pt-2">
                                        <a
                                            onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-error hover:bg-error/10 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <IoLogOutOutline className="w-4 h-4" />
                                            Sign Out
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {navLinks.map((link) => (
                                        <a
                                            key={link.label}
                                            href={link.href}
                                            className="block px-3 py-2.5 text-sm hover:bg-base-200 rounded-lg transition-colors"
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                    <div className="border-t border-base-200 mt-2 pt-2">
                                        <button
                                            onClick={() => { doNip07Login(); setMobileOpen(false); }}
                                            className="btn btn-primary btn-sm w-full"
                                        >
                                            Sign In with Nostr
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
}
