"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useHarvest } from "@/context/HarvestContext";
import PhotoManager from "@/components/PhotoManager";

export default function HarvestWorkflow() {
    const router = useRouter();
    const { formData, setFormData, photos, setPhotos, videos, setVideos } = useHarvest();

    const [errors, setErrors] = useState({
        produceType: false,
    });
    const [showErrorModal, setShowErrorModal] = useState(false);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.produceType.trim()) {
            setErrors({ produceType: true });
            setShowErrorModal(true);
            return;
        }
        router.push("/create/harvest/content");
    };

    const removePhoto = (index: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const removeVideo = (index: number) => {
        setVideos((prev) => prev.filter((_, i) => i !== index));
    };

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

                            {/* Photo Management Section (Reusable Component) */}
                            <PhotoManager
                                harvestData={formData}
                                selectedPhotos={photos}
                                onSelect={(url) => {
                                    if (photos.includes(url)) {
                                        setPhotos(photos.filter(p => p !== url));
                                    } else if (photos.length < 4) {
                                        setPhotos([...photos, url]);
                                    }
                                }}
                                selectedVideos={videos}
                                onSelectVideo={(url) => {
                                    if (videos.includes(url)) {
                                        setVideos(videos.filter(v => v !== url));
                                    } else {
                                        setVideos([url]); // max 1 video per post
                                    }
                                }}
                            />

                            {/* Selected Media Preview */}
                            {(photos.length > 0 || videos.length > 0) && (
                                <div className="p-8 bg-white border-2 border-harvest-green/10 rounded-2xl space-y-6">
                                    {photos.length > 0 && (
                                        <>
                                            <h5 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Selected Photos <span className="text-harvest-green">({photos.length}/4)</span></h5>
                                            <div className="grid grid-cols-4 gap-4">
                                                {photos.map((photo, i) => (
                                                    <div key={i} className="aspect-square bg-gray-100 rounded-xl relative overflow-hidden group border-2 border-transparent hover:border-red-400 transition-all">
                                                        <img src={photo} alt={`Selected ${i}`} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhoto(i)}
                                                            className="absolute inset-0 bg-red-500/0 hover:bg-red-500/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-all"
                                                        >
                                                            <span className="bg-white text-red-500 w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg">✕</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {videos.length > 0 && (
                                        <>
                                            <h5 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Selected Video <span className="text-harvest-green">(1/1)</span></h5>
                                            {videos.map((video, i) => (
                                                <div key={i} className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video border-2 border-harvest-green/30 group">
                                                    <video src={video} controls className="w-full h-full object-contain" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVideo(i)}
                                                        className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="pt-5 flex flex-col items-center gap-4">
                                <button type="submit" className="button-primary w-full justify-center text-xl py-5 shadow-xl hover:shadow-2xl">
                                    Generate Content with AI ✨
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!formData.produceType.trim()) {
                                            setErrors({ produceType: true });
                                            setShowErrorModal(true);
                                            return;
                                        }
                                        router.push("/create/harvest/content?mode=manual");
                                    }}
                                    className="text-harvest-green font-bold hover:underline py-1 transition-all"
                                >
                                    Write my own content
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-gray-100">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Produce Type Required</h3>
                            <p className="text-gray-600 mb-8 lowercase">
                                Please tell us what you harvested before proceeding.
                            </p>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full bg-harvest-green text-white font-bold py-4 text-lg rounded-xl transition-all shadow-lg hover:brightness-110 active:scale-95"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
