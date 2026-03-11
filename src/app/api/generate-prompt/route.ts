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
        const { harvestData } = await req.json();

        if (!harvestData || !harvestData.produceType) {
            return NextResponse.json({ error: "Missing harvest data" }, { status: 400 });
        }

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

        const prompt = `You are an expert at creating descriptive image generation prompts for DALL-E/Midjourney.
        Based on this harvest data, create a single, detailed, photorealistic prompt for an image of the harvest.
        
        Harvest Data:
        - Produce: ${harvestData.produceType}
        - Variety: ${harvestData.variety || "N/A"}
        - Quantity: ${harvestData.quantity || ""} ${harvestData.unit || ""}
        - Context: ${harvestData.notes || "N/A"}
        
        Requirements:
        1. Keep it to 1-2 descriptive sentences.
        2. Focus on natural lighting, textures, and authenticity.
        3. Do NOT include technical parameters like --ar or --v.
        4. Return ONLY the prompt text.`;

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

        const fallbackPrompt = `A high-resolution, photorealistic close-up of ${quantityStr}${varietyStr}${type}, freshly harvested and resting in a rustic wooden crate, illuminated by soft morning sunlight with natural morning dew and authentic textures.`;

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
