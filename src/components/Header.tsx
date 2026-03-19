"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                
                if (error) {
                    // Handle stale/invalid sessions
                    if (error.message.includes("Refresh Token Not Found") || error.message.includes("invalid_grant")) {
                        console.warn("Stale session detected, clearing auth data.");
                        await supabase.auth.signOut();
                        localStorage.clear();
                        setUser(null);
                        setProfile(null);
                        return;
                    }
                    console.error("Auth error:", error.message);
                }

                setUser(user);

                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    setProfile(profile);
                }
            } catch (err) {
                console.error("Failed to fetch user:", err);
            }
        };

        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                setUser(null);
                setProfile(null);
            } else if (session?.user) {
                setUser(session.user);
                fetchUser();
            }

            // Handle token refresh issues in real-time
            if (event === 'TOKEN_REFRESHED' && !session) {
                console.warn("Session expired or invalid. Clearing site data.");
                localStorage.clear();
                window.location.reload(); // Reload to clear any lingering state
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const navLinks = [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/create", label: "Create", icon: "✨" },
        { href: "/gallery", label: "Gallery", icon: "🖼️" },
        { href: "/recent", label: "Posts", icon: "🕒" },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    // Don't show header on login/signup pages if not logged in
    if (!user && (pathname === '/login' || pathname === '/signup')) return null;

    return (
        <header className="bg-white border-b border-gray-100 py-3 sticky top-0 z-[1000] backdrop-blur-md bg-white/80">
            <div className="max-w-[1200px] mx-auto px-5 flex justify-between items-center">
                <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-xl font-extrabold cursor-pointer text-[#006633]">
                    <span className="text-2xl">🌱</span>
                    <span className="tracking-tight">LocalHarvest <span className="text-gray-400">AI</span></span>
                </Link>

                {user && (
                    <nav className="hidden md:flex gap-2 items-center">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${pathname.startsWith(link.href)
                                    ? "bg-[#006633]/5 text-[#006633]"
                                    : "text-gray-500 hover:text-[#006633] hover:bg-gray-50"
                                    }`}
                            >
                                <span>{link.icon}</span>
                                {link.label}
                            </Link>
                        ))}

                        <div className="ml-4 pl-4 border-l border-gray-100 flex items-center gap-4">
                            <div className="relative">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-3 p-1 pr-4 rounded-full border border-gray-100 hover:border-[#006633] hover:shadow-md transition-all bg-white"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#006633] text-white font-bold text-xs flex items-center justify-center overflow-hidden">
                                        {profile?.profile_photo_url ? (
                                            <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{profile?.farm_name ? profile.farm_name.substring(0, 2).toUpperCase() : "UF"}</span>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 max-w-[100px] truncate">
                                        Hi {profile?.full_name ? profile.full_name.split(' ')[0] : (profile?.farm_name || "Account")}
                                    </span>
                                    <span className={`text-[10px] transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}>▼</span>
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute top-[50px] right-0 bg-white rounded-[24px] shadow-2xl min-w-[240px] z-[1001] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                                            <div className="font-extrabold text-[#333] truncate mb-0.5">{profile?.full_name || profile?.farm_name || "Your Account"}</div>
                                            <div className="text-[11px] text-gray-400 font-medium truncate">{user?.email}</div>
                                            <div className="mt-3">
                                                <span className="px-2 py-0.5 bg-green-100 text-[#006633] text-[9px] font-black uppercase tracking-widest rounded-full">Pro Member</span>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <Link
                                                href="/onboarding"
                                                className="flex items-center gap-3 p-3.5 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-600 transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <span className="text-lg">✨</span> Setup Wizard
                                            </Link>
                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-3 p-3.5 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-600 transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <span className="text-lg">⚙️</span> Account Settings
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 p-3.5 hover:bg-red-50 rounded-xl text-sm font-bold text-red-500 transition-colors text-left"
                                            >
                                                <span className="text-lg">🚪</span> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </nav>
                )}

                {/* Mobile Menu Toggle (Simplified) */}
                {user && <button className="md:hidden text-[#006633] text-2xl">☰</button>}
            </div>
        </header>
    );
}
