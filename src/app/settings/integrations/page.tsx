"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";

declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

export default function Integrations() {
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [fbPages, setFbPages] = useState<any[]>([]);
    const [showPageSelector, setShowPageSelector] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
            setIsLoading(false);
        };
        fetchProfile();

        // Load Facebook SDK
        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s) as HTMLScriptElement; js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode?.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));

        (window as any).fbAsyncInit = function () {
            (window as any).FB.init({
                appId: '2454032635058947', // ROI-MUSE App ID
                cookie: true,
                xfbml: true,
                version: 'v25.0'
            });
        };
    }, []);

    const handleFbLogin = () => {
        setIsConnecting(true);
        window.FB.login((response: any) => {
            if (response.authResponse) {
                const userAccessToken = response.authResponse.accessToken;
                fetchPages(userAccessToken);
            } else {
                setIsConnecting(false);
                alert("User cancelled login or did not fully authorize.");
            }
        }, { scope: 'pages_manage_posts,pages_read_engagement,pages_show_list' });
    };

    const fetchPages = (userAccessToken: string) => {
        window.FB.api('/me/accounts', { access_token: userAccessToken }, (response: any) => {
            if (response.data) {
                setFbPages(response.data);
                setShowPageSelector(true);
            } else {
                alert("Could not fetch your Facebook pages.");
            }
            setIsConnecting(false);
        });
    };

    const connectPage = async (page: any) => {
        setIsConnecting(true);
        try {
            const res = await fetch("/api/auth/facebook-connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pageId: page.id,
                    pageName: page.name,
                    pageAccessToken: page.access_token // This is the short-lived page token, the API will exchange it
                })
            });

            if (!res.ok) throw new Error("Failed to save connection.");

            // Refresh profile
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
            setProfile(data);
            setShowPageSelector(false);
            alert(`Successfully connected to ${page.name}! 🎉`);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectFb = async () => {
        if (!confirm("Are you sure you want to disconnect your Facebook Page?")) return;
        setIsConnecting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('profiles').update({
                fb_page_id: null,
                fb_page_access_token: null,
                fb_page_name: null,
                fb_connected_at: null
            }).eq('id', user?.id);

            setProfile({ ...profile, fb_page_id: null, fb_page_name: null });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Loading Settings...</div>;

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
                    <div className={`card border-2 transition-all ${profile?.fb_page_id ? 'border-blue-200 bg-blue-50/20' : 'border-transparent hover:border-blue-100'}`}>
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
                            {profile?.fb_page_id ? (
                                <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">
                                    Connected
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full uppercase tracking-wider">
                                    Not Connected
                                </span>
                            )}
                        </div>

                        {profile?.fb_page_id ? (
                            <div className="mb-8">
                                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Connected Page</div>
                                <div className="text-lg font-bold text-gray-800">{profile.fb_page_name}</div>
                                <p className="text-gray-500 text-xs mt-1">Direct publishing is active for this page.</p>
                            </div>
                        ) : (
                            <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                                Publish AI-generated captions and images directly to your Farm's Business Page. Connect your account to enable one-click scheduling and publishing from the dashboard.
                            </p>
                        )}

                        <div className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Permissions status</div>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex gap-2 items-center">
                                    <span className="text-green-500 font-bold">✓</span> Create posts on your Page
                                </li>
                                <li className="flex gap-2 items-center">
                                    <span className="text-green-500 font-bold">✓</span> Upload photos
                                </li>
                                {profile?.fb_page_id && (
                                    <li className="flex gap-2 items-center text-[10px] text-gray-400 italic">
                                        Token securely encrypted in database
                                    </li>
                                )}
                            </ul>
                        </div>

                        {profile?.fb_page_id ? (
                            <button
                                onClick={disconnectFb}
                                disabled={isConnecting}
                                className="w-full py-4 border-2 border-red-100 text-red-500 hover:bg-red-50 font-bold rounded-xl transition-all"
                            >
                                Disconnect Facebook
                            </button>
                        ) : (
                            <button
                                disabled={isConnecting}
                                onClick={handleFbLogin}
                                className="w-full button-primary bg-blue-600 hover:bg-blue-700 justify-center shadow-md shadow-blue-600/20 py-4 flex items-center gap-3 transition-all"
                            >
                                {isConnecting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <span className="text-xl">🔗</span>
                                )}
                                Connect Facebook Page
                            </button>
                        )}
                    </div>

                    {/* Page Selection Modal Overlay */}
                    {showPageSelector && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5 backdrop-blur-sm">
                            <div className="bg-white rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="p-8 border-b border-gray-50">
                                    <h3 className="text-2xl font-black text-gray-800">Select Your Page</h3>
                                    <p className="text-gray-500 text-sm mt-2">Which Facebook Business Page represents your farm?</p>
                                </div>
                                <div className="p-4 max-h-[400px] overflow-y-auto">
                                    {fbPages.map(page => (
                                        <button
                                            key={page.id}
                                            onClick={() => connectPage(page)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-blue-50 rounded-2xl transition-all border-2 border-transparent hover:border-blue-200 group mb-2"
                                        >
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl uppercase">
                                                    {page.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 group-hover:text-blue-700">{page.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{page.category}</div>
                                                </div>
                                            </div>
                                            <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="p-8 bg-gray-50 flex gap-4">
                                    <button
                                        onClick={() => setShowPageSelector(false)}
                                        className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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
