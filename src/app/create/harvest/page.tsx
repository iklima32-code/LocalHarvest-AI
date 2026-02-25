"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useHarvest } from "@/context/HarvestContext";
import { supabase } from "@/lib/supabase";

export default function HarvestWorkflow() {
    const router = useRouter();
    const { formData, setFormData, photos, setPhotos } = useHarvest();

    const [activeTab, setActiveTab] = useState<"upload" | "gallery" | "ai">("upload");
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiStyle, setAiStyle] = useState("photorealistic");
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [showPhotoTips, setShowPhotoTips] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [imageUsage, setImageUsage] = useState<any>(null);
    const [generatedSource, setGeneratedSource] = useState<string | null>(null);
    const [promptSource, setPromptSource] = useState<string | null>(null);
    const [unlockedPhotos, setUnlockedPhotos] = useState<Record<string, boolean>>({});
    const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
    const [showLockWarning, setShowLockWarning] = useState(false);
    const [galleryFilter, setGalleryFilter] = useState<"all" | "user" | "ai">("all");
    const [isUploadingAi, setIsUploadingAi] = useState(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const [errors, setErrors] = useState({
        produceType: false,
    });
    const [showErrorModal, setShowErrorModal] = useState(false);

    const toggleLock = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setUnlockedPhotos(prev => ({ ...prev, [url]: !prev[url] }));
    };

    const handleDeleteGalleryPhoto = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!unlockedPhotos[url]) {
            setShowLockWarning(true);
            return;
        }
        setPhotoToDelete(url);
    };

    const confirmDeleteGalleryPhoto = async () => {
        if (!photoToDelete) return;

        try {
            // Extract the correct file path from the signed URL
            const urlObj = new URL(photoToDelete);
            const pathname = urlObj.pathname;

            // Supabase object URLs format: /.../harvest-photos/userId/fileName.jpg
            const bucketPrefix = '/harvest-photos/';
            const bucketIndex = pathname.indexOf(bucketPrefix);

            if (bucketIndex !== -1) {
                const filePath = pathname.substring(bucketIndex + bucketPrefix.length);
                // Actually invoke delete on the bucket
                const { error } = await supabase.storage.from('harvest-photos').remove([filePath]);

                if (!error) {
                    setGalleryPhotos(prev => prev.filter(p => p !== photoToDelete));
                    setPhotos(prev => prev.filter(p => p !== photoToDelete));
                    setPhotoToDelete(null);
                } else {
                    console.error("Failed to delete photo from storage:", error);
                    alert("Failed to delete photo: Please ensure you have DELETE permissions in Supabase Storage Policies.");
                }
            } else {
                console.error("Could not parse file path from URL:", photoToDelete);
            }
        } catch (err) {
            console.error("Delete sequence error:", err);
        }
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.produceType.trim()) {
            setErrors({ produceType: true });
            setShowErrorModal(true);
            return;
        }
        // Navigate straight to content review since everything is on one page now
        router.push("/create/harvest/content");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("You must be logged in to upload photos.");
            return;
        }

        Array.from(files).forEach(async (file) => {
            if (photos.length >= 4) return;
            const fileExt = file.name.split('.').pop() || "jpg";
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('harvest-photos')
                .upload(filePath, file);

            if (uploadError) {
                console.error("Error uploading image:", uploadError);
                setImageError("Failed to upload image.");
                return;
            }

            const { data, error: urlError } = await supabase.storage
                .from('harvest-photos')
                .createSignedUrl(filePath, 3600 * 24 * 7); // 1 week

            if (data?.signedUrl) {
                const newUrl = data.signedUrl;
                setPhotos((prev) => {
                    if (prev.length < 4) return [...prev, newUrl];
                    return prev;
                });
                setGalleryPhotos((prev) => [newUrl, ...prev]);
            }
        });
    };

    const removePhoto = (index: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const generateAIPhoto = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        setImageError(null);
        setGeneratedImage(null);
        setImageUsage(null);

        try {
            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt, style: aiStyle }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setImageError(errorData.error || "Failed to generate image");
                return;
            }

            const data = await response.json();
            setGeneratedImage(data.url);
            setImageUsage(data.usage);
            setGeneratedSource(data.source);
        } catch (err: any) {
            console.error("AI image generation error:", err);
            setImageError(err.message || "An unexpected error occurred.");
        } finally {
            setIsGenerating(false);
        }
    };

    const generateAIPrompt = async () => {
        if (!formData.produceType.trim()) return;
        setIsGeneratingPrompt(true);
        setImageError(null);
        try {
            const response = await fetch("/api/generate-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ harvestData: formData }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setImageError(data.error || "Failed to generate prompt from AI");
                return;
            }

            if (data.prompt) {
                setAiPrompt(data.prompt);
                setPromptSource(data.source);
            }
        } catch (err: any) {
            console.error("Error generating AI prompt:", err);
            setImageError("An unexpected error occurred while generating the prompt.");
        } finally {
            setIsGeneratingPrompt(false);
        }
    };


    const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);

    // Fetch user's photos from Supabase on mount
    useEffect(() => {
        const fetchGallery = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: files, error } = await supabase.storage.from('harvest-photos').list(user.id);
            if (error || !files) return;

            // Sort files by creation time descending (newest first)
            const sortedFiles = files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Generate signed URLs for private images
            const filePaths = sortedFiles.map(file => `${user.id}/${file.name}`);

            if (filePaths.length === 0) return;

            const { data: signedUrls, error: urlError } = await supabase.storage
                .from('harvest-photos')
                .createSignedUrls(filePaths, 3600 * 24 * 7); // 1 week

            if (signedUrls && !urlError) {
                setGalleryPhotos(signedUrls.map(u => u.signedUrl));
            }
        };

        fetchGallery();
    }, []);

    return (
        <main>
            <Header />

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="card">
                    <div className="flex justify-between items-center pb-5 border-b-2 border-gray-100 mb-10">
                        <h2 className="text-2xl font-bold text-harvest-green">Log New Harvest</h2>
                        <Link href="/create" className="button-secondary text-sm px-4 py-2">
                            Cancel
                        </Link>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-10">
                            <h3 className="text-3xl font-bold mb-3">What did you harvest today?</h3>
                            <p className="text-gray-600 text-lg">This information will become your next social media post</p>
                        </div>

                        <form onSubmit={handleNext} className="space-y-10">
                            {/* Basic Info Group */}
                            <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-100 space-y-6">
                                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <span>📝</span> Harvest Details
                                </h4>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block font-bold text-sm text-gray-700 mb-2">Produce Type *</label>
                                        <input
                                            type="text"
                                            value={formData.produceType}
                                            onChange={(e) => {
                                                setFormData({ ...formData, produceType: e.target.value });
                                                setErrors({ produceType: false });
                                            }}
                                            className={`w-full p-4 border-2 rounded-xl outline-none transition-all bg-white ${errors.produceType ? "border-red-500" : "border-gray-200 focus:border-harvest-green focus:shadow-md"
                                                }`}
                                            placeholder="e.g., Tomatoes, Lettuce, Cucumbers"
                                        />
                                        {errors.produceType && (
                                            <p className="text-red-500 text-xs font-bold mt-2">⚠️ Please enter the produce type</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold text-sm text-gray-700 mb-2">Quantity (optional)</label>
                                            <input
                                                type="number"
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-harvest-green outline-none transition-all bg-white"
                                                placeholder="50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-sm text-gray-700 mb-2">Unit</label>
                                            <select
                                                value={formData.unit}
                                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-harvest-green outline-none transition-all appearance-none bg-white"
                                            >
                                                <option>lbs</option>
                                                <option>dozen</option>
                                                <option>bushels</option>
                                                <option>units</option>
                                                <option>bunches</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-sm text-gray-700 mb-2">Variety (optional)</label>
                                        <input
                                            type="text"
                                            value={formData.variety}
                                            onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-harvest-green outline-none transition-all bg-white"
                                            placeholder="e.g., Heirloom Cherry, Romaine, Persian"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-bold text-sm text-gray-700 mb-2">Additional context (optional)</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-harvest-green outline-none transition-all min-h-[100px] bg-white"
                                            placeholder="Any special details? (e.g., first harvest of the season, organic, etc.)"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Content Length Group */}
                            <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-100">
                                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
                                    <span>📏</span> Content Style
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-1 bg-gray-200 rounded-xl">
                                        {[
                                            { id: "short", label: "Short Copy" },
                                            { id: "long", label: "Long Copy" }
                                        ].map((style) => (
                                            <button
                                                key={style.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, contentLength: style.id })}
                                                className={`flex-1 py-3 rounded-lg font-bold transition-all ${formData.contentLength === style.id
                                                    ? "bg-white text-harvest-green shadow-sm"
                                                    : "text-gray-500 hover:text-harvest-green"
                                                    }`}
                                            >
                                                <span className="text-sm">{style.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 italic mt-2">
                                        {formData.contentLength === "short"
                                            ? "Short copy is great for quick updates. (1-2 sentences, quick & punchy)"
                                            : "Long copy uses storytelling to stop the scroll. (8-15 sentences, engaging)"}
                                    </p>
                                </div>
                            </div>

                            {/* Photos Section - Ported from separate page */}
                            <div className="bg-white p-8 rounded-2xl border-2 border-harvest-green/20 space-y-8 relative">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <span>📸</span> Photos (optional)
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowPhotoTips(!showPhotoTips)}
                                        className="w-6 h-6 rounded-full border-2 border-harvest-green text-harvest-green flex items-center justify-center text-xs font-bold hover:bg-harvest-green hover:text-white transition-all"
                                        title="Photo Tips"
                                    >
                                        i
                                    </button>
                                </div>

                                {/* Photo Tips Popup */}
                                {showPhotoTips && (
                                    <div className="absolute top-16 right-8 left-8 z-10 animate-in fade-in slide-in-from-top-2">
                                        <div className="bg-[#f0f8f4] border-l-4 border-harvest-green p-6 rounded-r-xl shadow-lg relative">
                                            <button
                                                onClick={() => setShowPhotoTips(false)}
                                                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                                            >
                                                ✕
                                            </button>
                                            <h5 className="text-harvest-green font-bold flex items-center gap-2 mb-3">
                                                📸 Photo Ideas for Log Your Harvest
                                            </h5>
                                            <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
                                                <li>Use natural lighting whenever possible</li>
                                                <li>Include hands or baskets to show scale</li>
                                                <li>Capture the farm environment and setting</li>
                                                <li>Show the produce&apos;s vibrant colors</li>
                                                <li>Don&apos;t worry about perfect photos - authentic is better!</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Photo Source Tabs */}
                                <div className="flex gap-4 p-1 bg-gray-100 rounded-xl">
                                    {[
                                        { id: "upload", label: "Upload", icon: "📤" },
                                        { id: "gallery", label: "Gallery", icon: "🖼️" },
                                        { id: "ai", label: "AI Generate", icon: "✨" },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(tab.id as any);
                                                if (tab.id === "ai" && !aiPrompt && formData.produceType) {
                                                    generateAIPrompt();
                                                }
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${activeTab === tab.id
                                                ? "bg-white text-harvest-green shadow-sm"
                                                : "text-gray-500 hover:text-harvest-green"
                                                }`}
                                        >
                                            <span>{tab.icon}</span>
                                            <span className="text-sm">{tab.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Contents */}
                                <div className="min-h-[200px]">
                                    {activeTab === "upload" && (
                                        <div
                                            className="border-4 border-dashed border-gray-100 rounded-2xl p-10 text-center bg-gray-50 hover:border-harvest-green hover:bg-harvest-light transition-all cursor-pointer"
                                            onClick={() => document.getElementById('photo-input')?.click()}
                                        >
                                            <input
                                                type="file"
                                                id="photo-input"
                                                multiple
                                                hidden
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                            />
                                            <div className="text-4xl mb-4">📷</div>
                                            <div className="text-base font-bold text-gray-800 mb-1">Upload Photos</div>
                                            <div className="text-xs text-gray-500">Add up to 4 photos</div>
                                        </div>
                                    )}

                                    {activeTab === "gallery" && (
                                        <div className="flex flex-col gap-8">
                                            {/* Gallery Filter */}
                                            <div className="flex items-center justify-between bg-white px-5 py-4 mb-2 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in duration-300">
                                                <span className="text-sm font-bold text-gray-500">Filter Photos:</span>
                                                <div className="flex gap-2">
                                                    {(["all", "user", "ai"] as const).map(filter => (
                                                        <label key={filter} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-all">
                                                            <input
                                                                type="radio"
                                                                name="galleryFilter"
                                                                value={filter}
                                                                checked={galleryFilter === filter}
                                                                onChange={() => setGalleryFilter(filter)}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                            {filter === "all" ? "All" : filter === "user" ? "User" : "AI"}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-4 gap-4">
                                                {galleryPhotos.filter(url => {
                                                    if (galleryFilter === "all") return true;

                                                    // Parse filename dynamically
                                                    const urlObj = new URL(url);
                                                    const pathname = urlObj.pathname;
                                                    const bucketPrefix = '/harvest-photos/';
                                                    const bucketIndex = pathname.indexOf(bucketPrefix);

                                                    if (bucketIndex !== -1) {
                                                        const filePath = pathname.substring(bucketIndex + bucketPrefix.length);
                                                        const fileName = filePath.split('/').pop() || "";

                                                        // Identify AI photos by the "ai-" prefix string pattern we use
                                                        if (galleryFilter === "ai") return fileName.startsWith('ai-');
                                                        if (galleryFilter === "user") return !fileName.startsWith('ai-');
                                                    }
                                                    return true;
                                                }).length === 0 ? (
                                                    <div className="col-span-4 text-center py-16 text-gray-400 font-bold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                        No photos found for this filter.
                                                    </div>
                                                ) : galleryPhotos.filter(url => {
                                                    if (galleryFilter === "all") return true;

                                                    const urlObj = new URL(url);
                                                    const pathname = urlObj.pathname;
                                                    const bucketPrefix = '/harvest-photos/';
                                                    const bucketIndex = pathname.indexOf(bucketPrefix);

                                                    if (bucketIndex !== -1) {
                                                        const filePath = pathname.substring(bucketIndex + bucketPrefix.length);
                                                        const fileName = filePath.split('/').pop() || "";

                                                        if (galleryFilter === "ai") return fileName.startsWith('ai-');
                                                        if (galleryFilter === "user") return !fileName.startsWith('ai-');
                                                    }
                                                    return true;
                                                }).map((url, i) => {
                                                    const isUnlocked = unlockedPhotos[url];

                                                    return (
                                                        <div key={i} className="flex flex-col gap-2 animate-in fade-in duration-300">
                                                            <div
                                                                className="aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-harvest-green transition-all relative shadow-sm hover:shadow-md"
                                                                onClick={() => {
                                                                    if (photos.length < 4 && !photos.includes(url)) setPhotos([...photos, url]);
                                                                }}
                                                            >
                                                                <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                                                                {photos.includes(url) && (
                                                                    <div className="absolute inset-0 bg-harvest-green/20 flex items-center justify-center">
                                                                        <div className="bg-white rounded-full p-1 shadow-md">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Bottom Action Buttons */}
                                                            <div className="flex justify-end items-center px-1 gap-3">
                                                                {/* Lock/Unlock Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => toggleLock(url, e)}
                                                                    className={`p-1 transition-colors ${isUnlocked ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-gray-600"
                                                                        }`}
                                                                    title={isUnlocked ? "Lock photo" : "Unlock to allow deletion"}
                                                                >
                                                                    {isUnlocked ? (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                                                                    ) : (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                                    )}
                                                                </button>

                                                                {/* Delete Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteGalleryPhoto(url, e)}
                                                                    className={`p-1 transition-colors ${isUnlocked
                                                                        ? "text-red-500 hover:text-red-600"
                                                                        : "text-gray-300 hover:text-gray-400 opacity-70"
                                                                        }`}
                                                                    title={isUnlocked ? "Delete photo forever" : "Unlock photo first"}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "ai" && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <div className="flex justify-between items-end mb-2">
                                                        <label className="block font-bold text-xs text-gray-500 uppercase tracking-wider">Image Description</label>
                                                        <div className="flex items-center gap-2">
                                                            {promptSource === "Template Fallback" && (
                                                                <span className="text-[10px] font-bold text-amber-500 italic animate-pulse">
                                                                    ⚠️ Busy: Using Template
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={generateAIPrompt}
                                                                disabled={isGeneratingPrompt || !formData.produceType}
                                                                className="text-[10px] font-black uppercase text-harvest-green hover:bg-harvest-light px-2 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-30"
                                                            >
                                                                {isGeneratingPrompt ? "✨ Magic..." : "✨ Magic Suggest"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <textarea
                                                        value={aiPrompt}
                                                        onChange={(e) => setAiPrompt(e.target.value)}
                                                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-harvest-green outline-none transition-all min-h-[100px] bg-white text-sm"
                                                        placeholder="Describe your harvest photo (e.g. Rows of ripe tomatoes in a sunlit greenhouse...)"
                                                    ></textarea>
                                                </div>
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block font-bold text-xs text-gray-500 uppercase tracking-wider mb-2">Artistic Style</label>
                                                    <select
                                                        value={aiStyle}
                                                        onChange={(e) => setAiStyle(e.target.value)}
                                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-harvest-green outline-none transition-all bg-white text-sm"
                                                    >
                                                        <option value="photorealistic">📷 Photorealistic</option>
                                                        <option value="bright">☀️ Bright & Vibrant</option>
                                                        <option value="rustic">🌾 Rustic & Earthy</option>
                                                        <option value="minimal">✨ Clean & Minimal</option>
                                                        <option value="golden">🌅 Golden Hour</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2 sm:col-span-1 flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={generateAIPhoto}
                                                        disabled={isGenerating || !aiPrompt.trim()}
                                                        className="button-primary w-full justify-center py-3 text-sm disabled:opacity-50 h-[50px]"
                                                    >
                                                        {isGenerating ? "✨ Thinking..." : "📸 Generate Photo"}
                                                    </button>
                                                </div>
                                            </div>

                                            {imageError && (
                                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 italic">
                                                    ⚠️ {imageError}
                                                </div>
                                            )}

                                            {generatedImage && (
                                                <div className="mt-4 border-2 border-harvest-green rounded-xl overflow-hidden p-4 bg-gray-50 text-center animate-in zoom-in-95 duration-300">
                                                    <div className="max-w-[400px] mx-auto mb-4 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                                                        <img src={generatedImage} alt="AI Generated Harvest" className="w-full h-auto" />
                                                    </div>
                                                    <div className="flex flex-col items-center gap-3">
                                                        {generatedSource && (
                                                            <div className="flex flex-wrap justify-center gap-4 mb-4">
                                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Model</span>
                                                                    <span className="text-xs font-bold text-gray-700">{generatedSource}</span>
                                                                </div>
                                                                {imageUsage && (
                                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Tokens</span>
                                                                        <span className="text-xs font-bold text-harvest-green">{imageUsage.totalTokens?.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            disabled={isUploadingAi}
                                                            onClick={async () => {
                                                                try {
                                                                    setIsUploadingAi(true);
                                                                    const { data: { user } } = await supabase.auth.getUser();
                                                                    if (!user) {
                                                                        setSuccessMessage("You must be logged in to save AI photos.");
                                                                        setShowSuccessModal(true);
                                                                        return;
                                                                    }

                                                                    // Fetch the image from the data URL to upload as a blob
                                                                    const imgRes = await fetch(generatedImage);
                                                                    if (!imgRes.ok) {
                                                                        setIsUploadingAi(false);
                                                                        setSuccessMessage("Failed to process image data. Please try generating again.");
                                                                        setShowSuccessModal(true);
                                                                        return;
                                                                    }

                                                                    const blob = await imgRes.blob();

                                                                    // Basic check to ensure we aren't uploading an error JSON as an image
                                                                    if (blob.type.includes('json')) {
                                                                        setIsUploadingAi(false);
                                                                        setSuccessMessage("AI generator returned invalid data. Please try again.");
                                                                        setShowSuccessModal(true);
                                                                        return;
                                                                    }

                                                                    const fileName = `ai-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
                                                                    const filePath = `${user.id}/${fileName}`;

                                                                    const { error: uploadError } = await supabase.storage.from('harvest-photos').upload(filePath, blob, {
                                                                        contentType: blob.type || 'image/jpeg',
                                                                        upsert: false
                                                                    });
                                                                    if (uploadError) {
                                                                        console.error("Upload error:", uploadError);
                                                                        setSuccessMessage(`Upload failed: ${uploadError.message}`);
                                                                        setShowSuccessModal(true);
                                                                        setIsUploadingAi(false);
                                                                        return;
                                                                    }

                                                                    const { data: urlData, error: urlError } = await supabase.storage.from('harvest-photos').createSignedUrl(filePath, 3600 * 24 * 7);
                                                                    if (urlError || !urlData?.signedUrl) throw urlError || new Error("No URL returned");

                                                                    const newUrl = urlData.signedUrl;

                                                                    // Prepend so it shows sequentially first in the grid
                                                                    setGalleryPhotos([newUrl, ...galleryPhotos]);
                                                                    setPhotos([newUrl, ...photos].slice(0, 4));
                                                                    setGeneratedImage(null);
                                                                    setSuccessMessage("AI Photo saved to your gallery!");
                                                                    setShowSuccessModal(true);
                                                                } catch (err) {
                                                                    console.error("Save AI Photo error:", err);
                                                                    setSuccessMessage("Failed to save AI photo to gallery.");
                                                                    setShowSuccessModal(true);
                                                                } finally {
                                                                    setIsUploadingAi(false);
                                                                }
                                                            }}
                                                            className="bg-harvest-green text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                                        >
                                                            {isUploadingAi ? "Saving to Cloud..." : "✓ Save to Gallery"}
                                                        </button>

                                                        {imageUsage && (
                                                            <span className="text-[10px] text-gray-400 font-mono italic">
                                                                AI Usage: {imageUsage.totalTokens} tokens
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Selected Photos Preview */}
                                {photos.length > 0 && (
                                    <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                                        {photos.map((photo, i) => (
                                            <div key={i} className="aspect-square bg-gray-100 rounded-xl relative overflow-hidden group">
                                                <img src={photo} alt={`Upload ${i}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(i)}
                                                    className="absolute top-1 right-1 bg-black/70 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-5">
                                <button type="submit" className="button-primary w-full justify-center text-xl py-5 shadow-xl hover:shadow-2xl">
                                    Generate Content with AI ✨
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 relative border border-gray-100">
                        {/* Close 'X' Button */}
                        <button
                            onClick={() => setShowErrorModal(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto" style={{ backgroundColor: '#fff0f0', color: '#f59e0b' }}>
                                <span className="text-3xl">⚠️</span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">Missing Information</h3>
                            <p className="text-gray-600 mb-8">
                                Please enter the <span className="font-bold" style={{ color: '#15803d' }}>Produce Type</span> (like Tomatoes or Lettuce) so our AI knows what you harvested!
                            </p>

                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full text-white font-bold py-4 text-lg rounded-xl transition-all shadow-lg hover:shadow-xl"
                                style={{ backgroundColor: '#739072' }}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {photoToDelete && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-6 mx-auto">
                                🗑️
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Photo</h3>
                            <p className="text-gray-600 mb-8">
                                Are you sure you want to permanently delete this photo from your storage? This action cannot be undone.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setPhotoToDelete(null)}
                                    className="button-secondary flex-1 justify-center py-3"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteGalleryPhoto}
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl flex-1 focus:ring-4 focus:ring-red-200 transition-all font-sans"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lock Warning Modal */}
            {showLockWarning && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 relative border border-gray-100">
                        {/* Close 'X' Button */}
                        <button
                            onClick={() => setShowLockWarning(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <span className="text-3xl text-amber-500">🔒</span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">Locked Photo</h3>
                            <p className="text-gray-600 mb-8">
                                To prevent accidental deletion, please click the lock icon below the photo to unlock it first.
                            </p>

                            <button
                                onClick={() => setShowLockWarning(false)}
                                className="w-full text-white font-bold py-4 text-lg rounded-xl transition-all shadow-lg hover:shadow-xl"
                                style={{ backgroundColor: '#739072' }}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 relative border border-gray-100">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-harvest-green rounded-full flex items-center justify-center mb-6 mx-auto text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">Notice</h3>
                            <p className="text-gray-600 mb-8 whitespace-pre-wrap">
                                {successMessage}
                            </p>

                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full bg-harvest-green text-white font-bold py-4 text-lg rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
                            >
                                Nice!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
