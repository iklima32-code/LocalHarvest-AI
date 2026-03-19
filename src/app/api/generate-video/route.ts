import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FAL_MODEL = "fal-ai/wan-t2v";

export async function POST(req: Request) {
    const gate = await cqraRequireAuth(req, "generate_video");
    if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
        }

        if (!process.env.FAL_KEY) {
            return NextResponse.json(
                { error: "FAL_KEY is not configured. Add it to your .env.local file." },
                { status: 500 }
            );
        }

        // Expand the prompt into a video-optimised description using Gemini
        let expandedPrompt = prompt;
        if (process.env.GEMINI_API_KEY) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent(
                    `You are a world-class cinematographer writing text-to-video prompts for an AI video generator.
                    Expand the following farm/harvest description into a rich, vivid, cinematic video prompt.

                    Include ALL of the following elements:
                    - Camera: specific shot type and motion (e.g. slow dolly-in, low-angle tracking shot, gentle handheld pan, extreme close-up with rack focus)
                    - Lighting: precise quality (e.g. warm golden-hour backlight, soft diffused morning mist, dappled sunlight through foliage, dust motes in afternoon rays)
                    - Texture & detail: tactile surface descriptions (e.g. glistening dew on waxy leaves, rough bark and sun-kissed skin, deep earthy soil, jewel-toned produce)
                    - Motion & life: organic movement (e.g. leaves swaying in a gentle breeze, a bee landing on a blossom, hands carefully cradling ripe fruit, steam rising from soil)
                    - Atmosphere & depth: layered scene (foreground crop detail, midground human or farm activity, background landscape fading to bokeh)
                    - Mood: one-word emotional tone that ties it together (e.g. serene, abundant, hopeful, earthy)

                    Keep it to 80-120 words. Return ONLY the prompt text, no labels or commentary.

                    Input: ${prompt}`
                );
                expandedPrompt = result.response.text().trim() || prompt;
            } catch {
                // Use raw prompt if expansion fails
            }
        }

        console.log(`>>> Submitting video generation to fal.ai WAN 2.1: "${expandedPrompt}"`);

        const res = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
            method: "POST",
            headers: {
                Authorization: `Key ${process.env.FAL_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: expandedPrompt,
                negative_prompt: "blurry, low quality, distorted, watermark, text, logo",
                num_inference_steps: 20,
                guidance_scale: 7.5,
                resolution: "480p",
            }),
        });

        const rawBody = await res.text();
        console.log(`>>> fal.ai response [${res.status}]:`, rawBody);

        if (!res.ok) {
            const err = JSON.parse(rawBody || "{}");
            return NextResponse.json(
                { error: err.detail || err.message || "Failed to submit video generation job" },
                { status: res.status }
            );
        }

        const data = JSON.parse(rawBody);
        if (!data.request_id) {
            console.error(">>> fal.ai returned no request_id:", data);
            return NextResponse.json(
                { error: "fal.ai did not return a request ID. Response: " + rawBody },
                { status: 500 }
            );
        }

        return NextResponse.json({
            predictionId: data.request_id,
            status: data.status,
            expandedPrompt,
        });

    } catch (error: any) {
        console.error("Video generation error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate video" }, { status: 500 });
    }
}
