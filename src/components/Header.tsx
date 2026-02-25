"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Header() {
    const pathname = usePathname();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Don't show header on welcome page if needed, but wireframe shows it hidden initially.
    // We'll show it if the user is logged in (to be implemented).
    // For now, let's just make it a standard component.

    const navLinks = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/create", label: "Create" },
        { href: "/recent", label: "Recent Posts" },
        { href: "/settings", label: "Settings" },
    ];

    return (
        <header className="bg-gradient-to-br from-primary to-accent text-white py-5 shadow-md sticky top-0 z-[1000]">
            <div className="max-w-[1200px] mx-auto px-5 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3 text-2xl font-bold cursor-pointer">
                    <span>🌱</span>
                    <span>LocalHarvest AI</span>
                </Link>
                <nav className="flex gap-7 items-center">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`text-white no-underline font-medium px-4 py-2 rounded-md transition-colors hover:bg-white/10 ${pathname === link.href ? "bg-white/20" : ""
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}

                    <div className="relative">
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="w-10 h-10 rounded-full bg-white text-primary border-none cursor-pointer font-bold text-base flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg"
                        >
                            YF
                        </button>
                        {isUserMenuOpen && (
                            <div className="absolute top-[55px] right-0 bg-white rounded-lg shadow-xl min-w-[220px] z-[1001] overflow-hidden text-gray-800 animate-in fade-in slide-in-from-top-2">
                                <div className="p-4 border-b border-gray-200 bg-gray-50">
                                    <div className="font-bold text-[15px] mb-1">Your Farm</div>
                                    <div className="text-[13px] text-gray-600">farm@test.com</div>
                                </div>
                                <div className="flex flex-col">
                                    {/* Menu Items */}
                                    <button className="flex items-center gap-3 p-3 hover:bg-gray-100 text-left text-sm transition-colors">
                                        <span>✨</span> Onboarding
                                    </button>
                                    <button className="flex items-center gap-3 p-3 hover:bg-gray-100 text-left text-sm transition-colors">
                                        <span>⚙️</span> Account Settings
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const { supabase } = await import('@/lib/supabase');
                                            await supabase.auth.signOut();
                                            window.location.href = "/";
                                        }}
                                        className="flex items-center gap-3 p-3 hover:bg-red-50 text-left text-sm font-semibold text-red-600 border-t border-gray-100 transition-colors w-full"
                                    >
                                        <span>🚪</span> Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}
