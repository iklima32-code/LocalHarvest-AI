"use client";

import { useState, useEffect, Suspense } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContent, TEMPLATE_CONFIG } from "@/context/ContentContext";
import { photoTransfer } from "@/lib/photoTransfer";
import { supabase } from "@/lib/supabase";
import { postService, ContentPolicyError, assertContentPolicy } from "@/lib/posts";
import NavigationGuard from "@/components/NavigationGuard";


const mockOptions = [
    {
        caption: "🍅 Beautiful Heirloom Tomatoes! \n\nWe just harvested a fresh batch of these sun-ripened beauties. Perfect for your summer salads. Caught the first of the season this morning!",
        hashtags: "#FarmLife #LocalFood #SupportLocal #FarmFresh #HeirloomTomatoes",
        recommended: true,
        platform: "facebook"
    },
    {
        caption: "Look at these colors! 🌈 Our heirloom tomatoes are finally here. Come by the farm stand today and grab some before they're gone.",
        hashtags: "#OrganicFarming #TomatoSeason #FarmHarvest #FreshFromTheFarm",
        recommended: false,
        platform: "linkedin"
    }
];

function ContentPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const postId = searchParams.get("postId");
    const { formData, photos, setPhotos, videos, setVideos, clearContent } = useContent();
    const [options, setOptions] = useState<any[]>(mockOptions);
    const [usage, setUsage] = useState<any>(null);
    const [source, setSource] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(mode !== 'edit' && mode !== 'manual');
    const [selectedOption, setSelectedOption] = useState(0);
    const [retryCount, setRetryCount] = useState(0);

    const [isPublishing, setIsPublishing] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [editedCaption, setEditedCaption] = useState("");
    const [editedHashtags, setEditedHashtags] = useState("");

    // New View States
    const [view, setView] = useState<"review" | "preview">("preview");
    const [selectedPlatforms, setSelectedPlatforms] = useState({
        facebook_personal: true,
        facebook_business: true,
        linkedin: true
    });
    const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
    const [isPreviewEditing, setIsPreviewEditing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState<{ platform: string; message: string } | null>(null);
    const [platformForPreview, setPlatformForPreview] = useState<"facebook" | "linkedin">("facebook");
    const [publishProgress, setPublishProgress] = useState(0);

    const contentType = formData.contentType;
    const config = TEMPLATE_CONFIG[contentType] || null;

    const handleCopy = (e: React.MouseEvent | null, text: string, idx: number | null) => {
        if (e) e.stopPropagation();
        navigator.clipboard.writeText(text);
        if (idx !== null) {
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx(null), 2000);
        }
    };

    const savePostToDB = async (status: 'draft' | 'published', platform: string) => {
        const activeOption = options.find(o => o.platform === (platform === 'linkedin' ? 'linkedin' : 'facebook')) || options[0];
        const title = formData.primaryField || 'Content Post';
        if (!activeOption) return;

        assertContentPolicy({ title, content: activeOption.caption, hashtags: activeOption.hashtags });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const postPayload = {
                user_id: user.id,
                title,
                content: activeOption.caption,
                hashtags: activeOption.hashtags,
                template_type: formData.contentType,
                status,
                metadata: {
                    imageUrl: photos.length > 0 ? photos[0] : null,
                    videoUrl: videos.length > 0 ? videos[0] : null,
                    all_options: options,
                    platform, // Specific platform for this published entry
                    contentType: formData.contentType,
                    primaryField: formData.primaryField,
                    secondaryField: formData.secondaryField,
                    details: formData.details,
                    contentLength: formData.contentLength,
                    extra1: formData.extra1,
                },
            };

            // LOGIC:
            // 1. If we are saving a 'draft' and we are in 'edit' mode, UPDATE the existing draft record.
            // 2. If we are 'published', ALWAYS create a NEW row for that specific platform's history.
            if (status === 'draft' && mode === 'edit' && postId) {
                await postService.updatePost(postId, postPayload);
            } else {
                await postService.createPost(postPayload);
            }
        } catch (err) {
            console.error('Failed to save post to database:', err);
        }
    };

    /**
     * CLEANUP: If we were editing a draft and successfully published it to at least one place,
     * we should remove the original draft so it doesn't clutter the 'Drafts' tab.
     */
    const cleanupOriginalDraft = async () => {
        if (mode === 'edit' && postId) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
                }
            } catch (err) {
                console.error("Cleanup draft error:", err);
            }
        }
    };

    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (mode === "edit") return;
        if (photos.length === 0) {
            const { photos: transferredPhotos, videos: transferredVideos } = photoTransfer.get();
            if (transferredPhotos.length > 0) setPhotos(transferredPhotos);
            if (transferredVideos.length > 0) setVideos(transferredVideos);
        }
    }, []);

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
        if (!formData || !formData.contentType) {
            setIsGenerating(false);
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`;
            }
            const response = await fetch("/api/generate-content", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    contentData: formData,
                    contentType: formData.contentType,
                    profileSettings: profile ? {
                        brandVoice: profile.brand_voice,
                        emojiUsage: profile.emoji_usage,
                        defaultHashtags: profile.default_hashtags,
                        autoLocation: profile.auto_location,
                        autoCTA: profile.auto_cta,
                        location: profile.location,
                        farmName: profile.farm_name,
                        farmType: profile.farm_type,
                        farmDescription: profile.farm_description
                    } : null
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate content");
            }

            const data = await response.json();
            if (data.options && Array.isArray(data.options)) {
                setOptions(data.options);
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
        if (mode === "edit" || mode === "clone") {
            if (!postId) { setIsGenerating(false); return; }
            (async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) { setIsGenerating(false); return; }

                    const { data: post, error } = await supabase
                        .from("posts")
                        .select("*")
                        .eq("id", postId)
                        .eq("user_id", user.id)
                        .single();

                    if (error || !post) { setIsGenerating(false); return; }

                    if (post.metadata?.all_options && Array.isArray(post.metadata.all_options)) {
                        setOptions(post.metadata.all_options);
                        const initialOpt = post.metadata.all_options.find((o: any) => o.platform === platformForPreview) || post.metadata.all_options[0];
                        setEditedCaption(initialOpt.caption);
                        setEditedHashtags(initialOpt.hashtags);
                    } else {
                        const editOption = {
                            caption: post.content ?? "",
                            hashtags: post.hashtags ?? "",
                            recommended: true,
                            platform: post.metadata?.platform || "facebook"
                        };
                        setOptions([editOption]);
                        setEditedCaption(editOption.caption);
                        setEditedHashtags(editOption.hashtags);
                    }
                    if (post.metadata?.imageUrl) setPhotos([post.metadata.imageUrl]);
                    if (post.metadata?.videoUrl) setVideos([post.metadata.videoUrl]);
                    setView("preview");
                } catch (err) {
                    console.error("Edit mode load error:", err);
                } finally {
                    setIsGenerating(false);
                }
            })();
            return;
        }

        if (!formData || !formData.contentType) return;

        if (mode === "manual") {
            const manualOption = {
                caption: "Write your own caption ...",
                hashtags: "#FarmFresh",
                recommended: true,
                platform: "facebook"
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
    }, [formData, retryCount, mode, postId, profile]);

    const confirmPublish = async () => {
        setIsPublishing(true);
        setPublishProgress(5);
        const results: string[] = [];
        
        const platformsToCount = Object.values(selectedPlatforms).filter(Boolean).length;
        const perPlatformIncrement = 90 / (platformsToCount || 1);
        let currentProgress = 5;

        const fbOption = options.find(o => o.platform === 'facebook') || options[0];
        const liOption = options.find(o => o.platform === 'linkedin') || options[0];
        
        const photoToPost = photos.length > 0 ? photos[0] : null;
        const videoToPost = videos.length > 0 ? videos[0] : null;

        // PARALLEL: Trigger Facebook Personal Share first so popup isn't blocked by delays
        if (selectedPlatforms.facebook_personal) {
            const captionToPost = `${fbOption.caption}\n\n${fbOption.hashtags}`;
            navigator.clipboard.writeText(captionToPost);
            const shareUrl = photoToPost || videoToPost || window.location.origin;
            const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            window.open(fbShareUrl, '_blank', 'width=600,height=500');
            results.push("Facebook Personal");
            await savePostToDB('draft', 'facebook_personal');
        }

        try {
            if (selectedPlatforms.linkedin) {
                setPublishProgress(currentProgress + 2);
                const captionToPost = `${liOption.caption}\n\n${liOption.hashtags}`;
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
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
                    if (res.ok) {
                        results.push("LinkedIn");
                        await savePostToDB('published', 'linkedin');
                        currentProgress += perPlatformIncrement;
                        setPublishProgress(currentProgress);
                    }
                }
            }

            if (selectedPlatforms.facebook_business) {
                const captionToPost = `${fbOption.caption}\n\n${fbOption.hashtags}`;
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const res = await fetch("/api/publish-facebook", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            caption: captionToPost,
                            imageUrl: photoToPost,
                            videoUrl: videoToPost,
                            postBusiness: true,
                            postPersonal: false,
                            userId: user?.id
                        })
                    });
                    if (res.ok) {
                        results.push("Facebook Page");
                        await savePostToDB('published', 'facebook');
                        currentProgress += perPlatformIncrement;
                        setPublishProgress(currentProgress);
                    }
                }
            }

            // Facebook Personal was handled above at start to avoid blocked popups

            if (results.length > 0) {
                setPublishProgress(100);
                setShowSuccessModal({
                    platform: "multiple",
                    message: `Success! Posted to: ${results.join(", ")}.`
                });
                await cleanupOriginalDraft();
            } else {
                alert("No platforms selected for publishing.");
            }
        } catch (err: any) {
            console.error("Multi-publish error:", err);
            alert("An error occurred during publishing.");
        } finally {
            setTimeout(() => {
                setIsPublishing(false);
                setPublishProgress(0);
            }, 500);
        }
    };

    const handleSaveDraft = async () => {
        setIsPublishing(true);
        try {
            await savePostToDB('draft', 'none');
            setShowSuccessModal({
                platform: "draft",
                message: "Post saved as draft! You can view and finalize it in 'My Posts'."
            });
        } catch (err) {
            console.error("Save draft error:", err);
            alert("Failed to save draft.");
        } finally {
            setIsPublishing(false);
        }
    };

    if (isGenerating) {
        return (
            <main>
                <Header />
                <div className="max-w-[1200px] mx-auto py-20 px-5 text-center">
                    <div className="card max-w-lg mx-auto py-16">
                        <div className="w-16 h-16 border-4 border-gray-100 border-t-harvest-green rounded-full animate-spin mx-auto mb-8"></div>
                        <h2 className="text-3xl font-bold mb-3">{mode === 'edit' ? 'Restoring Your Draft...' : 'Creating Your Caption...'}</h2>
                        <p className="text-gray-600">{mode === 'edit' ? 'Bringing back your masterpiece' : 'Our AI is drafting high-engagement captions'}</p>
                    </div>
                </div>
            </main>
        );
    }

    if (view === "preview") {
        const option = options.find(o => o.platform === platformForPreview) || options[0];
        if (!option) return null;
        return (
            <main className="bg-[#f8faf8] min-h-screen pb-20">
                <Header />
                <NavigationGuard onSaveDraft={handleSaveDraft} showSaveOption />

                <div className="max-w-[800px] mx-auto py-10 px-5">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-700">Preview Your Post</h1>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    if (isPreviewEditing) {
                                        const idx = options.findIndex(o => o.platform === platformForPreview);
                                        const useIdx = idx !== -1 ? idx : 0;
                                        const newOptions = [...options];
                                        newOptions[useIdx] = {
                                            ...newOptions[useIdx],
                                            caption: editedCaption,
                                            hashtags: editedHashtags
                                        };
                                        setOptions(newOptions);
                                    } else {
                                        const opt = options.find(o => o.platform === platformForPreview) || options[0];
                                        setEditedCaption(opt.caption);
                                        setEditedHashtags(opt.hashtags);
                                    }
                                    setIsPreviewEditing(!isPreviewEditing);
                                }}
                                className={`flex items-center gap-2 px-6 py-2 border rounded-xl font-bold transition-all shadow-sm ${isPreviewEditing ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="text-orange-500">{isPreviewEditing ? "💾" : "✏️"}</span>
                                {isPreviewEditing ? "Save Changes" : "Edit"}
                            </button>
                            <button
                                onClick={() => router.push("/create/" + contentType)}
                                className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <p className="text-sm font-bold text-gray-500 ml-1">Previewing for:</p>
                            <div className="flex gap-3 flex-wrap">
                                {options.map((opt, i) => {
                                    const platform = opt.platform || 'unknown';
                                    const label = platform.charAt(0).toUpperCase() + platform.slice(1);
                                    const isFB = platform === 'facebook';
                                    const isLI = platform === 'linkedin';

                                    return (
                                        <button
                                            key={opt.platform || i}
                                            onClick={() => setPlatformForPreview(opt.platform)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${platformForPreview === opt.platform ? 'bg-blue-50 text-blue-600 border-2 border-blue-200' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            {isFB ? (
                                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                                </svg>
                                            ) : isLI ? (
                                                <svg className="w-4 h-4 text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.238 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                                </svg>
                                            ) : (
                                                <span>📱</span>
                                            )}
                                            {label}
                                        </button>
                                    );
                                })}
                                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gray-50 text-gray-400 border border-gray-200 opacity-60 cursor-not-allowed group" disabled title="Coming Soon">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-.332 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.277.058-2.148.261-2.911.558-.788.306-1.457.715-2.123 1.381s-1.075 1.335-1.381 2.123c-.297.763-.5 1.634-.558 2.911-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.058 1.277.261 2.148.558 2.911.306.788.715 1.457 1.381 2.123s1.335 1.075 2.123 1.381c.763.297 1.634.5 2.911.558 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.277-.058 2.148-.261 2.911-.558.788-.306 1.457-.715 2.123-1.381s1.075-1.335 1.381-2.123c.297-.763.5-1.634.558-2.911.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.058-1.277-.261-2.148-.558-2.911-.306-.788-.715-1.457-1.381-2.123s-1.335-1.075-2.123-1.381c-.763-.297-1.634-.5-2.911-.558-1.28-.058-1.688-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                    Instagram
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gray-50 text-gray-400 border border-gray-200 opacity-60 cursor-not-allowed" disabled>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.617a8.13 8.13 0 0 0 5.373 1.934V7.122a4.734 4.734 0 0 1-1.594-.436z"/>
                                    </svg>
                                    TikTok
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gray-50 text-gray-400 border border-gray-200 opacity-60 cursor-not-allowed" disabled>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.901 1.153h3.68l-8.04 9.19 9.457 12.504h-7.406l-5.8-7.584-6.638 7.584H.472l8.6-9.83L-.35 1.153h7.594l5.243 6.932 6.414-6.932zm-1.291 19.497h2.039L6.486 3.24H4.298l13.312 17.41z"/>
                                    </svg>
                                    X
                                </button>
                            </div>
                        </div>

                        {/* Social Post Preview Card */}
                        <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden max-w-[500px] mx-auto">
                            <div className="p-6 pb-4 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[#006633] border-4 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                    {profile?.farm_logo_url ? <img src={profile.farm_logo_url} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-xl font-serif">UF</span>}
                                </div>
                                <div className="font-black text-[15px] text-gray-900 leading-tight">{profile?.farm_name || "Your Farm"}</div>
                            </div>
                            <div className="px-6 pb-6">
                                {isPreviewEditing ? (
                                    <div className="space-y-4 mb-6">
                                        <textarea
                                            value={editedCaption || ""}
                                            onChange={(e) => setEditedCaption(e.target.value)}
                                            className="w-full min-h-[120px] p-4 bg-gray-50 border-2 border-harvest-green rounded-xl outline-none font-medium text-gray-800 text-sm leading-relaxed"
                                            placeholder="Write your caption..."
                                        />
                                        <input
                                            type="text"
                                            value={editedHashtags || ""}
                                            onChange={(e) => setEditedHashtags(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border-2 border-harvest-green rounded-xl outline-none font-bold text-harvest-green text-xs"
                                            placeholder="#hashtags"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-800 text-[14px] leading-relaxed mb-4 whitespace-pre-wrap">{option.caption}</p>
                                        <div className="text-blue-600 font-medium text-[13px] mb-6">{option.hashtags}</div>
                                    </>
                                )}
                                {photos.length > 0 ? (
                                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 aspect-square">
                                        <img src={photos[0]} alt="Content" className="w-full h-full object-cover" />
                                    </div>
                                ) : videos.length > 0 ? (
                                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-900 aspect-video">
                                        <video src={videos[0]} controls className="w-full h-full object-contain" />
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="bg-[#f2f9f5] rounded-[24px] p-6 border border-[#e0ede5]">
                            <h3 className="font-black text-[#2d5a3e] tracking-tight text-lg mb-4">Select Destinations</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${selectedPlatforms.facebook_personal ? 'bg-white border-harvest-green shadow-sm' : 'bg-white/40 border-transparent hover:bg-white/60'}`}>
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${selectedPlatforms.facebook_personal ? 'bg-harvest-green border-harvest-green' : 'border-gray-300'}`}>
                                        {selectedPlatforms.facebook_personal && <span className="text-white text-[10px]">✓</span>}
                                    </div>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <svg className="w-5 h-5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                        <div className="overflow-hidden">
                                            <span className={`font-bold text-sm block truncate ${selectedPlatforms.facebook_personal ? 'text-gray-900' : 'text-gray-500'}`}>Facebook Personal</span>
                                            <span className="text-[9px] text-gray-400 uppercase font-bold">Manual Copy</span>
                                        </div>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={selectedPlatforms.facebook_personal} onChange={() => setSelectedPlatforms(prev => ({ ...prev, facebook_personal: !prev.facebook_personal }))} />
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${selectedPlatforms.facebook_business ? 'bg-white border-harvest-green shadow-sm' : 'bg-white/40 border-transparent hover:bg-white/60'}`}>
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${selectedPlatforms.facebook_business ? 'bg-harvest-green border-harvest-green' : 'border-gray-300'}`}>
                                        {selectedPlatforms.facebook_business && <span className="text-white text-[10px]">✓</span>}
                                    </div>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <svg className="w-5 h-5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                        <div className="overflow-hidden">
                                            <span className={`font-bold text-sm block truncate ${selectedPlatforms.facebook_business ? 'text-gray-900' : 'text-gray-500'}`}>Facebook Business</span>
                                            <span className="text-[9px] text-gray-400 uppercase font-bold">Direct API</span>
                                        </div>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={selectedPlatforms.facebook_business} onChange={() => setSelectedPlatforms(prev => ({ ...prev, facebook_business: !prev.facebook_business }))} />
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${selectedPlatforms.linkedin ? 'bg-white border-harvest-green shadow-sm' : 'bg-white/40 border-transparent hover:bg-white/60'}`}>
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${selectedPlatforms.linkedin ? 'bg-harvest-green border-harvest-green' : 'border-gray-300'}`}>
                                        {selectedPlatforms.linkedin && <span className="text-white text-[10px]">✓</span>}
                                    </div>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <svg className="w-5 h-5 text-[#0077b5] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.238 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                        </svg>
                                        <div className="overflow-hidden">
                                            <span className={`font-bold text-sm block truncate ${selectedPlatforms.linkedin ? 'text-gray-900' : 'text-gray-500'}`}>LinkedIn Profile</span>
                                            <span className="text-[9px] text-gray-400 uppercase font-bold">Direct API</span>
                                        </div>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={selectedPlatforms.linkedin} onChange={() => setSelectedPlatforms(prev => ({ ...prev, linkedin: !prev.linkedin }))} />
                                </label>
                            </div>

                            <div className="pt-4 border-t border-harvest-green/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#2d5a3e]/60 mb-3">Available Soon:</p>
                                <div className="flex flex-wrap gap-2">
                                    <div className="px-3 py-1.5 bg-white/30 rounded-lg text-xs font-bold text-gray-500 flex items-center gap-2 border border-transparent">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-.332 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.277.058-2.148.261-2.911.558-.788.306-1.457.715-2.123 1.381s-1.075 1.335-1.381 2.123c-.297.763-.5 1.634-.558 2.911-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.058 1.277.261 2.148.558 2.911.306.788.715 1.457 1.381 2.123s1.335 1.075 2.123 1.381c.763.297 1.634.5 2.911.558 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.277-.058 2.148-.261 2.911-.558.788-.306 1.457-.715 2.123-1.381s1.075-1.335 1.381-2.123c.297-.763.5-1.634.558-2.911.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.058-1.277-.261-2.148-.558-2.911-.306-.788-.715-1.457-1.381-2.123s-1.335-1.075-2.123-1.381c-.763-.297-1.634-.5-2.911-.558-1.28-.058-1.688-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                        </svg>
                                        Instagram
                                        <span className="text-[8px] bg-gray-200 px-1 rounded text-gray-500">SOON</span>
                                    </div>
                                    <div className="px-3 py-1.5 bg-white/30 rounded-lg text-xs font-bold text-gray-500 flex items-center gap-2 border border-transparent">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.617a8.13 8.13 0 0 0 5.373 1.934V7.122a4.734 4.734 0 0 1-1.594-.436z"/>
                                        </svg>
                                        TikTok
                                        <span className="text-[8px] bg-gray-200 px-1 rounded text-gray-500">SOON</span>
                                    </div>
                                    <div className="px-3 py-1.5 bg-white/30 rounded-lg text-xs font-bold text-gray-500 flex items-center gap-2 border border-transparent">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18.901 1.153h3.68l-8.04 9.19 9.457 12.504h-7.406l-5.8-7.584-6.638 7.584H.472l8.6-9.83L-.35 1.153h7.594l5.243 6.932 6.414-6.932zm-1.291 19.497h2.039L6.486 3.24H4.298l13.312 17.41z"/>
                                        </svg>
                                        Twitter / X
                                        <span className="text-[8px] bg-gray-200 px-1 rounded text-gray-500">SOON</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={confirmPublish}
                                disabled={isPublishing || (!selectedPlatforms.facebook_personal && !selectedPlatforms.facebook_business && !selectedPlatforms.linkedin)}
                                className={`group relative w-full h-20 rounded-2xl shadow-xl overflow-hidden transition-all active:scale-[0.98] ${isPublishing ? 'bg-[#e7f3ea]' : 'bg-[#6a8b75] hover:bg-[#5a7b65]'}`}
                            >
                                {isPublishing ? (
                                    <>
                                        {/* Dynamic Progress Fill */}
                                        <div 
                                            className="absolute left-0 top-0 h-full bg-harvest-green transition-all duration-700 ease-out"
                                            style={{ width: `${publishProgress}%` }}
                                        />
                                        
                                        {/* Glossy Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

                                        {/* Status Content */}
                                        <div className="relative w-full h-full flex items-center justify-center gap-4 text-white">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full border-4 border-white/20"></div>
                                                <div className="absolute inset-0 rounded-full border-t-4 border-white animate-spin"></div>
                                                <span className="absolute inset-0 flex items-center justify-center text-xs">🌱</span>
                                            </div>
                                            <div className="flex flex-col items-start leading-none">
                                                <span className="font-black text-xl tracking-tight">Publishing Everywhere...</span>
                                                <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">{Math.round(publishProgress)}% Complete</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-white font-black text-xl flex items-center justify-center gap-3">
                                        🚀 Publish Everywhere Now
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={handleSaveDraft}
                                disabled={isPublishing}
                                className="w-full bg-white border-2 border-[#6a8b75] text-[#6a8b75] hover:bg-green-50 font-bold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all"
                            >
                                <span className="text-xl">📂</span> Save as Draft
                            </button>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100">
                             <div className="flex items-center justify-between p-6 rounded-[24px] bg-orange-50/50 border-2 border-orange-100/50 opacity-80 cursor-not-allowed transition-all hover:bg-orange-50">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">⏰</div>
                                    <div className="flex flex-col text-left">
                                        <span className="font-bold text-orange-400 uppercase tracking-widest text-[10px] mb-0.5">Premium Feature</span>
                                        <span className="font-black text-gray-700 text-lg">Schedule for Later</span>
                                        <span className="text-[11px] text-orange-500 font-bold flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                                            COMING SOON
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 py-1.5 bg-white rounded-full border border-orange-100 text-[10px] font-black text-orange-400 italic">UPGRADE</div>
                            </div>
                        </div>
                    </div>
                </div>

                {showSuccessModal && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-5 backdrop-blur-sm">
                        <div className="bg-white rounded-[40px] max-w-sm w-full p-10 text-center shadow-2xl">
                            <div className="w-20 h-20 bg-harvest-green rounded-full flex items-center justify-center text-white text-4xl mx-auto mb-6">✓</div>
                            <h3 className="text-2xl font-black mb-2">Success!</h3>
                            <p className="text-gray-600 mb-8">{showSuccessModal.message}</p>
                            <button 
                                onClick={() => {
                                    setShowSuccessModal(null);
                                    if (showSuccessModal.platform === "draft" || showSuccessModal.platform === "multiple") {
                                        router.push('/recent');
                                    }
                                }} 
                                className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl"
                            >
                                {showSuccessModal.platform === "draft" ? "View My Posts" : "Excellent"}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        );
    }

    return null; // Fallback
}

export default function ContentPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ContentPageInner />
        </Suspense>
    );
}
