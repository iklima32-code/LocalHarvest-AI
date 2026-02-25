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
            return NextResponse.json({
                error: "GEMINI_API_KEY not found in environment variables. Please add it to your .env file."
            }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const longCopyInstructions = `
      Recommended Structure (High-Performing Long Copy)
      Instead of counting sentences, focus on scroll behavior and readability.

      Ideal Range:
      - 8–20 short sentences (keep sentences to 8-15 words)
      - Usually 150–400 words
      - Broken into 1–2 sentence paragraphs. Never more than 2 sentences per paragraph. Leave white space.
      
      High-Converting Long Copy Formula:
      1. Hook (1–2 sentences): Stop the scroll using pain or curiosity. 
      2. Problem / Agitation (2–4 sentences): Show you understand their issue (e.g., grocery store veggies that go bad fast, lack of connection to food).
      3. Authority / Insight (3–6 sentences): Educate. Position yourself as the expert local farmer. Relate this back to the specific harvest. Use bullet points occasionally.
      4. Offer / Soft CTA (1–3 sentences): No hard sell. Invite conversation. End with a soft question.
      * Be sure to use a few relevant emojis naturally throughout the copy.

      What NOT to Do:
      - NO 30+ sentence essays
      - NO 5–8 line paragraphs
      - NO Overly technical language
      - NO Hard pitch at the top
        `;

        const toneInstructions = harvestData.contentLength === 'short'
            ? 'Short and punchy (2-4 sentences total, focus on excitement and immediate value. Always end with a soft Call-To-Action or a friendly question to drive engagement).'
            : `Detailed, high-converting storytelling. Adhere strictly to these long-copy rules:\n${longCopyInstructions}`;

        const prompt = `You are a social media expert for local farmers. Generate 3 distinct high-engagement social media caption options for a recent harvest.
      
      Harvest Details:
      - Produce: ${harvestData.produceType}
      - Variety: ${harvestData.variety || "N/A"}
      - Quantity: ${harvestData.quantity || ""} ${harvestData.unit || ""}
      - Context/Notes: ${harvestData.notes || "N/A"}
      - Tone: ${toneInstructions}
      
      Return a JSON array of 3 objects with these exact keys:
      [
        {
          "caption": "string",
          "hashtags": "string (space separated hashtags)",
          "recommended": boolean (Make ONLY ONE of the 3 options recommended: true)
        }
      ]`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const usage = response.usageMetadata;

        try {
            const options = JSON.parse(text);
            return NextResponse.json({
                options,
                usage: {
                    promptTokens: usage?.promptTokenCount,
                    completionTokens: usage?.candidatesTokenCount,
                    totalTokens: usage?.totalTokenCount
                }
            });
        } catch (parseError) {
            console.error("Failed to parse AI response as JSON:", text);
            return NextResponse.json({ error: "AI failed to generate a valid JSON response. Please try again." }, { status: 500 });
        }

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate content" }, { status: 500 });
    }
}
