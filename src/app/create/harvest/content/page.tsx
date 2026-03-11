"use client";

import { useState, useEffect, Suspense } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useHarvest } from "@/context/HarvestContext";
import { supabase } from "@/lib/supabase";

const mockOptions = [
    {
        caption: "🍅 Beautiful Heirloom Tomatoes! \n\nWe just harvested a fresh batch of these sun-ripened beauties. Perfect for your summer salads. Caught the first of the season this morning!",
        hashtags: "#FarmLife #LocalFood #SupportLocal #FarmFresh #HeirloomTomatoes",
        recommended: true
    },
    {
        caption: "Look at these colors! 🌈 Our heirloom tomatoes are finally here. Come by the farm stand today and grab some before they're gone.",
        hashtags: "#OrganicFarming #TomatoSeason #FarmHarvest #FreshFromTheFarm",
        recommended: false
    },
    {
        caption: "Nothing beats a sun-warmed tomato straight from the vine. ☀️ Freshly harvested today!",
        hashtags: "#FarmerMarket #HomeGrown #LocalProduce #SummerHarvest",
        recommended: false
    }
];

function HarvestContentInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const { formData: harvestData, photos, videos, clearHarvest } = useHarvest();
    const [options, setOptions] = useState<any[]>(mockOptions);
    const [usage, setUsage] = useState<any>(null);
    const [source, setSource] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [selectedOption, setSelectedOption] = useState(0);
    const [retryCount, setRetryCount] = useState(0);

    const [showPublishModal, setShowPublishModal] = useState(false);
    const [postPersonal, setPostPersonal] = useState(true);
    const [postBusiness, setPostBusiness] = useState(false);
    const [postLinkedIn, setPostLinkedIn] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [editedCaption, setEditedCaption] = useState("");
    const [editedHashtags, setEditedHashtags] = useState("");

    // New View States
    const [view, setView] = useState<"review" | "preview">("review");
    const [scheduleType, setScheduleType] = useState<"now" | "later" | "personal" | "instagram" | "linkedin">("personal");
    const [isPreviewEditing, setIsPreviewEditing] = useState(false);



    const handleCopy = (e: React.MouseEvent | null, text: string, idx: number | null) => {
        if (e) e.stopPropagation();
        navigator.clipboard.writeText(text);
        if (idx !== null) {
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx(null), 2000);
        }
    };

    const [profile, setProfile] = useState<any>(null);

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
        };
        fetchProfile();
    }, []);

    const fetchContent = async () => {
        if (!harvestData || !harvestData.produceType) {
            setIsGenerating(false);
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch("/api/generate-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    harvestData,
                    profileSettings: profile ? {
                        brandVoice: profile.brand_voice,
                        emojiUsage: profile.emoji_usage,
                        defaultHashtags: profile.default_hashtags,
                        autoLocation: profile.auto_location,
                        autoCTA: profile.auto_cta,
                        location: profile.location,
                        farmName: profile.farm_name
                    } : null
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate content");
            }

            const data = await response.json();
            if (data.options && Array.isArray(data.options)) {
                // Enforce exactly ONE recommended option
                let foundRecommended = false;
                const validatedOptions = data.options.map((opt: any, index: number) => {
                    let isRecommended = opt.recommended === true;
                    // If we already found one, force others to false
                    if (foundRecommended) {
                        isRecommended = false;
                    } else if (isRecommended) {
                        foundRecommended = true;
                    }
                    // If we reached the end and found none, force the first one
                    if (index === data.options.length - 1 && !foundRecommended) {
                        if (index === 0) isRecommended = true; // edge case
                    }
                    return { ...opt, recommended: isRecommended };
                });

                // Final safety check if they were all false
                if (!foundRecommended && validatedOptions.length > 0) {
                    validatedOptions[0].recommended = true;
                }

                // Sort array to guarantee the recommended option is always on top
                validatedOptions.sort((a: any, b: any) => Number(b.recommended) - Number(a.recommended));

                setOptions(validatedOptions);
                // Also reset selected option so the top one is selected by default
                setSelectedOption(0);
                setUsage(data.usage);
                setSource(data.source);
            } else {
                throw new Error("Invalid response format from AI");
            }
        } catch (err: any) {
            console.error("Content generation error:", err);
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (!harvestData || !harvestData.produceType) return;

        if (mode === "manual") {
            const manualOption = {
                caption: "Write your own ...",
                hashtags: "#FarmFresh",
                recommended: true
            };
            setOptions([manualOption]);
            setSelectedOption(0);
            setEditedCaption(manualOption.caption);
            setEditedHashtags(manualOption.hashtags);
            setIsGenerating(false);
            setView("preview");
            setIsPreviewEditing(true);
            return;
        }

        fetchContent();
    }, [harvestData, retryCount, mode, profile]);

    const handleEditStart = (idx: number) => {
        setIsEditing(idx);
        setEditedCaption(options[idx].caption);
        setEditedHashtags(options[idx].hashtags);
    };

    const handleEditSave = (idx: number) => {
        const newOptions = [...options];
        newOptions[idx] = {
            ...newOptions[idx],
            caption: editedCaption,
            hashtags: editedHashtags
        };
        setOptions(newOptions);
        setIsEditing(null);
    };

    const handleApprove = (action: "post" | "schedule") => {
        setScheduleType(action === "post" ? "now" : "later");
        setView("preview");
    };

    const confirmPublish = async () => {
        const caption = options[selectedOption].caption;
        const hashtags = options[selectedOption].hashtags;
        const captionToPost = `${caption}\n\n${hashtags}`;
        const photoToPost = photos.length > 0 ? photos[0] : null;
        const videoToPost = videos.length > 0 ? videos[0] : null;

        if (scheduleType === "personal" || scheduleType === "instagram") {
            setIsPublishing(true);

            // 1. Copy to clipboard so user can paste it
            try {
                await navigator.clipboard.writeText(captionToPost);
            } catch (err) {
                console.error("Clipboard copy failed:", err);
            }

            // 2. Open Share Dialog
            if (scheduleType === "personal") {
                const shareUrl = photoToPost || window.location.origin;
                const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                window.open(fbShareUrl, '_blank', 'width=600,height=500');
            } else {
                // Instagram doesn't have a direct 'sharer.php' for web that reliably fills content,
                // so we point them to the site and they can paste and upload.
                window.open("https://www.instagram.com/", '_blank');
            }

            // 3. Complete step
            setIsPublishing(false);
            return;
        }

        if (scheduleType === "linkedin") {
            setIsPublishing(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Not logged in");

                const res = await fetch("/api/publish-linkedin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        caption: captionToPost,
                        imageUrl: photoToPost,
                        videoUrl: videoToPost,
                        userId: user.id,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to publish to LinkedIn");

                setIsPublishing(false);
                setShowPublishModal(false);
                alert("Successfully published to LinkedIn!");
            } catch (err: any) {
                setIsPublishing(false);
                console.error("LinkedIn publish error:", err);
                if (err.message.includes("not connected") || err.message.includes("LinkedIn not connected")) {
                    alert("LinkedIn is not connected. Please go to Settings > Integrations to connect your LinkedIn account.");
                } else {
                    alert(`Error publishing to LinkedIn: ${err.message}`);
                }
            }
            return;
        }

        // Logic for other types (if ever enabled)
        if (!postPersonal && !postBusiness) {
            alert("Please select at least one destination to publish.");
            return;
        }

        setIsPublishing(true);

        try {
            const res = await fetch("/api/publish-facebook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caption: captionToPost,
                    imageUrl: photoToPost,
                    videoUrl: videoToPost,
                    postBusiness,
                    postPersonal
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.details || "Failed to publish to Facebook");
            }

            if (postPersonal) {
                const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoToPost || window.location.href)}&quote=${encodeURIComponent(captionToPost)}`;
                window.open(fbShareUrl, '_blank', 'width=600,height=400');
            }

            setIsPublishing(false);
            setShowPublishModal(false);
            // Stay on page
        } catch (err: any) {
            setIsPublishing(false);
            console.error("Facebook publish error:", err);

            if (err.message.includes("credentials")) {
                alert(`⚠️ Missing Facebook API Keys:\n\nTo actually post to your Business Page, you need to add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN to your .env file.`);
                setShowPublishModal(false);
            } else {
                alert(`Error publishing to Facebook: ${err.message}`);
            }
        }
    };

    if (isGenerating) {
        return (
            <main>
                <Header />
                <div className="max-w-[1200px] mx-auto py-20 px-5 text-center">
                    <div className="card max-w-lg mx-auto py-16">
                        <div className="w-16 h-16 border-4 border-gray-100 border-t-harvest-green rounded-full animate-spin mx-auto mb-8"></div>
                        <h2 className="text-3xl font-bold mb-3">Creating Your Content...</h2>
                        <p className="text-gray-600">Our AI is drafting high-engagement captions for your harvest</p>

                        <div className="mt-10 space-y-4 max-w-sm mx-auto text-left">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <span className="text-2xl">✍️</span>
                                <span className="text-sm text-gray-700">Writing catchy captions</span>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <span className="text-2xl">🏷️</span>
                                <span className="text-sm text-gray-700">Selecting optimal hashtags</span>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <span className="text-2xl">📈</span>
                                <span className="text-sm text-gray-700">Optimizing for engagement</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (view === "preview") {
        const option = options[selectedOption];
        return (
            <main className="bg-[#f8faf8] min-h-screen pb-20">
                <Header />
                <div className="max-w-[800px] mx-auto py-10 px-5">
                    {/* Header with Edit/Back */}
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-700">Preview Your Post</h1>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    if (isPreviewEditing) {
                                        const newOptions = [...options];
                                        newOptions[selectedOption] = {
                                            ...newOptions[selectedOption],
                                            caption: editedCaption,
                                            hashtags: editedHashtags
                                        };
                                        setOptions(newOptions);
                                    } else {
                                        setEditedCaption(option.caption);
                                        setEditedHashtags(option.hashtags);
                                    }
                                    setIsPreviewEditing(!isPreviewEditing);
                                }}
                                className={`flex items-center gap-2 px-6 py-2 border rounded-xl font-bold transition-all shadow-sm ${isPreviewEditing ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="text-orange-500">{isPreviewEditing ? "💾" : "✏️"}</span>
                                {isPreviewEditing ? "Save Changes" : "Edit"}
                            </button>
                            <button
                                onClick={() => mode === "manual" ? router.push("/create/harvest") : setView("review")}
                                className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Platform Toggles */}
                        <div className="space-y-3">
                            <p className="text-sm font-bold text-gray-500 ml-1">Publishing to:</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPostBusiness(!postBusiness)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${postBusiness ? 'bg-blue-50 text-blue-600 border-2 border-blue-200' : 'bg-white text-gray-400 border border-gray-200'}`}
                                >
                                    <span className="text-blue-500">📘</span> Facebook
                                </button>
                                <button
                                    onClick={() => setPostLinkedIn(!postLinkedIn)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${postLinkedIn ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-white text-gray-400 border border-gray-200'}`}
                                >
                                    <span className="font-black">in</span> LinkedIn
                                </button>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-pink-50 text-pink-600 border-2 border-pink-100 opacity-60 cursor-not-allowed"
                                >
                                    <span className="">📸</span> Instagram
                                </button>
                            </div>
                        </div>

                        {/* Social Post Preview Card */}
                        <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden max-w-[500px] mx-auto">
                            <div className="p-6 pb-4 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[#006633] border-4 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                    {profile?.farm_logo_url ? (
                                        <img src={profile.farm_logo_url} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white font-bold text-xl font-serif">UF</span>
                                    )}
                                </div>
                                <div>
                                    <div className="font-black text-[15px] text-gray-900 leading-tight">{profile?.farm_name || "Your Farm"}</div>
                                    <div className="flex items-center gap-1 text-gray-400 text-[11px] font-bold">
                                        <span>Just now</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-0.5">🌎 Public</span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 pb-6">
                                {isPreviewEditing ? (
                                    <div className="space-y-4 mb-6">
                                        <textarea
                                            value={editedCaption}
                                            onChange={(e) => setEditedCaption(e.target.value)}
                                            className="w-full min-h-[120px] p-4 bg-gray-50 border-2 border-harvest-green rounded-xl outline-none font-medium text-gray-800 text-sm leading-relaxed"
                                            placeholder="Write your caption..."
                                            autoFocus
                                            onFocus={(e) => e.currentTarget.select()}
                                        />
                                        <input
                                            type="text"
                                            value={editedHashtags}
                                            onChange={(e) => setEditedHashtags(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border-2 border-harvest-green rounded-xl outline-none font-bold text-harvest-green text-xs"
                                            placeholder="#hashtags"
                                        />
                                        <button
                                            onClick={() => {
                                                const newOptions = [...options];
                                                newOptions[selectedOption] = {
                                                    ...newOptions[selectedOption],
                                                    caption: editedCaption,
                                                    hashtags: editedHashtags
                                                };
                                                setOptions(newOptions);
                                                setIsPreviewEditing(false);
                                            }}
                                            className="w-full py-2 bg-harvest-green text-white font-bold rounded-lg text-xs"
                                        >
                                            Done Editing
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-800 text-[14px] leading-relaxed mb-4 whitespace-pre-wrap">
                                            {option.caption}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mb-6">
                                            {option.hashtags.split(" ").map((tag: string) => (
                                                <span key={tag} className="text-blue-600 font-medium text-[13px] hover:underline cursor-pointer">{tag}</span>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {photos.length > 0 ? (
                                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 aspect-square">
                                        <img src={photos[0]} alt="Harvest" className="w-full h-full object-cover" />
                                    </div>
                                ) : videos.length > 0 ? (
                                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-900 aspect-video">
                                        <video src={videos[0]} controls className="w-full h-full object-contain" />
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Publishing Schedule Section */}
                        <div className="bg-[#f2f9f5] rounded-[24px] p-8 border border-[#e0ede5] space-y-6">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🗓️</span>
                                <h3 className="font-black text-[#2d5a3e] tracking-tight">Publishing Schedule</h3>
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center justify-between p-5 rounded-[20px] cursor-pointer transition-all border-2 ${scheduleType === 'personal' ? 'bg-white border-[#006633] shadow-md' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${scheduleType === 'personal' ? 'border-[#006633]' : 'border-gray-300'}`}>
                                            {scheduleType === 'personal' && <div className="w-3 h-3 bg-[#006633] rounded-full"></div>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${scheduleType === 'personal' ? 'text-gray-900' : 'text-gray-500'}`}>Share to Facebook Personal Page</span>
                                            <span className="text-[10px] text-gray-400 font-medium tracking-tight">Opens Facebook dialog & copies content to clipboard</span>
                                        </div>
                                    </div>
                                    <input type="radio" className="hidden" name="schedule" checked={scheduleType === 'personal'} onChange={() => setScheduleType('personal')} />
                                </label>

                                <label className={`flex items-center justify-between p-5 rounded-[20px] cursor-pointer transition-all border-2 ${scheduleType === 'instagram' ? 'bg-white border-[#006633] shadow-md' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${scheduleType === 'instagram' ? 'border-[#006633]' : 'border-gray-300'}`}>
                                            {scheduleType === 'instagram' && <div className="w-3 h-3 bg-[#006633] rounded-full"></div>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${scheduleType === 'instagram' ? 'text-gray-900' : 'text-gray-500'}`}>Share to Instagram Feed</span>
                                            <span className="text-[10px] text-gray-400 font-medium tracking-tight">Opens Instagram & copies content to clipboard</span>
                                        </div>
                                    </div>
                                    <input type="radio" className="hidden" name="schedule" checked={scheduleType === 'instagram'} onChange={() => setScheduleType('instagram')} />
                                </label>

                                <label className={`flex items-center justify-between p-5 rounded-[20px] cursor-pointer transition-all border-2 ${scheduleType === 'linkedin' ? 'bg-white border-[#006633] shadow-md' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${scheduleType === 'linkedin' ? 'border-[#006633]' : 'border-gray-300'}`}>
                                            {scheduleType === 'linkedin' && <div className="w-3 h-3 bg-[#006633] rounded-full"></div>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${scheduleType === 'linkedin' ? 'text-gray-900' : 'text-gray-500'}`}>Publish to LinkedIn</span>
                                            <span className="text-[10px] text-gray-400 font-medium tracking-tight">Posts directly to your LinkedIn profile</span>
                                        </div>
                                    </div>
                                    <input type="radio" className="hidden" name="schedule" checked={scheduleType === 'linkedin'} onChange={() => setScheduleType('linkedin')} />
                                </label>

                                <label className="flex items-center justify-between p-5 rounded-[20px] transition-all border-2 bg-gray-50/50 border-transparent opacity-60 cursor-not-allowed">
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center">
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-400">Post Now (Demo Mode)</span>
                                            <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">Coming Soon</span>
                                        </div>
                                    </div>
                                    <input type="radio" className="hidden" disabled />
                                </label>

                                <label className="flex items-center justify-between p-5 rounded-[20px] transition-all border-2 bg-gray-50/50 border-transparent opacity-60 cursor-not-allowed">
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center">
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-400">Schedule for Later</span>
                                            <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">Coming Soon</span>
                                        </div>
                                    </div>
                                    <input type="radio" className="hidden" disabled />
                                </label>
                            </div>
                        </div>

                        {/* Final Publish Button */}
                        <button
                            onClick={confirmPublish}
                            disabled={isPublishing}
                            className="w-full bg-[#6a8b75] hover:bg-[#5a7b65] text-white font-bold py-6 rounded-2xl shadow-xl shadow-green-900/10 flex items-center justify-center gap-3 transition-all text-xl"
                        >
                            {isPublishing ? (
                                <>
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Publishing...
                                </>
                            ) : (
                                <>
                                    <span>🚀</span> Publish Post
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </main>
        );
    }

    return (
        <main>
            <Header />

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="card">
                    <div className="flex justify-between items-center pb-5 border-b-2 border-gray-100 mb-10">
                        <h2 className="text-2xl font-bold text-harvest-green">Review Content Options</h2>
                        <Link href="/create/harvest" className="button-secondary text-sm px-4 py-2">
                            Back
                        </Link>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Harvest Summary Card with Photos */}
                        <div className="flex flex-col md:flex-row gap-6">
                            {harvestData && (
                                <div className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 flex flex-wrap gap-8 items-center shadow-sm">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-harvest-green uppercase tracking-wider mb-2">Harvest Summary</div>
                                        <h4 className="text-xl font-bold text-gray-800">
                                            {harvestData.quantity && `${harvestData.quantity} ${harvestData.unit} of `}
                                            {harvestData.variety} {harvestData.produceType}
                                        </h4>
                                        {harvestData.notes && (
                                            <p className="text-sm text-gray-500 mt-2 italic line-clamp-2">"{harvestData.notes}"</p>
                                        )}
                                    </div>
                                    <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">Style</div>
                                        <div className="text-sm font-bold text-gray-700 capitalize">{harvestData.contentLength} Copy</div>
                                    </div>
                                </div>
                            )}

                            {/* Media Strip */}
                            {(photos.length > 0 || videos.length > 0) && (
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:max-w-[300px]">
                                    {photos.map((url, i) => (
                                        <div key={`p${i}`} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-white shadow-md">
                                            <img src={url} alt={`Harvest ${i + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {videos.map((url, i) => (
                                        <div key={`v${i}`} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-harvest-green shadow-md bg-gray-900 relative">
                                            <video src={url} className="w-full h-full object-cover" muted />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-white text-xl drop-shadow">▶</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="text-center mb-10">
                            <h3 className="text-3xl font-bold mb-3">Select the best caption</h3>
                            <p className="text-gray-600 text-lg">Our AI generated a few variations for you</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 text-center">
                                <div className="text-3xl mb-3">⚠️</div>
                                <h4 className="text-lg font-bold text-red-700 mb-2">Generation Failed</h4>
                                <p className="text-sm text-red-600 mb-4">You've hit the Gemini free-tier quota (Limit: 20 per minute). Please wait 30 seconds or use the backup templates below.</p>
                                <button
                                    onClick={() => setRetryCount(prev => prev + 1)}
                                    className="bg-red-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-red-700 transition-all"
                                >
                                    Try Again
                                </button>
                                <p className="text-[10px] text-red-400 mt-4 italic">Using fallback data below for preview</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            {options.map((option, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedOption(idx)}
                                    className={`p-0 border-4 rounded-3xl cursor-pointer transition-all overflow-hidden ${selectedOption === idx
                                        ? "border-harvest-green bg-white shadow-xl scale-[1.02]"
                                        : "border-gray-50 bg-white hover:border-harvest-green/30"
                                        }`}
                                >
                                    {/* Social Media Style Header */}
                                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
                                                {profile?.farm_logo_url ? (
                                                    <img src={profile.farm_logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xl">🚜</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-black text-sm text-gray-800">{profile?.farm_name || "Your Farm"}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sponsored • AI Draft</div>
                                            </div>
                                        </div>
                                        {option.recommended && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-[9px] font-black rounded-full uppercase tracking-widest animate-pulse">
                                                ★ Best Performance
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        <div className="flex justify-end gap-3 mb-4">
                                            {isEditing === idx ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditSave(idx); }}
                                                    className="px-4 py-1 bg-harvest-green text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm hover:bg-green-700 transition-all"
                                                >
                                                    💾 Save Edit
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditStart(idx); }}
                                                    className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black text-gray-400 hover:text-[#006633] hover:border-[#006633] transition-all flex items-center gap-1 uppercase tracking-wider"
                                                >
                                                    ✏️ Edit Post
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleCopy(e, `${option.caption}\n\n${option.hashtags}`, idx)}
                                                className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black text-gray-400 hover:text-harvest-green hover:border-harvest-green transition-all flex items-center gap-1 uppercase tracking-wider"
                                            >
                                                {copiedIdx === idx ? "✅ Copied" : "📋 Copy"}
                                            </button>
                                        </div>

                                        {isEditing === idx ? (
                                            <div className="space-y-4">
                                                <textarea
                                                    value={editedCaption}
                                                    onChange={(e) => setEditedCaption(e.target.value)}
                                                    className="w-full min-h-[120px] p-4 bg-white border-2 border-harvest-green rounded-xl outline-none font-medium text-gray-800 leading-relaxed"
                                                    autoFocus
                                                />
                                                <input
                                                    type="text"
                                                    value={editedHashtags}
                                                    onChange={(e) => setEditedHashtags(e.target.value)}
                                                    className="w-full p-3 bg-white border-2 border-harvest-green rounded-xl outline-none font-bold text-harvest-green text-sm"
                                                    placeholder="#hashtags"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-gray-800 leading-relaxed mb-6 whitespace-pre-wrap font-medium">{option.caption}</p>
                                                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                                                    {option.hashtags.split(" ").map((tag: string) => (
                                                        <span key={tag} className="text-harvest-green font-bold text-xs">{tag}</span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {source && (
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-mono tracking-tight bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                    Source: {source} {usage?.totalTokens > 0 && `| ${usage.totalTokens} tokens used`}
                                </span>
                                {source === "Template Fallback" && (
                                    <span className="text-[10px] text-amber-500 font-bold italic">
                                        ⚠️ AI Busy: Showing high-engagement harvest templates
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="pt-10 flex flex-col gap-4">
                            <button
                                onClick={() => setView("preview")}
                                className="w-full bg-harvest-green hover:bg-green-800 text-white font-bold py-6 rounded-2xl shadow-xl shadow-green-900/10 flex items-center justify-center gap-3 transition-all text-xl"
                            >
                                🔍 Preview Your Post
                            </button>
                            <button
                                onClick={() => setRetryCount(prev => prev + 1)}
                                className="w-full text-center text-gray-500 hover:text-harvest-green font-bold text-sm transition-colors py-4"
                            >
                                🔄 Didn't like these? Regenerate Options
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PUBLISH TO FACEBOOK MODAL */}
            {showPublishModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Publish to Facebook</h3>
                            <button
                                onClick={() => !isPublishing && setShowPublishModal(false)}
                                disabled={isPublishing}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >&times;</button>
                        </div>

                        <div className="p-6 space-y-6">
                            <p className="text-gray-600 text-sm">Select where you'd like to share this harvest update. Your selected caption and photo will be posted directly.</p>

                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">📋</span>
                                        <div className="text-xs text-amber-800 font-medium">Copy caption now to paste manually if needed</div>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(null, `${options[selectedOption].caption}\n\n${options[selectedOption].hashtags}`, 999)}
                                        className="bg-white px-3 py-1 rounded-md text-[10px] font-bold border border-amber-200 hover:bg-amber-100 transition-colors"
                                    >
                                        {copiedIdx === 999 ? "✅ Copied" : "Copy Caption"}
                                    </button>
                                </div>

                                {/* Personal Page Toggle */}
                                <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${postPersonal ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl">👤</div>
                                        <div>
                                            <div className="font-bold text-gray-800">Personal Timeline</div>
                                            <div className="text-xs text-gray-500">Share with friends & family</div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded border flex items-center justify-center ${postPersonal ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                                        {postPersonal && <span>✓</span>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={postPersonal} onChange={() => setPostPersonal(!postPersonal)} disabled={isPublishing} />
                                </label>

                                {/* Business Page Toggle */}
                                <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${postBusiness ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl">🏪</div>
                                        <div>
                                            <div className="font-bold text-gray-800">Farm Business Page</div>
                                            <div className="text-xs text-gray-500">Share with followers & customers</div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded border flex items-center justify-center ${postBusiness ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                                        {postBusiness && <span>✓</span>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={postBusiness} onChange={() => setPostBusiness(!postBusiness)} disabled={isPublishing} />
                                </label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                            <button
                                onClick={() => setShowPublishModal(false)}
                                disabled={isPublishing}
                                className="button-secondary flex-1 justify-center py-3"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmPublish}
                                disabled={isPublishing || (!postPersonal && !postBusiness)}
                                className="flex-1 justify-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isPublishing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-lg">f</span> Publish Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function HarvestContent() {
    return (
        <Suspense fallback={
            <main>
                <Header />
                <div className="max-w-[1200px] mx-auto py-20 px-5 text-center">
                    <div className="card max-w-lg mx-auto py-16">
                        <div className="w-16 h-16 border-4 border-gray-100 border-t-harvest-green rounded-full animate-spin mx-auto mb-8"></div>
                        <h2 className="text-2xl font-bold">Loading...</h2>
                    </div>
                </div>
            </main>
        }>
            <HarvestContentInner />
        </Suspense>
    );
}
