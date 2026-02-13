"use client";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { IoRadio, IoLogOutOutline, IoMenuOutline, IoCloseOutline, IoFlashOutline, IoKeyOutline, IoReceiptOutline, IoAddCircleOutline, IoChatbubblesOutline, IoChevronDownOutline } from "react-icons/io5";

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
    const [dropdownOpen, setDropdownOpen] = useState(false);
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

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!dropdownOpen) return;
        const handleClick = () => setDropdownOpen(false);
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [dropdownOpen]);

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
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLoginHelp(false)} />
                    <div className="relative w-full max-w-md mx-4 bg-base-100 border border-base-300 rounded-lg shadow-2xl p-6">
                        <h3 className="font-semibold text-lg mb-2">Sign in with Nostr</h3>
                        <p className="text-sm text-base-content/60 mb-5">You need a NIP-07 browser extension to sign in.</p>
                        <div className="space-y-2">
                            {[
                                { platform: "iOS", app: "Nostore", href: "https://apps.apple.com/us/app/nostore/id1666553677" },
                                { platform: "Android", app: "Kiwi Browser + nos2x", href: "https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&pli=1" },
                            ].map((item) => (
                                <div key={item.platform} className="flex items-center justify-between p-3 rounded-md bg-base-200/50">
                                    <div>
                                        <p className="text-sm font-medium">{item.platform}</p>
                                        <p className="text-xs text-base-content/50">{item.app}</p>
                                    </div>
                                    <a href={item.href} className="text-xs font-medium text-primary hover:underline">Install</a>
                                </div>
                            ))}
                            <div className="flex items-center justify-between p-3 rounded-md bg-base-200/50">
                                <div>
                                    <p className="text-sm font-medium">Desktop</p>
                                    <p className="text-xs text-base-content/50">nos2x or Alby extension</p>
                                </div>
                                <div className="flex gap-3">
                                    <a href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" className="text-xs font-medium text-primary hover:underline">nos2x</a>
                                    <a href="https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe" className="text-xs font-medium text-primary hover:underline">Alby</a>
                                </div>
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => setShowLoginHelp(false)}
                                className="text-sm text-base-content/60 hover:text-base-content transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-50 border-b border-base-300/40 bg-base-100/90 backdrop-blur-md">
                <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
                    {/* 3-column grid: logo | center nav | right actions */}
                    <div className="grid h-14 items-center" style={{ gridTemplateColumns: "1fr auto 1fr" }}>

                        {/* Left: Logo */}
                        <div className="flex items-center">
                            <a href={rootDomain + "/"} className="flex items-center gap-2 group">
                                <IoRadio className="w-[18px] h-[18px] text-primary" />
                                <span className="font-semibold text-sm tracking-tight">{siteName}</span>
                            </a>
                        </div>

                        {/* Center: Nav links (desktop) */}
                        <div className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="px-3 py-1.5 text-[13px] text-base-content/50 hover:text-base-content transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center justify-end gap-2">
                            {!session ? (
                                <>
                                    <button
                                        onClick={doNip07Login}
                                        className="hidden lg:inline-flex text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={() => setMobileOpen(!mobileOpen)}
                                        className="lg:hidden p-1.5 rounded-md text-base-content/50 hover:text-base-content hover:bg-base-200/50 transition-colors"
                                    >
                                        {mobileOpen ? <IoCloseOutline className="w-5 h-5" /> : <IoMenuOutline className="w-5 h-5" />}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* User dropdown - Desktop */}
                                    <div className="relative hidden lg:block">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                                            className="flex items-center gap-1.5 py-1 text-base-content/60 hover:text-base-content transition-colors"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-[10px] font-semibold text-primary">
                                                    {session.user?.name?.substring(0, 2)?.toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-xs font-mono">
                                                {session.user?.name?.substring(0, 8)}
                                            </span>
                                            <IoChevronDownOutline className="w-3 h-3 opacity-40" />
                                        </button>

                                        {dropdownOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-52 bg-base-100 border border-base-300/60 rounded-lg shadow-lg py-1 z-50">
                                                {userLinks.map((link) => (
                                                    <a
                                                        key={link.label}
                                                        href={link.href}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-base-content/70 hover:text-base-content hover:bg-base-200/50 transition-colors"
                                                    >
                                                        <span className="text-base-content/40">{link.icon}</span>
                                                        {link.label}
                                                    </a>
                                                ))}
                                                <div className="border-t border-base-300/40 my-1" />
                                                <button
                                                    onClick={() => signOut({ callbackUrl: "/" })}
                                                    className="flex items-center gap-2.5 px-3 py-2 w-full text-[13px] text-error/70 hover:text-error hover:bg-error/5 transition-colors"
                                                >
                                                    <IoLogOutOutline className="w-4 h-4" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile menu button */}
                                    <button
                                        onClick={() => setMobileOpen(!mobileOpen)}
                                        className="lg:hidden p-1.5 rounded-md text-base-content/50 hover:text-base-content hover:bg-base-200/50 transition-colors"
                                    >
                                        {mobileOpen ? <IoCloseOutline className="w-5 h-5" /> : <IoMenuOutline className="w-5 h-5" />}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Mobile Menu ── */}
                {mobileOpen && (
                    <div className="lg:hidden border-t border-base-300/40 bg-base-100">
                        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-3 space-y-0.5">
                            {session ? (
                                <>
                                    <div className="px-3 py-2 mb-1">
                                        <p className="text-xs font-mono text-base-content/40">{session.user?.name?.substring(0, 20)}...</p>
                                    </div>
                                    {userLinks.map((link) => (
                                        <a
                                            key={link.label}
                                            href={link.href}
                                            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-base-content/70 hover:text-base-content hover:bg-base-200/40 rounded-md transition-colors"
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            <span className="text-base-content/40">{link.icon}</span>
                                            {link.label}
                                        </a>
                                    ))}
                                    <div className="border-t border-base-300/40 mt-2 pt-2">
                                        <button
                                            onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
                                            className="flex items-center gap-2.5 px-3 py-2.5 w-full text-sm text-error/70 hover:text-error rounded-md transition-colors"
                                        >
                                            <IoLogOutOutline className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {navLinks.map((link) => (
                                        <a
                                            key={link.label}
                                            href={link.href}
                                            className="block px-3 py-2.5 text-sm text-base-content/70 hover:text-base-content hover:bg-base-200/40 rounded-md transition-colors"
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                    <div className="border-t border-base-300/40 mt-2 pt-3">
                                        <button
                                            onClick={() => { doNip07Login(); setMobileOpen(false); }}
                                            className="w-full text-center py-2.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
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
