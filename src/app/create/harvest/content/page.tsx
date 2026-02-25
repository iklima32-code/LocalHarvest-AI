"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHarvest } from "@/context/HarvestContext";

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

export default function HarvestContent() {
    const router = useRouter();
    const { formData: harvestData, photos, clearHarvest } = useHarvest();
    const [options, setOptions] = useState<any[]>(mockOptions);
    const [usage, setUsage] = useState<any>(null);
    const [source, setSource] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [selectedOption, setSelectedOption] = useState(0);
    const [retryCount, setRetryCount] = useState(0);

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
                body: JSON.stringify({ harvestData }),
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
        fetchContent();
    }, [harvestData, retryCount]);

    const handleApprove = () => {
        clearHarvest();
        router.push("/dashboard");
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

                            {/* Photos Strip */}
                            {photos.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:max-w-[300px]">
                                    {photos.map((url, i) => (
                                        <div key={i} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-white shadow-md">
                                            <img src={url} alt={`Harvest ${i + 1}`} className="w-full h-full object-cover" />
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
                                    className={`p-6 border-4 rounded-2xl cursor-pointer transition-all ${selectedOption === idx
                                        ? "border-harvest-green bg-harvest-light shadow-lg"
                                        : "border-gray-100 bg-gray-50 hover:border-harvest-green"
                                        }`}
                                >
                                    {option.recommended && (
                                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                                            ★ Recommended
                                        </span>
                                    )}
                                    <p className="text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">{option.caption}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {option.hashtags.split(" ").map((tag: string) => (
                                            <span key={tag} className="text-harvest-green font-bold text-sm">{tag}</span>
                                        ))}
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
                                onClick={handleApprove}
                                className="button-primary w-full justify-center text-lg py-4"
                            >
                                Next: Approve & Schedule 📅
                            </button>
                            <button
                                onClick={() => setRetryCount(prev => prev + 1)}
                                className="button-secondary w-full justify-center py-4"
                            >
                                🔄 Regenerate Options
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
