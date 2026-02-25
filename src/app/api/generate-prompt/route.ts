import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { harvestData } = await req.json();

        if (!harvestData || !harvestData.produceType) {
            return NextResponse.json({ error: "Missing harvest data" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY not found" }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        return NextResponse.json({ prompt: text });
    } catch (error: any) {
        console.error("Prompt Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate prompt" }, { status: 500 });
    }
}
