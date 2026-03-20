import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";
import { containsDisallowedContent } from "@/lib/content-policy";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(req: Request) {
    const gate = await cqraRequireAuth(req, "generate_social");
    if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    try {
        const { produceType, variety, quantity, unit, notes, tone, contentLength } = await req.json();

        if (!produceType) {
            return NextResponse.json({ error: "Missing produceType" }, { status: 400 });
        }

        for (const [field, value] of [["produceType", produceType], ["variety", variety || ""], ["notes", notes || ""]] as [string, string][]) {
            if (containsDisallowedContent(value)) {
                return NextResponse.json(
                    { error: `Disallowed content in field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const toneGuide = tone === "Professional"
            ? "Professional and authoritative — business-minded, minimal emojis, credibility-focused"
            : tone === "Storytelling"
            ? "Storytelling and emotive — narrative arc, personal connection to the land, evocative language"
            : "Friendly and casual — warm, neighbourly, moderate emojis, feel-good energy";

        const lengthGuide = contentLength === "long"
            ? "150-300 words, story-driven paragraphs with white space"
            : "2-4 sentences, punchy and direct";

        const produce = variety ? `${variety} ${produceType}` : produceType;

        const prompt = `You are a social media expert for local farmers. Generate platform-specific social media content for a recent harvest.

Produce: ${produce}
${quantity ? `Quantity: ${quantity} ${unit || ""}` : ""}
${notes ? `Notes: ${notes}` : ""}
Tone: ${toneGuide}
Length: ${lengthGuide}

Return a JSON object with these exact keys:
{
  "instagram": "Instagram caption with 3-5 emojis woven naturally, ends with a question or CTA",
  "facebook": "Facebook post — community-focused, friendly, 1-2 sentence paragraphs",
  "twitter": "Tweet under 270 characters, punchy opener, 2-3 hashtags inline",
  "instagramHashtags": "20-25 hashtags as a single string starting with # separated by spaces"
}

Rules:
- Each platform caption must have a completely different opening hook.
- Instagram hashtags go in instagramHashtags field only (not in instagram text).
- Twitter must be ≤270 characters including hashtags.
- Return ONLY valid JSON, no commentary.`;

        const modelsToTry = [
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                });
                const result = await model.generateContent(prompt);
                const text = result.response.text();
                const parsed = JSON.parse(text);

                if (parsed.instagram && parsed.facebook && parsed.twitter) {
                    return NextResponse.json({ ...parsed, source: modelName });
                }
            } catch {
                continue;
            }
        }

        // OpenAI fallback
        if (process.env.OPENAI_API_KEY) {
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are a social media expert for local farmers. Respond in valid JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" },
                });
                const text = completion.choices[0].message.content;
                if (text) {
                    const parsed = JSON.parse(text);
                    if (parsed.instagram && parsed.facebook && parsed.twitter) {
                        return NextResponse.json({ ...parsed, source: "gpt-4o-mini" });
                    }
                }
            } catch {
                // fall through to template
            }
        }

        // Template fallback
        const shortProduce = produceType;
        return NextResponse.json({
            instagram: `Just harvested fresh ${shortProduce} from our farm! 🌱✨ There's nothing quite like the smell of the earth right after a harvest. Who's ready to cook something amazing this week? 🍽️`,
            facebook: `Fresh ${shortProduce} just harvested! Stop by and pick some up while they last. Nothing beats local, fresh-from-the-farm goodness.`,
            twitter: `Fresh ${shortProduce} just picked from our farm! 🌿 Come grab yours before they're gone. #FarmFresh #LocalFood #${shortProduce.replace(/\s+/g, "")}`,
            instagramHashtags: `#FarmFresh #LocalFood #OrganicProduce #FarmToTable #${shortProduce.replace(/\s+/g, "")} #GrowLocal #SustainableFarming #FreshHarvest #FieldToFork #EatLocal #FarmLife #LocalFarmer #SeasonalEats #GardenFresh #SlowFood #CleanEating #WholeFoods #NaturalFood #HarvestSeason #FoodCommunity`,
            source: "template"
        });

    } catch (error: any) {
        console.error("generate-social error:", error.message);
        return NextResponse.json({ error: "Failed to generate social content" }, { status: 500 });
    }
}
