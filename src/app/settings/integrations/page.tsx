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
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

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
                version: 'v22.0'
            });
        };
    }, []);

    const handleFbLogin = () => {
        setIsConnecting(true);
        window.FB.login((response: any) => {
            console.log("FB Login Response:", response);
            if (response.authResponse) {
                const userAccessToken = response.authResponse.accessToken;
                fetchPages(userAccessToken);
            } else {
                setIsConnecting(false);
                if (response.status !== 'unknown') {
                    alert("Facebook Authorization failed: " + response.status);
                }
            }
        }, { 
            scope: 'public_profile,email,pages_manage_posts,pages_read_engagement,pages_show_list',
            auth_type: 'rerequest',
            return_scopes: true 
        });
    };

    const fetchPages = (userAccessToken: string) => {
        console.log("Fetching pages with access token...");
        window.FB.api('/me/accounts', { access_token: userAccessToken }, (response: any) => {
            console.log("FB /me/accounts response:", response);
            
            if (response && response.data) {
                // Remove auto-connect logic to maintain the 2-step flow
                setFbPages(response.data);
                setShowPageSelector(true);
                setIsConnecting(false);
            } else if (response.error) {
                console.error("FB API Error:", response.error);
                alert(`Facebook Error: ${response.error.message}`);
                setIsConnecting(false);
            } else {
                alert("Could not fetch your Facebook pages. Please ensure you have at least one Business Page.");
                setIsConnecting(false);
            }
        });
    };

    const connectPage = async (page: any) => {
        setIsConnecting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session found. Please log in again.");

            const res = await fetch("/api/auth/facebook-connect", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    pageId: page.id,
                    pageName: page.name,
                    pageAccessToken: page.access_token // This is the short-lived page token, the API will exchange it
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to save connection.");

            // Refresh profile from DB to get the hashed token etc
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            setProfile(data);
            setShowPageSelector(false);
            alert(`Successfully connected to ${page.name}! 🎉`);
        } catch (err: any) {
            console.error("Connection error:", err);
            alert(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectFb = async () => {
        setShowDisconnectConfirm(false); // Close modal first
        setIsConnecting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('profiles').update({
                fb_page_id: null,
                fb_page_access_token: null,
                fb_page_name: null,
                fb_connected_at: null
            }).eq('id', user?.id);

            if (error) throw error;

            // Update local state completely
            const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
            setProfile(data);
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
                    <div className={`p-8 rounded-[40px] border-2 transition-all duration-300 relative group overflow-hidden ${profile?.fb_page_id ? 'bg-blue-50/30 border-blue-200' : 'bg-white border-transparent hover:border-gray-100 shadow-xl shadow-gray-200/50'}`}>
                        {profile?.fb_page_id && (
                            <div className="absolute top-0 right-0 py-2 px-6 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-3xl">
                                Active Connection
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-4xl font-bold shadow-lg shadow-blue-600/30">
                                    f
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">Facebook</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Social Media Publisher</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {profile?.fb_page_id ? (
                            <div className="mb-8 p-6 bg-white rounded-3xl border border-blue-100 shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">Connected Page</span>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl uppercase border border-blue-100">
                                        {profile.fb_page_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-gray-800">{profile.fb_page_name}</div>
                                        <div className="text-xs text-gray-400 font-medium">Auto-publishing enabled</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-10 space-y-4">
                                <p className="text-gray-500 text-sm leading-relaxed font-medium">
                                    Automagically post your harvest updates, AI captions, and farm photos directly to your Business Page with one click.
                                </p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full border border-gray-100">Captions</span>
                                    <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full border border-gray-100">Images</span>
                                    <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full border border-gray-100">Analytics</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 mb-8">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Core Permissions</div>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs">✓</span>
                                    Page Post Management
                                </div>
                                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs">✓</span>
                                    Media Upload Access
                                </div>
                            </div>
                            {profile?.fb_page_id && (
                                <div className="mt-4 pt-4 border-t border-gray-200/50 flex items-center gap-2 text-[10px] text-gray-400 font-bold italic">
                                    <span>🔒</span> End-to-end encrypted integration
                                </div>
                            )}
                        </div>

                        {profile?.fb_page_id ? (
                            <button
                                onClick={() => setShowDisconnectConfirm(true)}
                                disabled={isConnecting}
                                className="w-full py-4 bg-white border-2 border-red-50 text-red-500 hover:bg-red-50 hover:border-red-100 font-black rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isConnecting ? <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div> : <span>⚠️ Disconnect Facebook Page</span>}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                                    <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">Step 1 of 2: Authorize Facebook</span>
                                </div>
                                <button
                                    disabled={isConnecting}
                                    onClick={handleFbLogin}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[40px] shadow-xl shadow-blue-600/30 flex items-center justify-center gap-4 transition-all group active:scale-95 disabled:opacity-70 disabled:grayscale"
                                >
                                    {isConnecting ? (
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="text-2xl group-hover:scale-125 transition-transform duration-300">🔗</span>
                                            <span className="text-lg uppercase whitespace-nowrap">Step 1: Connect Facebook</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Page Selection Modal Overlay */}
                    {showPageSelector && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5 backdrop-blur-sm">
                            <div className="bg-white rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="p-8 border-b border-gray-50 flex flex-col gap-2 font-medium">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black tracking-tight">2</span>
                                        <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">Step 2 of 2</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">Select Your Farm Page</h3>
                                    <p className="text-gray-500 text-sm">Which page represents your farm business?</p>
                                </div>
                                <div className="p-4 max-h-[400px] overflow-y-auto">
                                    {fbPages.length > 0 ? (
                                        fbPages.map(page => (
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
                                        ))
                                    ) : (
                                        <div className="p-10 text-center">
                                            <div className="text-4xl mb-4 text-grayscale">😿</div>
                                            <div className="font-black text-gray-800 text-xl tracking-tight">No Pages Found</div>
                                            <p className="text-sm text-gray-500 mt-4 leading-relaxed font-medium">
                                                Facebook didn't return any Business Pages. This usually happens if the pages weren't selected during the login popup.
                                            </p>
                                            <div className="mt-8 p-5 bg-gray-50 rounded-3xl text-left border border-gray-100 flex flex-col gap-4">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">How to reset & fix</div>
                                                <div className="space-y-4">
                                                    <div className="flex gap-3">
                                                        <span className="flex-shrink-0 w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-black text-gray-400">1</span>
                                                        <p className="text-xs text-gray-600 leading-normal">Go to your <a href="https://www.facebook.com/settings?tab=business_integrations" target="_blank" className="text-blue-600 font-bold hover:underline">Facebook Settings</a></p>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <span className="flex-shrink-0 w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-black text-gray-400">2</span>
                                                        <p className="text-xs text-gray-600 leading-normal">Click <strong>Remove</strong> next to Local Harvest / ROI-MUSE</p>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <span className="flex-shrink-0 w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-black text-gray-400">3</span>
                                                        <p className="text-xs text-gray-600 leading-normal font-bold text-gray-800">Refresh this page and click Connect again — making sure to select your Page.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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

                    {/* Disconnect Confirmation Modal */}
                    {showDisconnectConfirm && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5 backdrop-blur-sm">
                            <div className="bg-white rounded-[40px] max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                <div className="p-10 text-center">
                                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-red-500/10 active:scale-95 transition-transform">
                                        ⚠️
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-800 tracking-tight mb-3">Wait a moment!</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed mb-8 font-medium">
                                        Are you sure you want to disconnect <span className="font-bold text-gray-800">{profile?.fb_page_name}</span>? 
                                        You won't be able to publish harvest updates until you reconnect.
                                    </p>
                                    
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={disconnectFb}
                                            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 transition-all active:scale-95"
                                        >
                                            Yes, Disconnect
                                        </button>
                                        <button
                                            onClick={() => setShowDisconnectConfirm(false)}
                                            className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all"
                                        >
                                            Keep Connected
                                        </button>
                                    </div>
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
