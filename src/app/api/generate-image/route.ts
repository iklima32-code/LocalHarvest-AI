import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { prompt, style } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                error: "GEMINI_API_KEY not found in environment variables."
            }, { status: 500 });
        }

        // 1. Generate expanded prompt using Gemini 2.5 Flash
        const promptModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const styleDescriptions: Record<string, string> = {
            photorealistic: 'high-resolution, professional commercial photography, 8k, sharp focus',
            bright: 'bright, vibrant, high-key lighting, saturated colors, cheerful farm atmosphere',
            rustic: 'vintage farm style, earthy tones, natural light, textured organic feel, moody',
            minimal: 'clean, minimal composition, soft lighting, modern aesthetic, white background',
            golden: 'magical golden hour lighting, long shadows, warm amber glow, cinematic'
        };

        const systemPrompt = `You are a professional AI image prompt engineer. 
        Your goal is to take a simple description of a farm scene and expand it into a detailed, high-quality prompt for a photorealistic image generator.
        Focus on:
        - Specific lighting (${styleDescriptions[style] || 'beautiful natural light'})
        - Camera settings (e.g., 50mm lens, f/1.8, bokeh)
        - Textures (dew on leaves, wooden crates, soil details)
        - Atmosphere
        Respond with ONLY the expanded prompt text, no extra commentary.`;

        const promptResult = await promptModel.generateContent([systemPrompt, `Create a high-quality photo prompt for: ${prompt}`]);
        const promptResponse = await promptResult.response;
        const expandedPrompt = promptResponse.text().trim();

        // 2. Attempt native generation using Gemini 2.5 Flash Image (Nano Banana)
        try {
            const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
            const imageResult = await imageModel.generateContent(expandedPrompt);
            const imageResponse = await imageResult.response;

            const candidate = imageResponse.candidates?.[0];
            const part = candidate?.content?.parts?.find(p => p.inlineData);

            if (part && part.inlineData) {
                const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                return NextResponse.json({
                    url: dataUrl,
                    prompt: expandedPrompt,
                    source: 'native-nano-banana'
                });
            }
        } catch (nanoError: any) {
            console.error("Nano Banana Error, falling back to backup engine:", nanoError.message);
            // If it's a quota or access error, we proceed to fallback below
        }

        // 3. Fallback: Use high-quality external generator if Nano Banana is unavailable
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(expandedPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

        let imageRes;
        let retries = 2;
        while (retries >= 0) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                imageRes = await fetch(fallbackUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (imageRes.ok) break;
            } catch (e) {
                if (retries === 0) throw e;
            }
            retries--;
            if (retries >= 0) await new Promise(r => setTimeout(r, 1000));
        }

        if (!imageRes || !imageRes.ok) {
            throw new Error("All image engines are currently busy. Please try again in 30 seconds.");
        }

        const arrayBuffer = await imageRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        return NextResponse.json({
            url: dataUrl,
            prompt: expandedPrompt,
            source: 'backup-engine'
        });

    } catch (error: any) {
        console.error("AI Image Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
    }
}
