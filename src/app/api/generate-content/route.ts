import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(req: Request) {
    try {
        const { harvestData, profileSettings } = await req.json();

        if (!harvestData || !harvestData.produceType) {
            return NextResponse.json({ error: "Missing harvest data" }, { status: 400 });
        }

        const brandVoice = profileSettings?.brandVoice || "Friendly & Casual";
        const emojiPreference = profileSettings?.emojiUsage || "Moderate (Recommended)";
        const defaultHashtags = profileSettings?.defaultHashtags || "#FarmFresh #LocalFood #OrganicProduce";
        const location = profileSettings?.location || "";
        const farmName = profileSettings?.farmName || "the farm";

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
      * Emoji Usage: ${emojiPreference}. Use them naturally.
        `;

        const toneInstructions = harvestData.contentLength === 'short'
            ? `Short and punchy (2-4 sentences total, focus on excitement and immediate value. Always end with a soft Call-To-Action or a friendly question to drive engagement). Emoji Usage: ${emojiPreference}.`
            : `Detailed, high-converting storytelling. Adhere strictly to these long-copy rules:\n${longCopyInstructions}`;

        const prompt = `You are a social media expert for local farmers. Generate 3 distinct high-engagement social media caption options for a recent harvest at ${farmName}${location ? ` in ${location}` : ""}.
      
      Brand Voice: ${brandVoice}
      
      Harvest Details:
      - Produce: ${harvestData.produceType}
      - Variety: ${harvestData.variety || "N/A"}
      - Quantity: ${harvestData.quantity || ""} ${harvestData.unit || ""}
      - Context/Notes: ${harvestData.notes || "N/A"}
      - Tone: ${toneInstructions}
      
      Specific Requirements:
      - Include these hashtags if relevant: ${defaultHashtags}.
      ${profileSettings?.autoLocation && location ? `- Mention location: ${location}.` : ""}
      ${profileSettings?.autoCTA ? `- Include a "Visit us" or "Shop now" call to action.` : ""}

      Return a JSON array of 3 objects with these exact keys:
      [
        {
          "caption": "string",
          "hashtags": "string (space separated hashtags)",
          "recommended": boolean (Make ONLY ONE of the 3 options recommended: true)
        }
      ]`;

        // TIER 1 - Gemini models
        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash-exp"
        ];

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting content generation with: ${modelName}`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                    }
                });

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                const usage = response.usageMetadata;

                try {
                    const options = JSON.parse(text);
                    return NextResponse.json({
                        options,
                        source: modelName,
                        usage: {
                            promptTokens: usage?.promptTokenCount,
                            completionTokens: usage?.candidatesTokenCount,
                            totalTokens: usage?.totalTokenCount
                        }
                    });
                } catch (parseError) {
                    console.error(`Model ${modelName} failed to return valid JSON:`, text);
                    continue;
                }
            } catch (error: any) {
                console.warn(`Model ${modelName} hit an error:`, error.message);
                continue;
            }
        }

        // TIER 2 - OPENAI FALLBACK (GPT-5 Nano / GPT-4o-mini)
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log("Attempting Tier 2 (OpenAI): GPT-5 Nano...");
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are a social media expert for local farmers. Always respond in valid JSON format." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                });

                const text = completion.choices[0].message.content;
                if (text) {
                    const parsed = JSON.parse(text);
                    let options = [];

                    // Robust check for the array in various possible keys
                    if (Array.isArray(parsed)) {
                        options = parsed;
                    } else if (parsed.options && Array.isArray(parsed.options)) {
                        options = parsed.options;
                    } else if (parsed.captions && Array.isArray(parsed.captions)) {
                        options = parsed.captions;
                    } else if (parsed.results && Array.isArray(parsed.results)) {
                        options = parsed.results;
                    } else {
                        // If it's an object containing arrays, use the first array found
                        const firstArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
                        if (firstArrayKey) {
                            options = parsed[firstArrayKey];
                        }
                    }

                    // Final safety: ensure we have at least something to show
                    if (options.length > 0) {
                        return NextResponse.json({
                            options: options.slice(0, 3).map((opt: any) => ({
                                caption: opt.caption || opt.text || "",
                                hashtags: opt.hashtags || opt.tags || "",
                                recommended: opt.recommended || false
                            })),
                            source: "GPT-5 Nano",
                            usage: {
                                promptTokens: completion.usage?.prompt_tokens,
                                completionTokens: completion.usage?.completion_tokens,
                                totalTokens: completion.usage?.total_tokens
                            }
                        });
                    }
                }
            } catch (error: any) {
                console.error("GPT-5 Nano Parsing Error:", error.message);
            }
        }

        // TIER 3 - SMARTER FALLBACK (Human-written Templates)
        console.log("All AI models failed or hit quota. Falling back to templates.");

        const type = harvestData.produceType;
        const varietyStr = harvestData.variety ? ` (${harvestData.variety})` : "";

        const fallbackOptions = [
            {
                caption: `Freshly harvested today! 🌿 Our ${type}${varietyStr} is looking absolutely beautiful and ready for your kitchen. Nothing beats the taste of produce that was still in the soil just hours ago. Who else is planning their meals around what's fresh this week?`,
                hashtags: `#localharvest #freshpicked #${type.toLowerCase().replace(/\s+/g, '')} #farmtotable`,
                recommended: true
            },
            {
                caption: `Bounty of the day: ${harvestData.quantity || ""} ${harvestData.unit || ""} of fresh ${type}${varietyStr}! ✨ We put a lot of love into growing these, and it's so rewarding to see them reach peak perfection. Come grab some while they're still morning-fresh!`,
                hashtags: `#farmlife #harvestday #supportlocal #healthyfood`,
                recommended: false
            },
            {
                caption: `Just hauled in a fresh batch of ${type}! The colors and aroma are incredible. Truly the best part of our day is sharing this organic goodness with our local community. What's your favorite way to prepare ${type}?`,
                hashtags: `#organic #${type.toLowerCase().replace(/\s+/g, '')} #eatlocal #harvestnotes`,
                recommended: false
            }
        ];

        return NextResponse.json({
            options: fallbackOptions,
            source: "Template Fallback",
            warning: "Displaying curated templates because AI engines are currently at capacity.",
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        });

    } catch (error: any) {
        console.error("Critical Route Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate content" }, { status: 500 });
    }
}
