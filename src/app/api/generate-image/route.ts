import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(req: Request) {
    try {
        const { prompt, style } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
        }

        console.log(`>>> Starting Image Generation Pipeline for: "${prompt}" [Style: ${style}]`);

        // 1. Generate expanded prompt using Gemini 2.5 Flash
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

        if (process.env.GEMINI_API_KEY) {
            try {
                const promptModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const promptResult = await promptModel.generateContent([systemPrompt, `Create a high-quality photo prompt for: ${prompt}`]);
                const promptResponse = await promptResult.response;
                expandedPrompt = promptResponse.text().trim() || prompt;
                promptTokens = promptResponse.usageMetadata?.totalTokenCount || 0;
                console.log(">>> Prompt expanded successfully.");
            } catch (pe: any) {
                console.warn(">>> Prompt expansion failed (likely Quota), using raw prompt:", pe.message);
            }
        }

        // ---------------------------------------------------------
        // THE UPDATED RESCUE SEQUENCE (OpenAI -> Gemini -> Fallbacks)
        // ---------------------------------------------------------

        // TIER 1: GPT-Image-1 (OpenAI DALL-E 3 HD)
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log(">>> Attempting Tier 1: GPT-Image-1 (DALL-E 3 HD)...");
                const response = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: expandedPrompt,
                    n: 1,
                    size: "1024x1024",
                    response_format: "b64_json",
                    quality: "hd"
                });
                if (response.data && response.data[0]?.b64_json) {
                    console.log(">>> Tier 1 Success: DALL-E 3 HD");
                    return NextResponse.json({
                        url: `data:image/png;base64,${response.data[0].b64_json}`,
                        prompt: response.data[0].revised_prompt || expandedPrompt,
                        source: 'GPT-Image-1',
                        usage: { promptTokens, imageTokens: 5000, totalTokens: promptTokens + 5000 }
                    });
                } else {
                    console.warn(">>> Tier 1: OpenAI returned success but no image data.");
                }
            } catch (e: any) {
                console.error(">>> Tier 1 (GPT-Image-1) ERROR:", e.status, e.message);
            }

            // TIER 2: GPT-Image-1.5 (DALL-E 3 Standard)
            try {
                console.log(">>> Attempting Tier 2: GPT-Image-1.5 (DALL-E 3 Standard)...");
                const response = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: expandedPrompt,
                    n: 1,
                    size: "1024x1024",
                    response_format: "b64_json",
                    quality: "standard"
                });
                if (response.data && response.data[0]?.b64_json) {
                    console.log(">>> Tier 2 Success: DALL-E 3 Standard");
                    return NextResponse.json({
                        url: `data:image/png;base64,${response.data[0].b64_json}`,
                        prompt: response.data[0].revised_prompt || expandedPrompt,
                        source: 'GPT-Image-1.5',
                        usage: { promptTokens, imageTokens: 3000, totalTokens: promptTokens + 3000 }
                    });
                } else {
                    console.warn(">>> Tier 2: OpenAI returned success but no image data.");
                }
            } catch (e: any) {
                console.error(">>> Tier 2 (GPT-Image-1.5) ERROR:", e.status, e.message);
            }
        }

        // TIER 3: Gemini 2.5 Flash Image
        if (process.env.GEMINI_API_KEY) {
            try {
                console.log(">>> Attempting Tier 3: Gemini 2.5 Flash Image...");
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" }, { apiVersion: "v1beta" });
                const result = await model.generateContent(expandedPrompt);
                const response = await result.response;
                const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (part?.inlineData) {
                    console.log(">>> Tier 3 Success: Gemini 2.5 Flash");
                    return NextResponse.json({
                        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                        prompt: expandedPrompt,
                        source: 'Gemini 2.5 Flash Image',
                        usage: { promptTokens, imageTokens: 1290, totalTokens: promptTokens + 1290 }
                    });
                }
            } catch (e: any) { console.warn(">>> Tier 3 Failed:", e.message); }

            // TIER 4: Gemini 3 Pro Image (Preview)
            try {
                console.log(">>> Attempting Tier 4: Gemini 3 Pro Image...");
                const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" }, { apiVersion: "v1beta" });
                const result = await model.generateContent(expandedPrompt);
                const response = await result.response;
                const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (part?.inlineData) {
                    console.log(">>> Tier 4 Success: Gemini 3 Pro");
                    return NextResponse.json({
                        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                        prompt: expandedPrompt,
                        source: 'Gemini 3 Pro Image',
                        usage: { promptTokens, imageTokens: 1290, totalTokens: promptTokens + 1290 }
                    });
                }
            } catch (e: any) { console.warn(">>> Tier 4 Failed:", e.message); }
        }

        // TIER 5: Pollinations Fallback (Fresh Render)
        try {
            console.log(">>> Attempting Tier 5: Pollinations Fresh Render...");
            const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(expandedPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}&model=flux`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const res = await fetch(pollinationsUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const buf = await res.arrayBuffer();
                if (buf.byteLength > 1000) {
                    console.log(">>> Tier 5 Success: Pollinations");
                    return NextResponse.json({
                        url: `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`,
                        prompt: expandedPrompt,
                        source: 'Pollinations AI (Flux)',
                        usage: { promptTokens, imageTokens: 0, totalTokens: promptTokens }
                    });
                }
            }
        } catch (e: any) { console.warn(">>> Tier 5 Failed:", e.message); }

        // TIER 6: Lexica Rescue (Database Search)
        try {
            console.log(">>> Attempting Tier 6: Lexica Rescue...");
            const keywords = prompt.split(',')[0].trim();
            const lexRes = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(keywords)}`);
            if (lexRes.ok) {
                const data = await lexRes.json();
                if (data.images && data.images.length > 0) {
                    const bestMatch = data.images[0];
                    const imgRes = await fetch(bestMatch.src);
                    if (imgRes.ok) {
                        const buf = await imgRes.arrayBuffer();
                        console.log(">>> Tier 6 Success: Lexica Rescue");
                        return NextResponse.json({
                            url: `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`,
                            prompt: bestMatch.prompt,
                            source: 'Lexica AI Rescue',
                            usage: { promptTokens, imageTokens: 0, totalTokens: promptTokens }
                        });
                    }
                }
            }
        } catch (e: any) { console.warn(">>> Tier 6 Failed:", e.message); }

        // TIER 7: Unsplash Fallback (Stock Search)
        try {
            console.log(">>> Attempting Tier 7: Unsplash Backup...");
            // Use a more reliable Unsplash photo URL format (curated collection)
            const fallbackMap: Record<string, string> = {
                'tomato': 'https://images.unsplash.com/photo-1592841200221-a6898f307baa',
                'berry': 'https://images.unsplash.com/photo-1518635017498-87afc04923ef',
                'apple': 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce',
                'corn': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076',
                'carrot': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37',
                'farm': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef'
            };

            const key = Object.keys(fallbackMap).find(k => prompt.toLowerCase().includes(k)) || 'farm';
            const imgUrl = `${fallbackMap[key]}?auto=format&fit=crop&q=80&w=1024`;

            console.log(`>>> Tier 7 Success: Unsplash (${key})`);
            return NextResponse.json({
                url: imgUrl,
                prompt: prompt,
                source: `Unsplash ${key.charAt(0).toUpperCase() + key.slice(1)} Backup`,
                usage: { promptTokens, imageTokens: 0, totalTokens: promptTokens }
            });
        } catch (e: any) { console.warn(">>> Tier 7 Failed:", e.message); }

        // TIER 8: Static Masterpiece Fallback
        console.log(">>> Tier 8: Final Safety Net Triggered.");
        return NextResponse.json({
            url: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&q=80&w=1024",
            prompt: prompt,
            source: 'Harvest Masterpiece (Safety Fallback)',
            usage: { promptTokens, imageTokens: 0, totalTokens: promptTokens }
        });

    } catch (error: any) {
        console.error(">>> CRITICAL ERROR in Image Generation Route:", error);
        return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
    }
}
