"use client";

declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";

const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, "");
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
        3,
        6
    )}-${phoneNumber.slice(6, 10)}`;
};

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [activeTab, setActiveTab] = useState("farm");

    // Form State
    const [formData, setFormData] = useState({
        farmName: "",
        farmType: "Organic Vegetable Farm",
        farmDescription: "",
        location: "",
        website: "",
        brandVoice: "Friendly & Casual",
        emojiUsage: "Moderate (Recommended)",
        defaultHashtags: "#FarmFresh, #LocalFood, #OrganicProduce",
        autoLocation: true,
        autoCTA: true,
        notificationEmail: "",
        notifyPublished: true,
        notifyEngagement: true,
        notifyTips: true,
        farmLogoUrl: "",
        profilePhotoUrl: "",
        fullName: "",
        phoneNumber: "",
        writingSample1: "",
        writingSample2: "",
        writingSample3: "",
        voiceSample1Url: "",
        voiceSample2Url: "",
        voiceSample3Url: ""
    });

    const [profile, setProfile] = useState<any>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [fbPages, setFbPages] = useState<any[]>([]);
    const [showPageSelector, setShowPageSelector] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [showLinkedInDisconnectConfirm, setShowLinkedInDisconnectConfirm] = useState(false);

    const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetchProfile();

        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const linkedinParam = urlParams.get('linkedin');
            if (linkedinParam === 'connected') {
                setMessage({ type: 'success', text: 'LinkedIn connected successfully! 🎉' });
                setActiveTab('connections');
                window.history.replaceState({}, document.title, window.location.pathname + "?tab=connections");
            } else if (linkedinParam === 'error') {
                setMessage({ type: 'error', text: 'Failed to connect LinkedIn. Please try again.' });
                setActiveTab('connections');
                window.history.replaceState({}, document.title, window.location.pathname + "?tab=connections");
            }
        }
    }, []);

    useEffect(() => {
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

        return () => {
            if (activeAudio) {
                activeAudio.pause();
                activeAudio.currentTime = 0;
            }
        };
    }, [activeAudio]);
    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            if (data) {
                setProfile(data);
                setFormData({
                    farmName: data.farm_name || "",
                    farmType: data.farm_type || "Organic Vegetable Farm",
                    farmDescription: data.farm_description || "",
                    location: data.location || "",
                    website: data.website || "",
                    brandVoice: data.brand_voice || "Friendly & Casual",
                    emojiUsage: data.emoji_usage || "Moderate (Recommended)",
                    defaultHashtags: data.default_hashtags || "#FarmFresh, #LocalFood, #OrganicProduce",
                    autoLocation: data.auto_location ?? true,
                    autoCTA: data.auto_cta ?? true,
                    notificationEmail: data.notification_email || user.email || "",
                    notifyPublished: data.notify_published ?? true,
                    notifyEngagement: data.notify_engagement ?? true,
                    notifyTips: data.notify_tips ?? true,
                    farmLogoUrl: data.farm_logo_url || "",
                    profilePhotoUrl: data.profile_photo_url || "",
                    fullName: data.full_name || "",
                    phoneNumber: formatPhoneNumber(data.phone_number || ""),
                    writingSample1: data.writing_sample_1 || "",
                    writingSample2: data.writing_sample_2 || "",
                    writingSample3: data.writing_sample_3 || "",
                    voiceSample1Url: data.voice_sample_1_url || "",
                    voiceSample2Url: data.voice_sample_2_url || "",
                    voiceSample3Url: data.voice_sample_3_url || ""
                });
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const [uploading, setUploading] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'farmLogoUrl' | 'profilePhotoUrl' | 'voiceSample1Url' | 'voiceSample2Url' | 'voiceSample3Url') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(field);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const isVoiceSample = field.startsWith('voice');
            const bucketName = isVoiceSample ? 'ai-samples' : 'profiles';

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${field}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get URL (Note: 'ai-samples' is private, but publicUrl works if RLS allows or via signed URLs for AI)
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [field]: publicUrl }));
            setMessage({ type: "success", text: "File uploaded! 🎉 Remember to Save Settings." });
        } catch (err: any) {
            console.error("Upload error:", err);
            setMessage({ type: "error", text: `Upload failed: ${err.message}` });
        } finally {
            setUploading(null);
        }
    };

    const handlePlayAudio = async (url: string) => {
        try {
            // Stop current audio if playing
            if (activeAudio) {
                activeAudio.pause();
                activeAudio.currentTime = 0;
            }

            let finalUrl = url;
            if (url.includes('ai-samples')) {
                const parts = url.split('ai-samples/');
                if (parts.length > 1) {
                    const filePath = parts[1];
                    const { data, error } = await supabase.storage
                        .from('ai-samples')
                        .createSignedUrl(filePath, 60);

                    if (error) throw error;
                    if (data?.signedUrl) {
                        finalUrl = data.signedUrl;
                    }
                }
            }

            const audio = new Audio(finalUrl);
            setActiveAudio(audio);
            audio.play();

            audio.onended = () => setActiveAudio(null);
        } catch (err) {
            console.error("Playback error:", err);
            setMessage({ type: "error", text: "Failed to play audio. Please try again." });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: "", text: "" });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { error } = await supabase
                .from('profiles')
                .update({
                    farm_name: formData.farmName,
                    farm_type: formData.farmType,
                    farm_description: formData.farmDescription,
                    location: formData.location,
                    website: formData.website,
                    brand_voice: formData.brandVoice,
                    emoji_usage: formData.emojiUsage,
                    default_hashtags: formData.defaultHashtags,
                    auto_location: formData.autoLocation,
                    auto_cta: formData.autoCTA,
                    notification_email: formData.notificationEmail,
                    notify_published: formData.notifyPublished,
                    notify_engagement: formData.notifyEngagement,
                    notify_tips: formData.notifyTips,
                    farm_logo_url: formData.farmLogoUrl,
                    profile_photo_url: formData.profilePhotoUrl,
                    full_name: formData.fullName,
                    phone_number: formData.phoneNumber,
                    writing_sample_1: formData.writingSample1,
                    writing_sample_2: formData.writingSample2,
                    writing_sample_3: formData.writingSample3,
                    voice_sample_1_url: formData.voiceSample1Url,
                    voice_sample_2_url: formData.voiceSample2Url,
                    voice_sample_3_url: formData.voiceSample3Url
                })
                .eq('id', user.id);

            if (error) throw error;
            setMessage({ type: "success", text: "Settings saved successfully! ✅" });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (err) {
            console.error("Error saving settings:", err);
            setMessage({ type: "error", text: "Failed to save settings. Please try again." });
        } finally {
            setSaving(false);
        }
    };

    const handleFbLogin = () => {
        setIsConnecting(true);
        window.FB.login((response: any) => {
            console.log("FB Login Response:", response);
            if (response.authResponse) {
                const userAccessToken = response.authResponse.accessToken;
                console.log("FB granted scopes:", response.authResponse.grantedScopes);
                console.log("FB user access token received, length:", userAccessToken?.length);
                fetchPages(userAccessToken);
            } else {
                setIsConnecting(false);
                if (response.status !== 'unknown') {
                    alert("Facebook Authorization failed: " + response.status);
                }
            }
        }, {
            scope: 'pages_manage_posts,pages_read_engagement,pages_show_list',
            auth_type: 'rerequest',
            return_scopes: true
        });
    };

    const fetchPages = (userAccessToken: string) => {
        setIsConnecting(true);
        console.log("Fetching pages with user access token...");
        window.FB.api(
            '/me/accounts',
            { access_token: userAccessToken, fields: 'id,name,access_token,category' },
            (response: any) => {
                console.log("FB /me/accounts response:", JSON.stringify(response));
                if (response.error) {
                    console.error("Facebook API error:", response.error);
                    alert(`Facebook Error: ${response.error.message}`);
                } else if (response.data && response.data.length > 0) {
                    console.log(`Found ${response.data.length} page(s):`, response.data.map((p: any) => p.name));
                    setFbPages(response.data);
                    setShowPageSelector(true);
                } else {
                    console.warn("No pages returned. response.data:", response.data);
                    // The user may not have granted page permissions — re-request with auth_type
                    setFbPages([]);
                    setShowPageSelector(true);
                }
                setIsConnecting(false);
            }
        );
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
                    pageAccessToken: page.access_token
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to save connection.");

            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            setProfile(data);
            setShowPageSelector(false);
            setMessage({ type: "success", text: `Successfully connected to ${page.name}! 🎉` });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectFb = async () => {
        setShowDisconnectConfirm(false);
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

            const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
            setProfile(data);
            setMessage({ type: "success", text: "Facebook disconnected successfully." });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleLinkedInLogin = async () => {
        console.log(">>> LinkedIn Connect clicked");
        setIsConnecting(true);
        try {
            let uid = profile?.id;
            if (!uid) {
                const { data: { user } } = await supabase.auth.getUser();
                uid = user?.id;
            }

            if (!uid) {
                alert("Please log in again to connect LinkedIn.");
                setIsConnecting(false);
                return;
            }

            console.log(">>> Redirecting to LinkedIn OAuth with userId:", uid);
            const url = `/api/auth/linkedin?userId=${uid}`;
            window.location.href = url;
        } catch (err: any) {
            console.error("LinkedIn connect error:", err);
            alert("Error connecting LinkedIn: " + err.message);
            setIsConnecting(false);
        }
    };

    const disconnectLinkedIn = async () => {
        setShowLinkedInDisconnectConfirm(false);
        setIsConnecting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('profiles').update({
                linkedin_access_token: null,
                linkedin_person_urn: null
            }).eq('id', user?.id);

            if (error) throw error;

            const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
            setProfile(data);
            setMessage({ type: "success", text: "LinkedIn disconnected successfully." });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center">
                <div className="animate-spin text-4xl">🌱</div>
            </div>
        );
    }

    const tabs = [
        { id: "farm", label: "Farm Details", icon: "🚜" },
        { id: "ai", label: "AI & Content", icon: "🪄" },
        { id: "connections", label: "Connections", icon: "🔗" },
        { id: "notifications", label: "Notifications", icon: "🔔" },
        { id: "account", label: "Account", icon: "👤" }
    ];

    return (
        <main className="min-h-screen bg-[#f8faf8] mb-20 px-4 md:px-0">
            <Header />

            <div className="max-w-[1200px] mx-auto py-10">
                <div className="flex flex-col md:flex-row gap-8">

                    {/* Sidebar Navigation */}
                    <div className="md:w-64 space-y-2">
                        <h1 className="text-2xl font-extrabold text-[#006633] mb-6 px-4">Settings</h1>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-left transition-all ${activeTab === tab.id
                                    ? "bg-[#006633] text-white shadow-lg shadow-green-900/20"
                                    : "text-gray-500 hover:bg-white hover:text-[#006633]"
                                    }`}
                            >
                                <span className="text-xl">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                        <div className="pt-10 px-4">
                            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm text-center">
                                <div className="text-3xl mb-3">💎</div>
                                <div className="text-sm font-bold text-gray-800">Pro Plan</div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Current Subscription</div>
                                <button className="w-full py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all">Manage</button>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1">
                        <form onSubmit={handleSave} className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">

                            <div className="p-10">

                                {activeTab === 'farm' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center justify-between mb-2">
                                            <h2 className="text-2xl font-extrabold text-[#333]">Farm Details</h2>
                                            <div className="text-sm font-bold text-[#006633] bg-green-50 px-3 py-1 rounded-full">Public Profile</div>
                                        </div>

                                        <div className="flex items-center gap-8 mb-10 p-8 bg-gray-50 rounded-3xl border border-gray-100">
                                            <label className="relative w-24 h-24 rounded-2xl bg-white flex items-center justify-center text-4xl border-2 border-dashed border-gray-200 shadow-sm overflow-hidden cursor-pointer group hover:border-[#006633] transition-all">
                                                {formData.farmLogoUrl ? (
                                                    <img src={formData.farmLogoUrl} alt="Logo" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                ) : (
                                                    <span>🚜</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-xl">✏️</span>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, 'farmLogoUrl')}
                                                    disabled={!!uploading}
                                                />
                                            </label>
                                            <div className="flex-1 space-y-2">
                                                <h3 className="font-bold text-lg">Farm Logo</h3>
                                                <p className="text-xs text-gray-500">
                                                    {uploading === 'farmLogoUrl' ? "Uploading..." : "Click the icon to upload your farm logo. Best in square format."}
                                                </p>
                                                {formData.farmLogoUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, farmLogoUrl: "" }))}
                                                        className="text-[10px] font-bold text-red-500 hover:underline"
                                                    >
                                                        Remove logo
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">Farm Name</label>
                                                    <input
                                                        type="text"
                                                        value={formData.farmName}
                                                        onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">Farm Type</label>
                                                    <select
                                                        value={formData.farmType}
                                                        onChange={(e) => setFormData({ ...formData, farmType: e.target.value })}
                                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium appearance-none"
                                                    >
                                                        <option>Organic Vegetable Farm</option>
                                                        <option>Fruit Orchard</option>
                                                        <option>Mixed Produce</option>
                                                        <option>Livestock & Produce</option>
                                                        <option>Urban Farm</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                                                    <input
                                                        type="text"
                                                        value={formData.location}
                                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">Farm Description</label>
                                                    <textarea
                                                        value={formData.farmDescription}
                                                        onChange={(e) => setFormData({ ...formData, farmDescription: e.target.value })}
                                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium min-h-[160px]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">Website</label>
                                                    <input
                                                        type="url"
                                                        value={formData.website}
                                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'ai' && (
                                    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center justify-between mb-2">
                                            <h2 className="text-2xl font-extrabold text-[#333]">AI & Content Preferences</h2>
                                            <div className="flex items-center gap-2 text-xs font-bold text-[#006633] bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider">
                                                <span>🪄</span> AI Training Active
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-8">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-3">Brand Voice</label>
                                                    <select
                                                        value={formData.brandVoice}
                                                        onChange={(e) => setFormData({ ...formData, brandVoice: e.target.value })}
                                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                    >
                                                        <option>Friendly & Casual</option>
                                                        <option>Professional & Informative</option>
                                                        <option>Enthusiastic & Energetic</option>
                                                        <option>Educational & Thoughtful</option>
                                                        <option>Warm & Community-Focused</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-3">Emoji Usage</label>
                                                    <select
                                                        value={formData.emojiUsage}
                                                        onChange={(e) => setFormData({ ...formData, emojiUsage: e.target.value })}
                                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                    >
                                                        <option>None</option>
                                                        <option>Minimal</option>
                                                        <option>Moderate (Recommended)</option>
                                                        <option>Generous</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-3">Default Hashtags</label>
                                                    <input
                                                        type="text"
                                                        value={formData.defaultHashtags}
                                                        onChange={(e) => setFormData({ ...formData, defaultHashtags: e.target.value })}
                                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-4 pt-4">
                                                    <label className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl hover:bg-gray-50 transition-all">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.autoLocation}
                                                            onChange={(e) => setFormData({ ...formData, autoLocation: e.target.checked })}
                                                            className="w-6 h-6 rounded-lg text-[#006633] focus:ring-[#006633]"
                                                        />
                                                        <span className="font-bold text-gray-700">Auto-include location in posts</span>
                                                    </label>
                                                    <label className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl hover:bg-gray-50 transition-all">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.autoCTA}
                                                            onChange={(e) => setFormData({ ...formData, autoCTA: e.target.checked })}
                                                            className="w-6 h-6 rounded-lg text-[#006633] focus:ring-[#006633]"
                                                        />
                                                        <span className="font-bold text-gray-700">Include "Visit us" call-to-action</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-gray-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="text-2xl">✍️</span>
                                                <h3 className="text-xl font-bold text-gray-800">Your Writing Style Samples</h3>
                                                <span className="text-[10px] font-bold text-[#006633] bg-green-50 px-2 py-1 rounded uppercase tracking-widest">AI training</span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-8 max-w-2xl">
                                                Paste 3 real posts you've written so our AI learns your unique tone, vocabulary, and style. The more authentic the examples, the better your AI-generated content will sound like <span className="italic font-bold">you</span>.
                                            </p>

                                            <div className="bg-green-50/50 p-6 rounded-3xl border-l-4 border-[#006633] mb-10 flex items-start gap-4">
                                                <div className="text-2xl">💡</div>
                                                <div>
                                                    <h4 className="font-bold text-[#006633] mb-1">Tips for Great Writing Samples</h4>
                                                    <p className="text-sm text-[#3a5a40] leading-relaxed">
                                                        Use posts that truly represent how you talk to customers — harvest updates, behind-the-scenes moments, or event announcements all work well. The AI picks up on your word choices, sentence length, how you use punctuation, and even your emoji habits.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                {[1, 2, 3].map((num) => (
                                                    <div key={num} className="bg-white border-2 border-gray-100 rounded-[32px] p-8 shadow-sm">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-[#006633] text-white flex items-center justify-center font-bold text-sm">
                                                                    {num}
                                                                </div>
                                                                <span className="font-bold text-gray-700">Writing Sample {num}</span>
                                                                {num === 1 && <span className="text-[10px] bg-green-50 text-[#006633] px-2 py-0.5 rounded font-bold uppercase">Required</span>}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                {(formData[`writingSample${num}` as keyof typeof formData] as string).length} characters
                                                            </span>
                                                        </div>
                                                        <textarea
                                                            value={formData[`writingSample${num}` as keyof typeof formData] as string}
                                                            onChange={(e) => setFormData({ ...formData, [`writingSample${num}`]: e.target.value })}
                                                            placeholder="Paste one of your real social media posts here. For example: a harvest update, a behind-the-scenes moment, or a customer message."
                                                            className="w-full min-h-[140px] p-6 bg-gray-50 border-2 border-transparent focus:border-[#006633] rounded-2xl outline-none transition-all font-medium text-gray-600 leading-relaxed"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-12 border-t border-gray-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="text-2xl">🎙️</span>
                                                <h3 className="text-xl font-bold text-gray-800">Voice Samples</h3>
                                                <span className="text-[10px] font-bold text-[#006633] bg-green-50 px-2 py-1 rounded uppercase tracking-widest">Voice Cloning</span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-8 max-w-2xl">
                                                Upload 3 audio recordings of yourself speaking. Our AI will use these to create a digital voice twin for your video content.
                                            </p>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {[1, 2, 3].map((num) => {
                                                    const url = formData[`voiceSample${num}Url` as keyof typeof formData] as string;
                                                    return (
                                                        <div key={num} className="relative group">
                                                            <div className={`block p-8 border-2 rounded-[32px] text-center transition-all ${url ? 'border-[#006633] bg-green-50/20' : 'border-2 border-dashed border-gray-200 bg-gray-50'}`}>
                                                                <label className="cursor-pointer">
                                                                    <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
                                                                        {url ? "🎙️" : "📁"}
                                                                    </div>
                                                                    <div className="font-bold text-sm text-gray-700 mb-1">
                                                                        {url ? `Sample ${num} Ready` : `Upload Sample ${num}`}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 font-medium">
                                                                        {uploading === `voiceSample${num}Url` ? "Uploading..." : url ? "Ready to clone" : "Click to upload mp3 / wav"}
                                                                    </div>
                                                                    <input
                                                                        type="file"
                                                                        accept="audio/*"
                                                                        className="hidden"
                                                                        onChange={(e) => handleFileUpload(e, `voiceSample${num}Url` as any)}
                                                                        disabled={!!uploading}
                                                                    />
                                                                </label>

                                                                {url && (
                                                                    <div className="mt-6 flex items-center justify-center gap-4">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handlePlayAudio(url)}
                                                                            className="w-12 h-12 rounded-full bg-[#006633] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                                                                        >
                                                                            ▶️
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (activeAudio) {
                                                                                    activeAudio.pause();
                                                                                    setActiveAudio(null);
                                                                                }
                                                                                setFormData(prev => ({ ...prev, [`voiceSample${num}Url`]: "" }));
                                                                            }}
                                                                            className="w-10 h-10 rounded-full bg-white text-gray-400 flex items-center justify-center shadow-md hover:text-red-500 transition-all border border-gray-100"
                                                                        >
                                                                            🗑️
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'account' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <h2 className="text-2xl font-extrabold text-[#333]">Account Settings</h2>

                                        <div className="flex items-center gap-8 mb-10 pb-10 border-b border-gray-100">
                                            <label className="relative w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-4xl border-4 border-white shadow-md overflow-hidden cursor-pointer group hover:border-[#006633] transition-all">
                                                {formData.profilePhotoUrl ? (
                                                    <img src={formData.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                ) : (
                                                    <span>👨‍🌾</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-xl">✏️</span>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, 'profilePhotoUrl')}
                                                    disabled={!!uploading}
                                                />
                                            </label>
                                            <div>
                                                <h3 className="font-bold text-lg mb-1">Profile Photo</h3>
                                                <p className="text-xs text-gray-400 mb-4 tracking-tight">
                                                    {uploading === 'profilePhotoUrl' ? "Uploading photo..." : "Click photo to change. Max size 2MB."}
                                                </p>
                                                <div className="flex gap-3">
                                                    {formData.profilePhotoUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, profilePhotoUrl: "" }))}
                                                            className="px-4 py-2 text-red-500 text-xs font-bold hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            Remove Photo
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                    placeholder="Your full name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={formData.notificationEmail}
                                                    disabled
                                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none bg-gray-50 text-gray-400 font-medium cursor-not-allowed"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-2">Email changes must be verified via security portal.</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={formData.phoneNumber}
                                                    onChange={(e) => setFormData({ ...formData, phoneNumber: formatPhoneNumber(e.target.value) })}
                                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                    placeholder="(555) 123-4567"
                                                    maxLength={14}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-6">
                                            <button type="button" className="text-sm font-bold text-[#006633] hover:underline flex items-center gap-2">
                                                <span>🔒</span> Change Password
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <h2 className="text-2xl font-extrabold text-[#333]">Notification Preferences</h2>

                                        <div className="max-w-xl space-y-8">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-3">Notification Email</label>
                                                <input
                                                    type="email"
                                                    value={formData.notificationEmail}
                                                    onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
                                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 font-medium"
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <label className="flex items-start gap-4 cursor-pointer p-6 rounded-3xl bg-gray-50 hover:bg-gray-100 transition-all">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.notifyPublished}
                                                        onChange={(e) => setFormData({ ...formData, notifyPublished: e.target.checked })}
                                                        className="w-6 h-6 mt-1 rounded-lg text-[#006633] focus:ring-[#006633]"
                                                    />
                                                    <div>
                                                        <div className="font-bold text-lg">Post Publishing</div>
                                                        <div className="text-sm text-gray-500">Get notified when posts go live on your social media.</div>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-4 cursor-pointer p-6 rounded-3xl bg-gray-50 hover:bg-gray-100 transition-all">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.notifyEngagement}
                                                        onChange={(e) => setFormData({ ...formData, notifyEngagement: e.target.checked })}
                                                        className="w-6 h-6 mt-1 rounded-lg text-[#006633] focus:ring-[#006633]"
                                                    />
                                                    <div>
                                                        <div className="font-bold text-lg">Weekly Engagement Summaries</div>
                                                        <div className="text-sm text-gray-500">Receive weekly reports on how your content is performing.</div>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-4 cursor-pointer p-6 rounded-3xl bg-gray-50 hover:bg-gray-100 transition-all">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.notifyTips}
                                                        onChange={(e) => setFormData({ ...formData, notifyTips: e.target.checked })}
                                                        className="w-6 h-6 mt-1 rounded-lg text-[#006633] focus:ring-[#006633]"
                                                    />
                                                    <div>
                                                        <div className="font-bold text-lg">Tips & Best Practices</div>
                                                        <div className="text-sm text-gray-500">Get helpful tips to improve your content strategy.</div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'connections' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <h2 className="text-2xl font-extrabold text-[#333] mb-8">Connections & Integrations</h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Facebook Integration Card */}
                                            <div className={`p-8 rounded-[40px] border-2 transition-all duration-300 relative group overflow-hidden ${profile?.fb_page_id ? 'bg-blue-50/30 border-blue-200' : 'bg-white border-transparent hover:border-gray-50 shadow-sm border-gray-100'}`}>
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

                                                {profile?.fb_page_id ? (
                                                    <>
                                                        <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 mb-8">
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Connection Details</div>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs">✓</span>
                                                                    Auto-publishing Active
                                                                </div>
                                                                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs">✓</span>
                                                                    Secure Token Encryption
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowDisconnectConfirm(true)}
                                                            disabled={isConnecting}
                                                            className="w-full py-4 bg-white border-2 border-red-50 text-red-500 font-black rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                                        >
                                                            {isConnecting ? <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div> : <span>⚠️ Disconnect Facebook Page</span>}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={isConnecting}
                                                        onClick={handleFbLogin}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[40px] shadow-xl shadow-blue-600/30 flex items-center justify-center gap-4 transition-all group active:scale-95 disabled:opacity-70 disabled:grayscale"
                                                    >
                                                        {isConnecting ? (
                                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        ) : (
                                                            <>
                                                                <span className="text-2xl group-hover:scale-125 transition-transform duration-300">🔗</span>
                                                                <span className="text-lg">Connect Facebook Page</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* LinkedIn Integration Card */}
                                            <div className={`p-8 rounded-[40px] border-2 transition-all duration-300 relative group overflow-hidden ${profile?.linkedin_person_urn ? 'bg-[#f3f9ff] border-[#0a66c2]/30' : 'bg-white border-transparent hover:border-gray-50 shadow-sm border-gray-100'}`}>
                                                {profile?.linkedin_person_urn && (
                                                    <div className="absolute top-0 right-0 py-2 px-6 bg-[#0a66c2] text-white text-[10px] font-black uppercase tracking-widest rounded-bl-3xl">
                                                        Active Connection
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-16 h-16 bg-[#0a66c2] text-white rounded-2xl flex items-center justify-center text-4xl font-bold shadow-lg shadow-[#0a66c2]/30">
                                                            in
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="text-2xl font-black text-gray-800 tracking-tight">LinkedIn</h3>
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-[#0a66c2]"></span>
                                                                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Professional Network</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {profile?.linkedin_person_urn ? (
                                                    <div className="mb-8 p-6 bg-white rounded-3xl border border-[#0a66c2]/20 shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                                                        <span className="text-[10px] font-black text-[#0a66c2] uppercase tracking-widest block mb-2">Connected Profile</span>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-[#0a66c2]/10 rounded-xl flex items-center justify-center text-[#0a66c2] font-bold text-xl uppercase border border-[#0a66c2]/20">
                                                                {profile.full_name ? profile.full_name.charAt(0) : 'LI'}
                                                            </div>
                                                            <div>
                                                                <div className="text-xl font-black text-gray-800">LinkedIn Profile</div>
                                                                <div className="text-xs text-gray-400 font-medium">B2B publishing ready</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mb-10 space-y-4">
                                                        <p className="text-gray-500 text-sm leading-relaxed font-medium">
                                                            Broaden your farm's reach. Connect LinkedIn to publish professional updates, build partnerships, and attract B2B opportunities.
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                                            <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full border border-gray-100">B2B Network</span>
                                                            <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full border border-gray-100">Rich Media</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {profile?.linkedin_person_urn ? (
                                                    <>
                                                        <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 mb-8">
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Connection Details</div>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs">✓</span>
                                                                    Profile Publishing Active
                                                                </div>
                                                                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs">✓</span>
                                                                    Secure Token Encryption
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowLinkedInDisconnectConfirm(true)}
                                                            disabled={isConnecting}
                                                            className="w-full py-4 bg-white border-2 border-red-50 text-red-500 font-black rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                                        >
                                                            {isConnecting ? <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div> : <span>⚠️ Disconnect LinkedIn</span>}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={isConnecting}
                                                        onClick={handleLinkedInLogin}
                                                        className="w-full bg-[#0a66c2] hover:bg-[#004182] text-white font-black py-5 rounded-[40px] shadow-xl shadow-[#0a66c2]/30 flex items-center justify-center gap-4 transition-all group active:scale-95 disabled:opacity-70 disabled:grayscale"
                                                    >
                                                        {isConnecting ? (
                                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        ) : (
                                                            <>
                                                                <span className="text-2xl group-hover:scale-125 transition-transform duration-300">🔗</span>
                                                                <span className="text-lg">Connect LinkedIn</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Instagram Integration Card (Coming Soon) */}
                                            <div className="bg-white p-8 rounded-[32px] border-2 border-transparent relative overflow-hidden flex flex-col shadow-sm">
                                                <div className="absolute top-0 right-0 bg-[#006633] text-white text-[10px] font-black uppercase px-6 py-1 transform translate-x-[30%] translate-y-[100%] rotate-45">
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

                                                <button type="button" className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 font-bold cursor-not-allowed">
                                                    Get Notified When Live
                                                </button>
                                            </div>

                                            {/* Mailchimp Integration Card (Coming Soon) */}
                                            <div className="bg-white p-8 rounded-[32px] border-2 border-transparent relative overflow-hidden flex flex-col shadow-sm">
                                                <div className="absolute top-0 right-0 bg-[#006633] text-white text-[10px] font-black uppercase px-6 py-1 transform translate-x-[30%] translate-y-[100%] rotate-45">
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

                                                <button type="button" className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 font-bold cursor-not-allowed">
                                                    Get Notified When Live
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Page Selection Modal Overlay */}
                            {showPageSelector && (
                                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-5 backdrop-blur-sm">
                                    <div className="bg-white rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl">
                                        <div className="p-8 border-b border-gray-50 flex flex-col gap-2 font-medium">
                                            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Select Farm Page</h3>
                                            <p className="text-gray-500 text-sm">Pick the business page to represent your farm.</p>
                                        </div>
                                        <div className="p-4 max-h-[400px] overflow-y-auto">
                                            {fbPages.length > 0 ? (
                                                fbPages.map(page => (
                                                    <button
                                                        key={page.id}
                                                        type="button"
                                                        onClick={() => connectPage(page)}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-blue-50 rounded-2xl transition-all border-2 border-transparent hover:border-blue-200 group mb-2"
                                                    >
                                                        <div className="flex items-center gap-4 text-left">
                                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl uppercase">
                                                                {page.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-800 group-hover:text-blue-700">{page.name}</div>
                                                                <div className="text-[10px] text-gray-400 font-bold uppercase">{page.category}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-10 text-center">
                                                    <div className="text-4xl mb-4 grayscale opacity-30">📋</div>
                                                    <div className="font-black text-gray-800 text-xl tracking-tight">No Business Pages Found</div>
                                                    <div className="mt-8 flex flex-col gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={handleFbLogin}
                                                            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg active:scale-95"
                                                        >
                                                            🔄 Refresh & Choose Pages
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8 bg-gray-50">
                                            <button type="button" onClick={() => setShowPageSelector(false)} className="w-full font-bold text-gray-500">Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Disconnect Confirmation Modal */}
                            {showDisconnectConfirm && (
                                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-5 backdrop-blur-sm">
                                    <div className="bg-white rounded-[40px] max-w-sm w-full overflow-hidden shadow-2xl">
                                        <div className="p-10 text-center">
                                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
                                            <h3 className="text-2xl font-black text-gray-800 tracking-tight mb-3">Wait a moment!</h3>
                                            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                                Are you sure you want to disconnect <span className="font-bold">{profile?.fb_page_name}</span>?
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                <button type="button" onClick={disconnectFb} className="w-full py-4 bg-red-500 text-white font-black rounded-2xl">Yes, Disconnect</button>
                                                <button type="button" onClick={() => setShowDisconnectConfirm(false)} className="w-full py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl">Keep Connected</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LinkedIn Disconnect Modal */}
                            {showLinkedInDisconnectConfirm && (
                                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-5 backdrop-blur-sm">
                                    <div className="bg-white rounded-[40px] max-w-sm w-full overflow-hidden shadow-2xl">
                                        <div className="p-10 text-center">
                                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
                                            <h3 className="text-2xl font-black text-gray-800 tracking-tight mb-3">Wait a moment!</h3>
                                            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                                Are you sure you want to disconnect your <span className="font-bold">LinkedIn Profile</span>?
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                <button type="button" onClick={disconnectLinkedIn} className="w-full py-4 bg-red-500 text-white font-black rounded-2xl">Yes, Disconnect</button>
                                                <button type="button" onClick={() => setShowLinkedInDisconnectConfirm(false)} className="w-full py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl">Keep Connected</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Sticky Save Footer */}
                            <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                <div className="text-sm">
                                    {message.text && (
                                        <div className={`font-bold ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                            {message.text}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={fetchProfile}
                                        className="px-8 py-4 rounded-2xl font-bold text-gray-500 hover:bg-white transition-all"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-[#006633] hover:bg-[#004d26] text-white font-bold px-12 py-4 rounded-2xl shadow-lg shadow-green-900/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Save Settings"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    );
}
