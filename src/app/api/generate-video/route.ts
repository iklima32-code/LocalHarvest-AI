import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

        if (!process.env.REPLICATE_API_KEY) {
            return NextResponse.json(
                { error: "REPLICATE_API_KEY is not configured. Add it to your .env.local file." },
                { status: 500 }
            );
        }

        // Expand the prompt into a video-optimised description using Gemini
        let expandedPrompt = prompt;
        if (process.env.GEMINI_API_KEY) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(
                    `You are an expert at writing text-to-video prompts.
                    Expand the following description into a detailed, cinematic video prompt.
                    Focus on: camera motion (slow pan, close-up, handheld), lighting, textures, and natural farm action.
                    Keep it under 80 words. Return ONLY the prompt text, no commentary.

                    Input: ${prompt}`
                );
                expandedPrompt = result.response.text().trim() || prompt;
            } catch {
                // Use raw prompt if expansion fails
            }
        }

        console.log(`>>> Submitting video generation to Replicate WAN 2.1: "${expandedPrompt}"`);

        const res = await fetch(
            "https://api.replicate.com/v1/models/wavespeedai/wan-2.1-t2v-480p/predictions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.REPLICATE_API_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "respond-async",
                },
                body: JSON.stringify({
                    input: {
                        prompt: expandedPrompt,
                        negative_prompt: "blurry, low quality, distorted, watermark, text, logo",
                        num_frames: 81,        // ~5 seconds at 16fps
                        frames_per_second: 16,
                        guidance_scale: 7.5,
                        num_inference_steps: 30,
                    },
                }),
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: err.detail || "Failed to submit video generation job" },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json({
            predictionId: data.id,
            status: data.status,
            expandedPrompt,
        });

    } catch (error: any) {
        console.error("Video generation error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate video" }, { status: 500 });
    }
}
