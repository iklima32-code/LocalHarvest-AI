"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const templates = [
    { id: "harvest", icon: "🌾", name: "Harvest Update", desc: "Share fresh produce and daily harvests" },
    { id: "behind-scenes", icon: "👨‍🌾", name: "Behind the Scenes", desc: "Show your farming process and operations" },
    { id: "educational", icon: "📚", name: "Educational", desc: "Teach about farming and produce" },
    { id: "sustainability", icon: "🌱", name: "Sustainability", desc: "Highlight eco-friendly practices" },
    { id: "recipe", icon: "👩‍🍳", name: "Recipe & Tips", desc: "Share cooking ideas and food tips" },
    { id: "event", icon: "📅", name: "Event Announcement", desc: "Promote markets, tours, and events" },
];

export default function CreateTemplate() {
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profile);
            }
        };
        fetchProfile();
    }, []);

    const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : (profile?.farm_name || "");

    return (
        <main>
            <Header />

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="card">
                    <div className="flex justify-between items-center pb-5 border-b-2 border-gray-100 mb-10">
                        <h2 className="text-2xl font-bold text-harvest-green">Choose Caption Template</h2>
                        <Link href="/dashboard" className="button-secondary text-sm px-4 py-2">
                            Cancel
                        </Link>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-10">
                            {firstName && (
                                <div className="text-harvest-green font-black text-3xl mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 tracking-tight">
                                    Welcome back, {firstName}!
                                </div>
                            )}
                            <h3 className="text-3xl font-bold mb-3 text-gray-800">Ready to tell your farm&apos;s story?</h3>
                            <p className="text-gray-500 text-lg font-medium">Select a template to engage your followers with a new update</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map((tmpl) => (
                                <Link
                                    key={tmpl.id}
                                    href={`/create/${tmpl.id}`}
                                    className="group block p-8 text-center border-4 border-gray-100 rounded-2xl transition-all hover:border-harvest-green hover:bg-harvest-light hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{tmpl.icon}</div>
                                    <div className="font-bold text-lg mb-2 text-gray-800">{tmpl.name}</div>
                                    <div className="text-sm text-gray-500 leading-relaxed">{tmpl.desc}</div>
                                </Link>
                            ))}
                        </div>

                        <div className="mt-12 pt-10 border-t-2 border-gray-100">
                            <button className="w-full flex items-center justify-between p-6 border-2 border-dashed border-gray-200 rounded-2xl group opacity-80 cursor-default">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl text-gray-400">✨</span>
                                    <div className="text-left">
                                        <div className="font-bold text-gray-800">Create Custom Template</div>
                                        <div className="text-xs text-gray-500 font-medium">Build a custom workflow for your unique farm needs</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className="bg-harvest-green/10 text-harvest-green text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider">Coming Soon</span>
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full shadow-sm hover:scale-105 transition-all cursor-pointer">
                                        <span>💎</span> Upgrade
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="bg-harvest-light border-l-4 border-harvest-green p-6 rounded-r-lg mt-10">
                            <h4 className="font-bold text-harvest-green mb-3">💡 Template Guide</h4>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                <strong>Harvest Update:</strong> Perfect for daily produce posts - includes harvest details, quantities, and photos.<br /><br />
                                <strong>Other Templates:</strong> Each template provides a streamlined workflow tailored to that content type with AI-generated captions optimized for engagement.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
