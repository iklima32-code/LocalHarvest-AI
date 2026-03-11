import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(req: Request) {
    const gate = await cqraRequireAuth(req, "generate_prompt");
    if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    try {
        const { harvestData, mediaType, profileSettings } = await req.json();

        if (!harvestData || !harvestData.produceType) {
            return NextResponse.json({ error: "Missing harvest data" }, { status: 400 });
        }

        const isVideo = mediaType === "video";

        const farmName    = profileSettings?.farmName    || null;
        const farmType    = profileSettings?.farmType    || null;
        const location    = profileSettings?.autoLocation && profileSettings?.location ? profileSettings.location : null;
        const brandVoice  = profileSettings?.brandVoice  || "Friendly & Casual";

        // Map brand voice to a visual/cinematic aesthetic for the prompt
        const brandVoiceVisual: Record<string, string> = {
            "Friendly & Casual":   "warm, authentic, approachable — natural imperfections welcome, feels real and handcrafted",
            "Professional":        "clean, polished, commercial-grade — precise composition, well-lit, refined",
            "Storytelling":        "cinematic and emotive — narrative atmosphere, dramatic lighting, evokes connection to the land",
            "Educational":         "clear, informative, well-composed — subject is the star, great detail and clarity",
            "Inspirational":       "uplifting and vibrant — bright colors, energy, hopeful mood",
        };
        const visualStyle = brandVoiceVisual[brandVoice] || brandVoiceVisual["Friendly & Casual"];

        // Build shared context block
        const contextBlock = [
            farmName  && `- Farm Name: ${farmName}`,
            farmType  && `- Farm Type: ${farmType}`,
            location  && `- Location: ${location}`,
        ].filter(Boolean).join("\n        ");

        const prompt = isVideo
            ? `You are an expert at creating text-to-video prompts for AI video generators.
        Based on the harvest data and farm context below, create a single cinematic video prompt describing a short farm scene.

        Harvest Data:
        - Produce: ${harvestData.produceType}
        - Variety: ${harvestData.variety || "N/A"}
        - Quantity: ${harvestData.quantity || ""} ${harvestData.unit || ""}
        - Context: ${harvestData.notes || "N/A"}
        ${contextBlock ? `\n        Farm Context:\n        ${contextBlock}` : ""}

        Brand Aesthetic: ${visualStyle}

        Requirements:
        1. Keep it to 1-2 sentences (under 60 words).
        2. Describe motion, action, and atmosphere (e.g., "A farmer's hands gently picking ripe tomatoes, golden morning light, dew on the leaves, slow pan").
        3. Reflect the brand aesthetic naturally — do not name the style explicitly.
        ${farmName ? `4. You may reference "${farmName}" subtly if it fits naturally.` : ""}
        ${location ? `5. Incorporate the ${location} landscape/environment if relevant.` : ""}
        Return ONLY the prompt text, no commentary.`
            : `You are an expert at creating descriptive image generation prompts for DALL-E/Midjourney.
        Based on the harvest data and farm context below, create a single detailed photorealistic prompt for an image of the harvest.

        Harvest Data:
        - Produce: ${harvestData.produceType}
        - Variety: ${harvestData.variety || "N/A"}
        - Quantity: ${harvestData.quantity || ""} ${harvestData.unit || ""}
        - Context: ${harvestData.notes || "N/A"}
        ${contextBlock ? `\n        Farm Context:\n        ${contextBlock}` : ""}

        Brand Aesthetic: ${visualStyle}

        Requirements:
        1. Keep it to 1-2 descriptive sentences.
        2. Reflect the brand aesthetic naturally in lighting, composition, and mood — do not name the style explicitly.
        ${farmName ? `3. You may reference "${farmName}" subtly in the scene if it fits naturally.` : ""}
        ${location ? `4. Incorporate the ${location} setting/environment if relevant.` : ""}
        5. Do NOT include technical parameters like --ar or --v.
        Return ONLY the prompt text, no commentary.`;

        // TIERED MODELS - Cycle through available Gemini models first
        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash-exp"
        ];

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting prompt generation with: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();

                if (text) {
                    return NextResponse.json({
                        prompt: text,
                        source: modelName
                    });
                }
            } catch (error: any) {
                console.warn(`Model ${modelName} hit an error during prompt generation:`, error.message);
                continue;
            }
        }

        // TIER 2 - OPENAI FALLBACK (GPT-5 Nano / GPT-4o-mini)
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log("Attempting Tier 2 (OpenAI): GPT-5 Nano...");
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are an expert AI image prompt engineer." },
                        { role: "user", content: prompt }
                    ],
                });
                const text = completion.choices[0].message.content?.trim();
                if (text) {
                    return NextResponse.json({
                        prompt: text,
                        source: "GPT-5 Nano"
                    });
                }
            } catch (error: any) {
                console.warn("GPT-5 Nano (OpenAI) failed for prompt generation:", error.message);
            }
        }

        // TIER 3 - SMART TEMPLATE FALLBACK
        console.log("All AI models failed or hit quota for prompt generation. Falling back to template.");

        const type = harvestData.produceType;
        const varietyStr = harvestData.variety ? `${harvestData.variety} ` : "";
        const quantityStr = harvestData.quantity ? `${harvestData.quantity} ${harvestData.unit} of ` : "A bountiful harvest of ";
        const locationStr = location ? ` at a farm in ${location}` : "";
        const farmStr = farmName ? ` at ${farmName}` : locationStr;

        const fallbackPrompt = isVideo
            ? `A farmer's hands carefully harvesting fresh ${varietyStr}${type}${farmStr}, warm golden morning light, dew on the leaves, slow cinematic pan.`
            : `A high-resolution, photorealistic close-up of ${quantityStr}${varietyStr}${type}, freshly harvested and resting in a rustic wooden crate${farmStr}, illuminated by soft morning sunlight with natural morning dew and authentic textures.`;

        return NextResponse.json({
            prompt: fallbackPrompt,
            source: "Template Fallback",
            warning: "Displaying a curated prompt template because AI engines are currently at capacity."
        });

    } catch (error: any) {
        console.error("Prompt Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate prompt" }, { status: 500 });
    }
}
