import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";
import { containsDisallowedContent } from "@/lib/content-policy";

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

        // Phase A content-policy hard-block.
        // Checks all user-controlled fields before any model invocation.
        const inputsToCheck: [string, string][] = [
            ['produceType', harvestData.produceType],
            ['variety', harvestData.variety || ''],
            ['notes', harvestData.notes || ''],
        ];
        for (const [field, value] of inputsToCheck) {
            if (containsDisallowedContent(value)) {
                return NextResponse.json(
                    { error: `Your harvest details contain disallowed language (field: ${field}). Please edit and try again.` },
                    { status: 400 }
                );
            }
        }

        const prompt = isVideo
            ? `You are a world-class cinematographer creating a text-to-video prompt for an AI video generator.
        Based on the harvest data and farm context below, write a single rich, sensory, cinematic prompt describing a short farm scene.

        Harvest Data:
        - Produce: ${harvestData.produceType}
        - Variety: ${harvestData.variety || "N/A"}
        - Quantity: ${harvestData.quantity || ""} ${harvestData.unit || ""}
        - Context: ${harvestData.notes || "N/A"}
        ${contextBlock ? `\n        Farm Context:\n        ${contextBlock}` : ""}

        Brand Aesthetic: ${visualStyle}

        Requirements:
        1. Keep it to 60-100 words.
        2. Layer these elements naturally into one flowing description:
           - Shot type & camera motion (e.g. slow dolly-in, low-angle pan, handheld close-up, rack focus)
           - Lighting quality (e.g. golden-hour backlight, soft morning mist, dappled canopy light, warm afternoon rays)
           - Tactile texture & colour (e.g. glistening dew, jewel-toned produce, rich dark soil, sun-kissed skin)
           - Organic movement (e.g. leaves rustling, hands cradling fruit, a bee landing, steam rising from soil)
           - Layered depth (foreground crop detail → midground action → background landscape in bokeh)
        3. Reflect the brand aesthetic naturally — do not name the style explicitly.
        ${farmName ? `4. You may reference "${farmName}" subtly if it fits naturally.` : ""}
        ${location ? `5. Weave in the ${location} landscape or environment.` : ""}
        Return ONLY the prompt text, no labels or commentary.`
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
            ? `Extreme close-up of weathered hands gently cradling freshly harvested ${varietyStr}${type}${farmStr}, slow dolly-in, warm golden-hour backlight casting a soft glow, glistening dew on leaves, jewel-toned produce, organic bokeh of lush green crops fading into the background, a gentle breeze stirs the foliage, serene and abundant mood.`
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
