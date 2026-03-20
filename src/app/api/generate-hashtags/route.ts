import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

function getSeason(month: number): string {
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 7) return "Summer";
    if (month >= 8 && month <= 10) return "Fall";
    return "Winter";
}

export async function POST(req: Request) {
    const gate = await cqraRequireAuth(req, "generate_hashtags");
    if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    try {
        const { produceType, farmName, location } = await req.json();

        if (!produceType) {
            return NextResponse.json({ error: "Missing produceType" }, { status: 400 });
        }

        const month = new Date().getMonth(); // 0-indexed
        const season = getSeason(month);

        const prompt = `You are a hashtag strategy expert for local farm social media.
Generate grouped hashtags for a farm post about ${produceType}.

Context:
- Farm name: ${farmName || "a local farm"}
- Location: ${location || "unspecified"}
- Current season: ${season}

Return a JSON object with these exact keys (each is an array of strings without the # symbol):
{
  "brand": ["3-4 farm-specific hashtags including farm name variant if known"],
  "produce": ["5-6 produce-specific hashtags for ${produceType}"],
  "seasonal": ["4-5 seasonal hashtags for ${season}"],
  "location": ["3-4 location hashtags if location known, else generic local-farm hashtags"]
}

Rules:
- Do NOT include # in the strings — just the word/phrase
- Use camelCase or concatenated words (no spaces)
- Total across all groups should be 15-20 tags
- Return ONLY valid JSON`;

        const modelsToTry = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro"];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                });
                const result = await model.generateContent(prompt);
                const parsed = JSON.parse(result.response.text());

                if (parsed.brand && parsed.produce && parsed.seasonal && parsed.location) {
                    return NextResponse.json({ ...parsed, season, source: modelName });
                }
            } catch {
                continue;
            }
        }

        if (process.env.OPENAI_API_KEY) {
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Hashtag strategy expert. Respond in valid JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" },
                });
                const text = completion.choices[0].message.content;
                if (text) {
                    const parsed = JSON.parse(text);
                    if (parsed.brand && parsed.produce) {
                        return NextResponse.json({ ...parsed, season, source: "gpt-4o-mini" });
                    }
                }
            } catch {
                // fall through
            }
        }

        // Template fallback
        const slug = produceType.replace(/\s+/g, "");
        const farmSlug = (farmName || "LocalFarm").replace(/\s+/g, "");
        const locationSlug = (location || "").replace(/[\s,]+/g, "");

        return NextResponse.json({
            brand: [farmSlug, `${farmSlug}Farm`, "LocalHarvest", "FarmFresh"],
            produce: [slug, `Fresh${slug}`, `Organic${slug}`, "FarmProduce", "GrowLocal", "FieldToFork"],
            seasonal: [`${season}Harvest`, `${season}Produce`, `${season}Eats`, "SeasonalFood", "EatWithTheSeason"],
            location: locationSlug
                ? [locationSlug, `${locationSlug}Farms`, `${locationSlug}Food`, "LocalFarmer"]
                : ["LocalFarmer", "CommunityFarm", "SupportLocal", "BuyLocal"],
            season,
            source: "template"
        });

    } catch (error: any) {
        console.error("generate-hashtags error:", error.message);
        return NextResponse.json({ error: "Failed to generate hashtags" }, { status: 500 });
    }
}
