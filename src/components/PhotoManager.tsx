"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HarvestGallery from "./HarvestGallery";

interface PhotoManagerProps {
    onSelect?: (url: string) => void;
    selectedPhotos?: string[];
    harvestData?: {
        produceType: string;
        quantity: string;
        unit: string;
        variety: string;
        notes: string;
    };
    maxSelection?: number;
}

export default function PhotoManager({
    onSelect,
    selectedPhotos = [],
    harvestData,
    maxSelection = 4
}: PhotoManagerProps) {
    const [activeTab, setActiveTab] = useState<"upload" | "gallery" | "ai">("gallery");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [isUploadingAi, setIsUploadingAi] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiStyle, setAiStyle] = useState("photorealistic");
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [showPhotoTips, setShowPhotoTips] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [imageUsage, setImageUsage] = useState<any>(null);
    const [generatedSource, setGeneratedSource] = useState<string | null>(null);
    const [promptSource, setPromptSource] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setSuccessMessage("You must be logged in to upload photos.");
            setShowSuccessModal(true);
            return;
        }

        let successCount = 0;
        const uploadPromises = Array.from(files).map(async (file) => {
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
                .createSignedUrl(filePath, 3600 * 24 * 7);

            if (data?.signedUrl) {
                successCount++;
                const newUrl = data.signedUrl;
                if (onSelect) {
                    onSelect(newUrl);
                }
            }
        });

        await Promise.all(uploadPromises);

        if (successCount > 0 && !harvestData) {
            setSuccessMessage(`${successCount} photo${successCount > 1 ? 's' : ''} added to your gallery!`);
            setShowSuccessModal(true);
        }
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
        if (!harvestData?.produceType.trim()) return;
        setIsGeneratingPrompt(true);
        setImageError(null);
        try {
            const response = await fetch("/api/generate-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ harvestData }),
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

    return (
        <div className="bg-white p-8 rounded-2xl border-2 border-harvest-green/20 space-y-8 relative">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-800 flex items-center flex-wrap gap-y-2">
                    <span className="flex items-center gap-2">
                        <span>📸</span> Photos
                    </span>

                    <div className="flex items-center gap-3 ml-0 sm:ml-6 pl-0 sm:pl-6 border-l-0 sm:border-l-2 border-gray-100">
                        <span className="flex items-center gap-2">
                            <span>🎥</span>
                            <span className="text-gray-400 font-bold">Videos</span>
                        </span>
                        <span className="bg-amber-50 text-amber-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border border-amber-100">
                            Coming Soon
                        </span>
                    </div>
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
                            📸 Photo Ideas
                        </h5>
                        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
                            <li>Use natural lighting whenever possible</li>
                            <li>Include hands or baskets to show scale</li>
                            <li>Capture the farm environment and setting</li>
                            <li>Show the produce&apos;s vibrant colors</li>
                            <li>Authentic is always better than perfect!</li>
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
                            if (tab.id === "ai" && !aiPrompt && harvestData?.produceType) {
                                generateAIPrompt();
                            }
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${activeTab === tab.id
                            ? "bg-white text-harvest-green shadow-sm"
                            : "text-gray-500 hover:text-harvest-green"
                            }`}
                    >
                        <span>{tab.icon}</span>
                        <span className="text-sm tracking-tight">{tab.label}</span>
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
                        <div className="text-xs text-gray-500">Add up to {maxSelection} photos</div>
                    </div>
                )}

                {activeTab === "gallery" && (
                    <HarvestGallery
                        onSelect={onSelect}
                        selectedPhotos={selectedPhotos}
                    />
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
                                        {harvestData?.produceType && (
                                            <button
                                                type="button"
                                                onClick={generateAIPrompt}
                                                disabled={isGeneratingPrompt}
                                                className="text-[10px] font-black uppercase text-harvest-green hover:bg-harvest-light px-2 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-30"
                                            >
                                                {isGeneratingPrompt ? "✨ Magic..." : "✨ Magic Suggest"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-harvest-green outline-none transition-all min-h-[100px] bg-white text-sm"
                                    placeholder="Describe your harvest photo..."
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
                                    <img src={generatedImage} alt="AI Generated" className="w-full h-auto" />
                                </div>
                                <div className="flex flex-col items-center gap-3">
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

                                                const imgRes = await fetch(generatedImage!);
                                                const blob = await imgRes.blob();
                                                const fileName = `ai-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
                                                const filePath = `${user.id}/${fileName}`;

                                                const { error: uploadError } = await supabase.storage.from('harvest-photos').upload(filePath, blob, {
                                                    contentType: blob.type || 'image/jpeg'
                                                });
                                                if (uploadError) throw uploadError;

                                                const { data: urlData } = await supabase.storage.from('harvest-photos').createSignedUrl(filePath, 3600 * 24 * 7);
                                                if (urlData?.signedUrl) {
                                                    if (onSelect) onSelect(urlData.signedUrl);
                                                }

                                                setGeneratedImage(null);
                                                setSuccessMessage("AI Photo saved to your gallery!");
                                                setShowSuccessModal(true);
                                            } catch (err) {
                                                console.error("Save AI Photo error:", err);
                                                setSuccessMessage("Failed to save AI photo.");
                                                setShowSuccessModal(true);
                                            } finally {
                                                setIsUploadingAi(false);
                                            }
                                        }}
                                        className="bg-harvest-green text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isUploadingAi ? "Saving..." : "✓ Save to Gallery"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Inner Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[4000] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 relative border border-gray-100">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-harvest-green rounded-full flex items-center justify-center mb-6 mx-auto text-white shadow-lg shadow-harvest-green/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Success!</h3>
                            <p className="text-gray-600 mb-8 font-medium">
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
        </div>
    );
}
