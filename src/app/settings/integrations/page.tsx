"use client";

import Header from "@/components/Header";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function IntegrationsInner() {
    const searchParams = useSearchParams();
    const [linkedinConnected, setLinkedinConnected] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);
            const { data } = await supabase
                .from("profiles")
                .select("linkedin_access_token")
                .eq("id", user.id)
                .single();
            setLinkedinConnected(!!data?.linkedin_access_token);
        };
        fetchProfile();
    }, []);

    // Reflect redirect param (after OAuth completes)
    useEffect(() => {
        const param = searchParams.get("linkedin");
        if (param === "connected") setLinkedinConnected(true);
    }, [searchParams]);

    const handleLinkedinDisconnect = async () => {
        if (!userId) return;
        await supabase
            .from("profiles")
            .update({ linkedin_access_token: null, linkedin_person_urn: null })
            .eq("id", userId);
        setLinkedinConnected(false);
    };

    return (
        <main>
            <Header />
            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="mb-10">
                    <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Integrations</h2>
                    <p className="text-gray-600 mt-2">Connect Local Harvest to your favorite marketing tools and social media platforms.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Facebook Integration Card */}
                    <div className="card border-2 border-transparent hover:border-blue-100 transition-colors">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-bold">
                                    f
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Facebook</h3>
                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded mt-1">Social Media</span>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full uppercase tracking-wider">
                                Not Connected
                            </span>
                        </div>

                        <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                            Publish AI-generated captions and images directly to your Farm's Business Page. Connect your account to enable one-click scheduling and publishing from the dashboard.
                        </p>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Permissions needed</div>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex gap-2 items-center">
                                    <span className="text-green-500 font-bold">✓</span> Create posts on your Page
                                </li>
                                <li className="flex gap-2 items-center">
                                    <span className="text-green-500 font-bold">✓</span> Upload photos
                                </li>
                                <li className="flex gap-2 items-center">
                                    <span className="text-green-500 font-bold">✓</span> Read Page insights
                                </li>
                            </ul>
                        </div>

                        <button
                            className="w-full button-primary bg-blue-600 hover:bg-blue-700 justify-center shadow-md shadow-blue-600/20 py-4 flex items-center gap-3 transition-all"
                            onClick={() => alert("This will open the Facebook OAuth popup in a real production environment.")}
                        >
                            <span className="text-xl">🔗</span> Connect Facebook Page
                        </button>
                    </div>

                    {/* LinkedIn Integration Card */}
                    <div className="card border-2 border-transparent hover:border-blue-100 transition-colors">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-700 text-white rounded-2xl flex items-center justify-center text-3xl font-bold">
                                    in
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">LinkedIn</h3>
                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded mt-1">Professional Network</span>
                                </div>
                            </div>
                            {linkedinConnected ? (
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">
                                    Connected
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full uppercase tracking-wider">
                                    Not Connected
                                </span>
                            )}
                        </div>

                        <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                            Share harvest updates and farm stories with your professional network. Connect your LinkedIn profile to publish directly from the dashboard.
                        </p>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Permissions needed</div>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex gap-2 items-center">
                                    <span className="text-green-500 font-bold">✓</span> w_member_social — create posts
                                </li>
                                <li className="flex gap-2 items-center">
                                    <span className="text-green-500 font-bold">✓</span> openid — verify identity
                                </li>
                                <li className="flex gap-2 items-center">
                                    <span className="text-green-500 font-bold">✓</span> profile — read your profile
                                </li>
                            </ul>
                        </div>

                        {linkedinConnected ? (
                            <button
                                onClick={handleLinkedinDisconnect}
                                className="w-full button-secondary justify-center py-4 flex items-center gap-3 transition-all border-red-200 text-red-600 hover:bg-red-50"
                            >
                                Disconnect LinkedIn
                            </button>
                        ) : (
                            <a
                                href="/api/auth/linkedin"
                                className="w-full button-primary bg-blue-700 hover:bg-blue-800 justify-center shadow-md shadow-blue-700/20 py-4 flex items-center gap-3 transition-all"
                            >
                                <span className="text-xl">🔗</span> Connect LinkedIn
                            </a>
                        )}
                    </div>

                    {/* Instagram Integration Card (Coming Soon) */}
                    <div className="card relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 bg-harvest-green text-white text-[10px] font-black uppercase px-6 py-1 transform translate-x-[30%] translate-y-[100%] rotate-45">
                            Coming Soon
                        </div>

                        <div className="flex justify-between items-start mb-6 opacity-60">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white rounded-2xl flex items-center justify-center text-3xl font-bold">
                                    📸
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Instagram</h3>
                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded mt-1">Social Media</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-500 text-sm mb-8 leading-relaxed flex-1 opacity-80">
                            Push beautiful AI-generated imagery and perfectly sized captions straight to your Instagram grid and Stories.
                        </p>

                        <button className="w-full button-secondary justify-center py-4 bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed">
                            Get Notified When Live
                        </button>
                    </div>

                    {/* Mailchimp Integration Card (Coming Soon) */}
                    <div className="card relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 bg-harvest-green text-white text-[10px] font-black uppercase px-6 py-1 transform translate-x-[30%] translate-y-[100%] rotate-45">
                            Coming Soon
                        </div>

                        <div className="flex justify-between items-start mb-6 opacity-60">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center text-3xl font-bold">
                                    ✉️
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Mailchimp</h3>
                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded mt-1">Newsletter</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-500 text-sm mb-8 leading-relaxed flex-1 opacity-80">
                            Automatically turn your logged harvests into beautiful weekly CSA newsletters sent straight to your community's inbox.
                        </p>

                        <button className="w-full button-secondary justify-center py-4 bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed">
                            Get Notified When Live
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function Integrations() {
    return (
        <Suspense>
            <IntegrationsInner />
        </Suspense>
    );
}
