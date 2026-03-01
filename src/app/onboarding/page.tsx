"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
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

export default function OnboardingPage() {
    const [step, setStep] = useState(0); // 0: Welcome, 1: Phone, 2: Profile, 3: Style, 4: Social, 5: Notifications, 6: Complete
    const [loading, setLoading] = useState(false);
    const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
    const router = useRouter();

    // Form State
    const [formData, setFormData] = useState({
        phoneNumber: "",
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
        farmLogoUrl: ""
    });

    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile && !error) {
                setFormData({
                    phoneNumber: formatPhoneNumber(profile.phone_number || ""),
                    farmName: profile.farm_name || "",
                    farmType: profile.farm_type || "Organic Vegetable Farm",
                    farmDescription: profile.farm_description || "",
                    location: profile.location || "",
                    website: profile.website || "",
                    brandVoice: profile.brand_voice || "Friendly & Casual",
                    emojiUsage: profile.emoji_usage || "Moderate (Recommended)",
                    defaultHashtags: profile.default_hashtags || "#FarmFresh, #LocalFood, #OrganicProduce",
                    autoLocation: profile.auto_location ?? true,
                    autoCTA: profile.auto_cta ?? true,
                    notificationEmail: profile.notification_email || user.email || "",
                    notifyPublished: profile.notify_published ?? true,
                    notifyEngagement: profile.notify_engagement ?? true,
                    notifyTips: profile.notify_tips ?? true,
                    farmLogoUrl: profile.farm_logo_url || ""
                });
            }
        };

        fetchProfile();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-logo-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, farmLogoUrl: publicUrl }));
        } catch (err: any) {
            console.error("Upload error:", err);
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            await supabase
                .from('profiles')
                .update({ onboarding_completed: true })
                .eq('id', user.id);

            router.push("/dashboard");
        } catch (err) {
            console.error("Skip error:", err);
            router.push("/dashboard"); // Redirect anyway as fallback
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const completeOnboarding = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { error } = await supabase
                .from('profiles')
                .update({
                    phone_number: formData.phoneNumber,
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
                    notification_email: formData.notificationEmail || user.email,
                    notify_published: formData.notifyPublished,
                    notify_engagement: formData.notifyEngagement,
                    notify_tips: formData.notifyTips,
                    onboarding_completed: true,
                    farm_logo_url: formData.farmLogoUrl
                })
                .eq('id', user.id);

            if (error) throw error;
            router.push("/dashboard?onboarding=success");
        } catch (err) {
            console.error("Onboarding error:", err);
            alert("Failed to save profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const togglePlatform = (platform: string) => {
        if (connectedPlatforms.includes(platform)) {
            setConnectedPlatforms(prev => prev.filter(p => p !== platform));
        } else {
            setConnectedPlatforms(prev => [...prev, platform]);
        }
    };

    return (
        <main className="min-h-screen bg-[#f8faf8] font-sans text-[#333]">
            {/* Header only shows after welcome */}
            {step > 0 && (
                <div className="animate-in fade-in duration-700">
                    <Header />
                </div>
            )}

            <div className={`max-w-4xl mx-auto px-5 transition-all duration-500 ${step === 0 ? 'py-10' : 'py-12'}`}>

                {/* Progress Indicator (Hidden on Welcome and Complete) */}
                {step > 0 && step < 6 && (
                    <div className="mb-10 max-w-2xl mx-auto">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                            <span className={step >= 1 ? "text-[#006633]" : ""}>Phone</span>
                            <span className={step >= 2 ? "text-[#006633]" : ""}>Profile</span>
                            <span className={step >= 3 ? "text-[#006633]" : ""}>Style</span>
                            <span className={step >= 4 ? "text-[#006633]" : ""}>Social</span>
                            <span className={step >= 5 ? "text-[#006633]" : ""}>Notify</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#006633] transition-all duration-700 ease-in-out"
                                style={{ width: `${(step / 5) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                <div className="transition-all duration-500 ease-in-out">

                    {/* STEP 0: WELCOME */}
                    {step === 0 && (
                        <div className="text-center py-10 animate-in zoom-in-95 fade-in duration-1000">
                            <div className="text-[100px] mb-8 animate-bounce transition-all duration-1000">🌱</div>
                            <h1 className="text-5xl font-extrabold text-[#006633] mb-6 tracking-tight">
                                Welcome to LocalHarvest AI!
                            </h1>
                            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
                                We're thrilled to have you here. Let's get your farm set up so you can start
                                transforming your daily harvests into engaging social media content.
                            </p>

                            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-12 max-w-lg mx-auto transform transition-hover hover:scale-[1.02]">
                                <h3 className="text-lg font-bold text-[#006633] mb-4 flex items-center justify-center gap-2">
                                    <span>✨</span> Quick Setup
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">It only takes about 2 minutes to personalize your experience.</p>
                                <div className="flex flex-col items-center gap-4">
                                    <button
                                        onClick={nextStep}
                                        className="w-full bg-[#006633] hover:bg-[#004d26] text-white font-bold py-5 rounded-2xl text-xl shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-3"
                                    >
                                        Get Started <span>🚀</span>
                                    </button>
                                    <button
                                        onClick={handleSkip}
                                        className="text-sm font-bold text-gray-400 hover:text-[#006633] transition-all cursor-pointer"
                                        disabled={loading}
                                    >
                                        Skip setup for now →
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: PHONE NUMBER (NEW) */}
                    {step === 1 && (
                        <div className="bg-white rounded-[40px] shadow-2xl p-12 border border-green-50 animate-in slide-in-from-bottom-8 fade-in duration-700 text-center">
                            <div className="mb-10">
                                <div className="text-6xl mb-6">📱</div>
                                <h1 className="text-4xl font-extrabold text-[#006633] mb-4 tracking-tight">
                                    Add Your Phone Number
                                </h1>
                                <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed">
                                    Let's secure your account with a phone number
                                </p>
                            </div>

                            <div className="bg-green-50/50 border-l-4 border-[#006633] p-8 rounded-2xl mb-12 text-left max-w-2xl mx-auto">
                                <h3 className="text-[#006633] font-bold flex items-center gap-2 mb-3 text-lg">
                                    <span>🔐</span> Why This Matters
                                </h3>
                                <p className="text-gray-600 leading-relaxed font-medium">
                                    Your phone number is essential for account recovery. If you ever lose access to your account, we can use your phone to help you get back in quickly and securely.
                                </p>
                            </div>

                            <div className="max-w-md mx-auto mb-10 text-left">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number *</label>
                                <input
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: formatPhoneNumber(e.target.value) })}
                                    placeholder="(555) 123-4567"
                                    className="w-full p-5 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-xl font-bold"
                                    maxLength={14}
                                />
                            </div>

                            <div className="flex flex-col gap-5 max-w-md mx-auto">
                                <button
                                    onClick={nextStep}
                                    className="w-full bg-[#006633] hover:bg-[#004d26] text-white font-bold py-5 rounded-2xl text-xl shadow-lg transition-all flex items-center justify-center gap-3"
                                >
                                    Continue ➔
                                </button>
                                <button
                                    onClick={handleSkip}
                                    className="text-gray-400 font-bold hover:text-[#006633] transition-colors underline underline-offset-4"
                                    disabled={loading}
                                >
                                    Skip for now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: FARM PROFILE */}
                    {step === 2 && (
                        <div className="bg-white rounded-[40px] shadow-2xl p-12 border border-green-50 animate-in slide-in-from-bottom-8 fade-in duration-700">
                            <div className="text-center mb-10">
                                <div className="text-5xl mb-4">🚜</div>
                                <h2 className="text-3xl font-extrabold text-[#006633] mb-2">Create Your Farm Profile</h2>
                                <p className="text-gray-500">Share your farm's story and brand to help our AI personalize your content.</p>
                            </div>

                            {/* SaaS Logo Upload Section */}
                            <div className="flex flex-col items-center mb-12">
                                <label className="relative w-32 h-32 rounded-full bg-gray-50 flex items-center justify-center text-4xl border-4 border-white shadow-xl overflow-hidden cursor-pointer group hover:border-[#006633] transition-all">
                                    {formData.farmLogoUrl ? (
                                        <img src={formData.farmLogoUrl} alt="Farm Logo" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                        <span className="text-gray-300">🏢</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-2xl">✏️</span>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                </label>
                                <div className="mt-4 text-center">
                                    <h3 className="font-bold text-[#006633]">Farm Logo</h3>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black">
                                        {uploading ? "Uploading..." : "Click to upload your brand logo"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Farm Name *</label>
                                        <input
                                            type="text"
                                            value={formData.farmName}
                                            onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                                            placeholder="e.g. Green Valley Acres"
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Farm Type</label>
                                        <select
                                            value={formData.farmType}
                                            onChange={(e) => setFormData({ ...formData, farmType: e.target.value })}
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium appearance-none"
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
                                            placeholder="City, State"
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Farm Description</label>
                                        <textarea
                                            value={formData.farmDescription}
                                            onChange={(e) => setFormData({ ...formData, farmDescription: e.target.value })}
                                            placeholder="Tell us what makes your farm unique..."
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium min-h-[160px]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Website (Optional)</label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="https://yourfarm.com"
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-green-50/50 p-6 rounded-3xl mb-8">
                                <p className="text-sm text-[#006633] font-medium flex items-center gap-2">
                                    <span>💡</span> You can upload your farm logo in Settings later.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <button onClick={prevStep} className="flex-1 py-5 rounded-2xl font-bold text-gray-500 border-2 border-gray-100 hover:bg-gray-50 transition-all">
                                        Back
                                    </button>
                                    <button
                                        onClick={nextStep}
                                        disabled={!formData.farmName}
                                        className="flex-[2] bg-[#006633] hover:bg-[#004d26] text-white font-bold py-5 rounded-2xl text-lg shadow-lg disabled:opacity-50 transition-all"
                                    >
                                        Continue ➔
                                    </button>
                                </div>
                                <button
                                    onClick={handleSkip}
                                    className="text-sm font-bold text-gray-400 hover:text-[#006633] transition-all text-center cursor-pointer"
                                    disabled={loading}
                                >
                                    Skip for now →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CONTENT STYLE */}
                    {step === 3 && (
                        <div className="bg-white rounded-[40px] shadow-2xl p-12 border border-green-50 animate-in slide-in-from-bottom-8 fade-in duration-700">
                            <div className="text-center mb-10">
                                <div className="text-5xl mb-4">🪄</div>
                                <h2 className="text-3xl font-extrabold text-[#006633] mb-2">Personalize Your AI Voice</h2>
                                <p className="text-gray-500">Match your social media posts to your farm's unique personality.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-3">Brand Voice</label>
                                        <select
                                            value={formData.brandVoice}
                                            onChange={(e) => setFormData({ ...formData, brandVoice: e.target.value })}
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium"
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
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium"
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
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium"
                                        />
                                    </div>
                                    <div className="space-y-4 pt-4">
                                        <label className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={formData.autoLocation}
                                                onChange={(e) => setFormData({ ...formData, autoLocation: e.target.checked })}
                                                className="w-6 h-6 rounded-lg text-[#006633] focus:ring-[#006633]"
                                            />
                                            <span className="font-bold text-gray-700">Auto-include location in posts</span>
                                        </label>
                                        <label className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
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

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <button onClick={prevStep} className="flex-1 py-5 rounded-2xl font-bold text-gray-500 border-2 border-gray-100 hover:bg-gray-50 transition-all">
                                        Back
                                    </button>
                                    <button onClick={nextStep} className="flex-[2] bg-[#006633] hover:bg-[#004d26] text-white font-bold py-5 rounded-2xl text-lg shadow-lg transition-all">
                                        Continue ➔
                                    </button>
                                </div>
                                <button
                                    onClick={handleSkip}
                                    className="text-sm font-bold text-gray-400 hover:text-[#006633] transition-all text-center cursor-pointer"
                                    disabled={loading}
                                >
                                    Skip for now →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SOCIAL CONNECT */}
                    {step === 4 && (
                        <div className="bg-white rounded-[40px] shadow-2xl p-12 border border-green-50 animate-in slide-in-from-bottom-8 fade-in duration-700">
                            <div className="text-center mb-10">
                                <div className="text-5xl mb-4">🔗</div>
                                <h2 className="text-3xl font-extrabold text-[#006633] mb-2">Connect Your Social Media</h2>
                                <p className="text-gray-500">Link your accounts so we can publish posts directly for you.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 mb-10">
                                {[
                                    { name: 'Facebook', icon: '🔵', desc: 'Post to your Farm Page' },
                                    { name: 'Instagram', icon: '📸', desc: 'Share photos and reels' },
                                    { name: 'Twitter / X', icon: '⚫', desc: 'Quick updates for followers' },
                                    { name: 'LinkedIn', icon: '💼', desc: 'Professional farm news' }
                                ].map((platform) => (
                                    <div key={platform.name} className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${connectedPlatforms.includes(platform.name) ? 'border-[#006633] bg-green-50/50' : 'border-gray-100 hover:border-[#006633]'}`}>
                                        <div className="flex items-center gap-5">
                                            <div className="text-4xl">{platform.icon}</div>
                                            <div>
                                                <div className="font-bold text-lg">{platform.name}</div>
                                                <div className="text-sm text-gray-500">{platform.desc}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => togglePlatform(platform.name)}
                                            className={`px-8 py-3 rounded-xl font-bold transition-all ${connectedPlatforms.includes(platform.name) ? 'bg-[#006633] text-white' : 'bg-[#6b8e6b] hover:bg-[#006633] text-white'}`}
                                        >
                                            {connectedPlatforms.includes(platform.name) ? '✅ Connected' : 'Connect'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-3xl mb-10 text-center">
                                <p className="text-sm text-yellow-800 font-medium">
                                    <strong>Demo Mode:</strong> Click "Connect" to simulate a connection. In production, this opens a secure login window.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <button onClick={prevStep} className="flex-1 py-5 rounded-2xl font-bold text-gray-500 border-2 border-gray-100 hover:bg-gray-50 transition-all">
                                        Back
                                    </button>
                                    <button onClick={nextStep} className="flex-[2] bg-[#006633] hover:bg-[#004d26] text-white font-bold py-5 rounded-2xl text-lg shadow-lg transition-all">
                                        Continue ➔
                                    </button>
                                </div>
                                <button
                                    onClick={handleSkip}
                                    className="text-sm font-bold text-gray-400 hover:text-[#006633] transition-all text-center cursor-pointer"
                                    disabled={loading}
                                >
                                    Skip for now →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: NOTIFICATIONS */}
                    {step === 5 && (
                        <div className="bg-white rounded-[40px] shadow-2xl p-12 border border-green-50 animate-in slide-in-from-bottom-8 fade-in duration-700">
                            <div className="text-center mb-10">
                                <div className="text-5xl mb-4">🔔</div>
                                <h2 className="text-3xl font-extrabold text-[#006633] mb-2">Notification Preferences</h2>
                                <p className="text-gray-500">Choose how you'd like to stay informed.</p>
                            </div>

                            <div className="max-w-xl mx-auto space-y-8 mb-10">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Notification Email</label>
                                    <input
                                        type="email"
                                        value={formData.notificationEmail}
                                        onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
                                        placeholder="your@email.com"
                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-[#006633] outline-none transition-all bg-gray-50 text-lg font-medium"
                                    />
                                    <p className="text-xs text-gray-400 mt-2">We'll send updates and engagement reports here.</p>
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

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <button onClick={prevStep} className="flex-1 py-5 rounded-2xl font-bold text-gray-500 border-2 border-gray-100 hover:bg-gray-50 transition-all">
                                        Back
                                    </button>
                                    <button onClick={nextStep} className="flex-[2] bg-[#006633] hover:bg-[#004d26] text-white font-bold py-5 rounded-2xl text-lg shadow-lg transition-all">
                                        Review Setup ➔
                                    </button>
                                </div>
                                <button
                                    onClick={handleSkip}
                                    className="text-sm font-bold text-gray-400 hover:text-[#006633] transition-all text-center cursor-pointer"
                                    disabled={loading}
                                >
                                    Skip for now →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: REVIEW / COMPLETE */}
                    {step === 6 && (
                        <div className="bg-white rounded-[40px] shadow-2xl p-12 border border-green-50 animate-in zoom-in-95 fade-in duration-700">
                            <div className="text-center mb-10">
                                <div className="text-[80px] mb-8">🎉</div>
                                <h2 className="text-4xl font-extrabold text-[#006633] mb-4">You're All Set!</h2>
                                <p className="text-xl text-gray-500 max-w-lg mx-auto leading-relaxed">
                                    Awesome job! Your LocalHarvest AI account is now personalized and ready
                                    to help you grow your digital presence.
                                </p>
                            </div>

                            <div className="max-w-md mx-auto bg-green-50/50 rounded-4xl p-10 border border-green-100 mb-12">
                                <h3 className="font-bold text-[#006633] text-lg mb-6 flex items-center gap-2">
                                    <span>✅</span> Your Setup Summary:
                                </h3>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-4">
                                        <span className="text-2xl">🚜</span>
                                        <div>
                                            <div className="font-bold">{formData.farmName}</div>
                                            <div className="text-sm text-gray-500">{formData.farmType}</div>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-4">
                                        <span className="text-2xl">🪄</span>
                                        <div>
                                            <div className="font-bold">{formData.brandVoice} Voice</div>
                                            <div className="text-sm text-gray-500">{formData.emojiUsage} emojis</div>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-4">
                                        <span className="text-2xl">🔗</span>
                                        <div>
                                            <div className="font-bold">{connectedPlatforms.length} Platforms Linked</div>
                                            <div className="text-sm text-gray-500">{connectedPlatforms.join(', ') || 'None linked yet'}</div>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex flex-col gap-4 max-w-md mx-auto">
                                <button
                                    onClick={completeOnboarding}
                                    disabled={loading}
                                    className="w-full bg-[#006633] hover:bg-[#004d26] text-white font-bold py-6 rounded-2xl text-2xl shadow-xl shadow-green-900/20 transition-all flex items-center justify-center gap-3"
                                >
                                    {loading ? "Saving..." : "Start Creating Content 🚀"}
                                </button>
                                <button onClick={() => setStep(6)} className="text-sm text-gray-400 font-medium hover:text-[#006633] transition-colors">
                                    Need to change something? Go back
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
