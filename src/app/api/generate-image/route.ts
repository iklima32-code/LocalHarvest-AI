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
        - Camera settings (e.g., f/1.8, bokeh, micro-lens)
        - Textures (dew on leaves, crate wood, organic imperfections)
        Respond with ONLY the expanded prompt text, no extra commentary. Keep it concise (under 75 words).`;

        let expandedPrompt = prompt;
        let promptTokens = 0;
        try {
            const promptResult = await promptModel.generateContent([systemPrompt, `Create a high-quality photo prompt for: ${prompt}`]);
            const promptResponse = await promptResult.response;
            expandedPrompt = promptResponse.text().trim() || prompt;
            promptTokens = promptResponse.usageMetadata?.totalTokenCount || 0;
        } catch (pe) {
            console.warn("Prompt expansion failed, using raw prompt:", pe);
        }

        // ---------------------------------------------------------
        // THE UPDATED RESCUE SEQUENCE (Gemini -> Public Fallbacks)
        // ---------------------------------------------------------

        // TIER 1: Gemini 2.5 Flash Image
        try {
            console.log("Attempting Tier 1: Gemini 2.5 Flash Image...");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" }, { apiVersion: "v1beta" });
            const result = await model.generateContent(expandedPrompt);
            const response = await result.response;
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                return NextResponse.json({
                    url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                    prompt: expandedPrompt,
                    source: 'Gemini 2.5 Flash Image',
                    usage: { promptTokens, imageTokens: 1290, totalTokens: promptTokens + 1290 }
                });
            }
        } catch (e: any) { console.warn("Tier 1 Failed:", e.message); }

        // TIER 2: Gemini 3 Pro Image (Preview)
        try {
            console.log("Attempting Tier 2: Gemini 3 Pro Image...");
            const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" }, { apiVersion: "v1beta" });
            const result = await model.generateContent(expandedPrompt);
            const response = await result.response;
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                return NextResponse.json({
                    url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                    prompt: expandedPrompt,
                    source: 'Gemini 3 Pro Image',
                    usage: { promptTokens, imageTokens: 1290, totalTokens: promptTokens + 1290 }
                });
            }
        } catch (e: any) { console.warn("Tier 2 Failed:", e.message); }

        // TIER 3: Pollinations Fallback
        try {
            console.log("Attempting Tier 3: Pollinations Fresh Render...");
            const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(expandedPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
            const res = await fetch(pollinationsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (res.ok) {
                const buf = await res.arrayBuffer();
                return NextResponse.json({
                    url: `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`,
                    prompt: expandedPrompt,
                    source: 'Pollinations AI Fallback',
                    usage: { promptTokens, imageTokens: 0, totalTokens: promptTokens }
                });
            }
        } catch (e: any) { console.warn("Tier 3 Failed:", e.message); }

        // TIER 4: Lexica Rescue
        try {
            console.log("Attempting Tier 4: Lexica Rescue...");
            const keywords = prompt.split(',')[0].trim();
            const lexRes = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(keywords)}`);
            if (lexRes.ok) {
                const data = await lexRes.json();
                if (data.images?.[0]) {
                    const imgRes = await fetch(data.images[0].src);
                    if (imgRes.ok) {
                        const buf = await imgRes.arrayBuffer();
                        return NextResponse.json({
                            url: `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`,
                            prompt: data.images[0].prompt,
                            source: 'Lexica AI Rescue',
                            usage: { promptTokens, imageTokens: 0, totalTokens: promptTokens }
                        });
                    }
                }
            }
        } catch (e: any) { console.warn("Tier 4 Failed:", e.message); }

        // TIER 5: Unsplash Backup
        try {
            console.log("Attempting Tier 5: Unsplash Backup...");
            const query = `${prompt} farm harvest`.replace(/\s+/g, ',');
            const unsplashUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(query)}`;
            const res = await fetch(unsplashUrl);
            if (res.ok) {
                const buf = await res.arrayBuffer();
                return NextResponse.json({
                    url: `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`,
                    prompt: prompt,
                    source: 'Unsplash Photography Backup',
                    usage: { promptTokens, imageTokens: 0, totalTokens: promptTokens }
                });
            }
        } catch (e: any) { console.warn("Tier 5 Failed:", e.message); }

        // TIER 6: Static Masterpiece Fallback
        console.log("Tier 6: Using Static Masterpiece...");
        return NextResponse.json({
            url: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&q=80&w=1024",
            prompt: prompt,
            source: 'Harvest Masterpiece (Safety Fallback)',
            usage: { promptTokens, imageTokens: 0, totalTokens: promptTokens }
        });

    } catch (error: any) {
        console.error("Critical AI Route Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
    }
}
