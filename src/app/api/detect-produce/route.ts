import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(req: Request) {
    const gate = await cqraRequireAuth(req, "detect_produce");
    if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    try {
        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `You are an expert at identifying farm produce. Look at this image and identify the plant-based produce shown.

Return a JSON object with these exact keys:
{
  "produce": "the primary produce name (e.g. Cherry Tomatoes, Basil, Honey)",
  "variety": "specific variety if visible (e.g. Heirloom, Roma) — empty string if unknown",
  "confidence": "high" | "medium" | "low",
  "isPlantBased": true | false
}

Rules:
- Only identify plant-based produce (fruits, vegetables, herbs, grains, honey, flowers).
- If the image contains meat, fish, dairy, eggs, or non-farm items, set isPlantBased: false and produce: "".
- If you cannot identify the produce clearly, set confidence: "low".
- Return ONLY valid JSON, no commentary.`
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageUrl, detail: "low" }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 150,
        });

        const text = response.choices[0].message.content;
        if (!text) throw new Error("Empty response from vision model");

        const parsed = JSON.parse(text);

        return NextResponse.json({
            produce: parsed.produce || "",
            variety: parsed.variety || "",
            confidence: parsed.confidence || "low",
            isPlantBased: parsed.isPlantBased ?? true,
        });
    } catch (error: any) {
        console.error("detect-produce error:", error.message);
        return NextResponse.json({ error: "Failed to detect produce" }, { status: 500 });
    }
}
