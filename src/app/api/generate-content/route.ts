import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";
import { containsDisallowedContent } from "@/lib/content-policy";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * Robustly parses AI responses into a standardized array of options.
 * Handles nested objects, various array keys, and normalizes platform names.
 */
function parseAIResponse(parsed: any) {
    let rawOptions = [];
    if (Array.isArray(parsed)) {
        rawOptions = parsed;
    } else if (parsed.options && Array.isArray(parsed.options)) {
        rawOptions = parsed.options;
    } else if (parsed.captions && Array.isArray(parsed.captions)) {
        rawOptions = parsed.captions;
    } else if (parsed.results && Array.isArray(parsed.results)) {
        rawOptions = parsed.results;
    } else {
        const firstArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
        if (firstArrayKey) rawOptions = parsed[firstArrayKey];
    }

    if (!rawOptions || rawOptions.length === 0) return [];

    return rawOptions.map((opt: any) => {
        // Normalize platform naming
        let platform = (opt.platform || opt.platform_name || opt.network || "").toLowerCase();
        if (platform.includes("fb") || platform.includes("face")) platform = "facebook";
        if (platform.includes("li") || platform.includes("link")) platform = "linkedin";
        if (platform.includes("ig") || platform.includes("insta")) platform = "instagram";
        if (platform.includes("tik")) platform = "tiktok";
        if (platform.includes("x") || platform.includes("twit")) platform = "x";

        return {
            platform: platform || "unknown",
            caption: opt.caption || opt.text || opt.content || "",
            hashtags: opt.hashtags || opt.tags || "",
            recommended: opt.recommended ?? true
        };
    });
}

export async function POST(req: Request) {
    const gate = await cqraRequireAuth(req, "generate_content");
    if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    try {
        const { harvestData, contentData, contentType, profileSettings } = await req.json();

        // Support both harvest (harvestData) and generic templates (contentData)
        const isHarvest = !contentType || contentType === "harvest";

        if (isHarvest && (!harvestData || !harvestData.produceType)) {
            return NextResponse.json({ error: "Missing harvest data" }, { status: 400 });
        }
        if (!isHarvest && (!contentData || !contentData.primaryField)) {
            return NextResponse.json({ error: "Missing content data" }, { status: 400 });
        }

        const brandVoice = profileSettings?.brandVoice || "Friendly & Casual";
        const emojiPreference = profileSettings?.emojiUsage || "Moderate (Recommended)";
        const defaultHashtags = profileSettings?.defaultHashtags || "#FarmFresh #LocalFood #OrganicProduce";
        const location = profileSettings?.location || "";
        const farmName = profileSettings?.farmName || "the farm";
        const farmType = profileSettings?.farmType || "";
        const farmDescription = profileSettings?.farmDescription || "";

        const farmContext = [
            farmType ? `Farm type: ${farmType}` : "",
            farmDescription ? `About the farm: ${farmDescription}` : "",
        ].filter(Boolean).join("\n      ");

        // Phase A content-policy hard-block.
        const primaryValue = isHarvest ? harvestData.produceType : contentData.primaryField;
        const inputsToCheck: [string, string][] = [
            ['primary', primaryValue],
            ['secondary', isHarvest ? (harvestData.variety || '') : (contentData.secondaryField || '')],
            ['details', isHarvest ? (harvestData.notes || '') : (contentData.details || '')],
            ['farmName', farmName],
            ['location', location],
        ];
        for (const [field, value] of inputsToCheck) {
            if (containsDisallowedContent(value)) {
                return NextResponse.json(
                    { error: `Your content contains disallowed language (field: ${field}). Please edit and try again.` },
                    { status: 400 }
                );
            }
        }

        const contentLength = isHarvest ? harvestData.contentLength : contentData.contentLength;

        const longCopyInstructions = `
      Recommended Structure (High-Performing Long Copy)
      Instead of counting sentences, focus on scroll behavior and readability.

      Ideal Range:
      - 8–20 short sentences (keep sentences to 8-15 words)
      - Usually 150–400 words
      - Broken into 1–2 sentence paragraphs. Never more than 2 sentences per paragraph. Leave white space.

      High-Converting Long Copy Formula:
      1. Hook (1–2 sentences): Stop the scroll using pain or curiosity.
      2. Problem / Agitation (2–4 sentences): Show you understand their issue.
      3. Authority / Insight (3–6 sentences): Educate. Position yourself as the expert local farmer. Use bullet points occasionally.
      4. Offer / Soft CTA (1–3 sentences): No hard sell. Invite conversation. End with a soft question.
      * Emoji Usage: ${emojiPreference}. Use them naturally.
        `;

        const toneInstructions = contentLength === 'short'
            ? `Short and punchy (2-4 sentences total, focus on excitement and immediate value. Always end with a soft Call-To-Action or a friendly question to drive engagement). Emoji Usage: ${emojiPreference}.`
            : `Detailed, high-converting storytelling. Adhere strictly to these long-copy rules:\n${longCopyInstructions}`;

        const sharedRequirements = `
      Specific Requirements:
      - Include these hashtags if relevant: ${defaultHashtags}.
      ${profileSettings?.autoLocation && location ? `- Mention location: ${location}.` : ""}
      ${profileSettings?.autoCTA ? `- Include a "Visit us" or "Shop now" call to action.` : ""}

      Return a JSON array of exactly 2 objects with these exact keys:
      [
        {
          "platform": "facebook",
          "caption": "string (Optimized for Facebook: Community-focused, friendly, short paragraphs, casual tone)",
          "hashtags": "string (3-5 relevant hashtags)",
          "recommended": true
        },
        {
          "platform": "linkedin",
          "caption": "string (Optimized for LinkedIn: Professional, educational, story-driven, business/craftsmanship focus, expert tone)",
          "hashtags": "string (2-3 professional hashtags)",
          "recommended": true
        }
      ]
      
      CRITICAL DIFFERENTIATION RULES:
      1. UNIQUE HOOKS: The opening sentence MUST be completely different for each platform.
      2. UNIQUE TONES: 
         - Facebook: Persona: 'The Friendly Neighbor'. Use more emojis, speak like a neighbor, focus on the immediate joy of the harvest/event.
         - LinkedIn: Persona: 'The Professional Craftsman'. Use fewer emojis, speak like a business owner/expert, focus on the 'why', the craftsmanship, or business of farming.
      3. UNIQUE STRUCTURES: Vary the sentence lengths and paragraph breaks between the two.
      4. ZERO OVERLAP: If the Facebook post starts with 'Exciting news!', the LinkedIn post MUST NOT.
      5. NO COPY-PASTING: They should feel like they were written by two different people.`;

        // Build prompt based on content type
        let prompt: string;

        if (isHarvest) {
            prompt = `You are a social media expert for local farmers. Generate 2 distinct high-engagement social media captions for a recent harvest at ${farmName}${location ? ` in ${location}` : ""}.
            Option 1 should be optimized for Facebook (visual, friendly, community-focused).
            Option 2 should be optimized for LinkedIn (professional, story-driven, business or farming insights).

      Brand Voice: ${brandVoice}
      ${farmContext ? `Farm Context:\n      ${farmContext}` : ""}

      Harvest Details:
      - Produce: ${harvestData.produceType}
      - Variety: ${harvestData.variety || "N/A"}
      - Quantity: ${harvestData.quantity || ""} ${harvestData.unit || ""}
      - Context/Notes: ${harvestData.notes || "N/A"}

      Tone Guide:
      - Length: ${contentLength === 'short' ? 'Short (2-4 sentences)' : 'Long (8-15 sentences)'}
      - Platform Specifics:
        - Facebook: ${contentLength === 'short' ? 'Punchy, neighborly, high energy.' : `Story-rich, community-driven, following: ${longCopyInstructions}`}
        - LinkedIn: ${contentLength === 'short' ? 'Professional update, business insight, direct.' : `Educational, professional storytelling, following: ${longCopyInstructions}`}
      - Emoji Usage: ${emojiPreference}. (High for FB, Low for LI).

      ${sharedRequirements}`;

        } else if (contentType === "behind-scenes") {
            prompt = `You are a social media expert for local farmers. Generate 2 engaging platform-specific behind-the-scenes social media captions (one for Facebook, one for LinkedIn) for ${farmName}${location ? ` in ${location}` : ""}.

      Brand Voice: ${brandVoice}
      ${farmContext ? `Farm Context:\n      ${farmContext}` : ""}

      Post Details:
      - Activity/Topic: ${contentData.primaryField}
      - Featured person: ${contentData.secondaryField || "N/A"}
      - Context: ${contentData.details || "N/A"}
      Tone Guide:
      - Length: ${contentLength === 'short' ? 'Short (2-4 sentences)' : 'Long (8-15 sentences)'}
      - Platform Specifics:
        - Facebook: ${contentLength === 'short' ? 'Punchy, neighborly, high energy.' : `Story-rich, community-driven, following: ${longCopyInstructions}`}
        - LinkedIn: ${contentLength === 'short' ? 'Professional update, business insight, direct.' : `Educational, professional storytelling, following: ${longCopyInstructions}`}
      - Emoji Usage: ${emojiPreference}. (High for FB, Low for LI).

      Goal: Make followers feel like they're right there on the farm. Humanise the brand, show the real work behind the food.
      ${sharedRequirements}`;

        } else if (contentType === "educational") {
            prompt = `You are a social media expert for local farmers. Generate 2 educational platform-specific captions (Facebook/LinkedIn) for ${farmName}${location ? ` in ${location}` : ""} that teach followers something valuable.

      Brand Voice: ${brandVoice}
      ${farmContext ? `Farm Context:\n      ${farmContext}` : ""}

      Post Details:
      - Topic: ${contentData.primaryField}
      - Key takeaway: ${contentData.secondaryField || "N/A"}
      - Background/Facts: ${contentData.details || "N/A"}
      Tone Guide:
      - Length: ${contentLength === 'short' ? 'Short (2-4 sentences)' : 'Long (8-15 sentences)'}
      - Platform Specifics:
        - Facebook: ${contentLength === 'short' ? 'Punchy, neighborly, high energy.' : `Story-rich, community-driven, following: ${longCopyInstructions}`}
        - LinkedIn: ${contentLength === 'short' ? 'Professional update, business insight, direct.' : `Educational, professional storytelling, following: ${longCopyInstructions}`}
      - Emoji Usage: ${emojiPreference}. (High for FB, Low for LI).

      Goal: Position the farmer as a knowledgeable, trustworthy expert. Make the audience smarter and more connected to their food source.
      ${sharedRequirements}`;

        } else if (contentType === "sustainability") {
            prompt = `You are a social media expert for local farmers. Generate 2 platform-specific captions highlighting a sustainable farming practice at ${farmName}${location ? ` in ${location}` : ""}.

      Brand Voice: ${brandVoice}
      ${farmContext ? `Farm Context:\n      ${farmContext}` : ""}

      Post Details:
      - Practice/Initiative: ${contentData.primaryField}
      - Impact/Result: ${contentData.secondaryField || "N/A"}
      - How it works: ${contentData.details || "N/A"}
      Tone Guide:
      - Length: ${contentLength === 'short' ? 'Short (2-4 sentences)' : 'Long (8-15 sentences)'}
      - Platform Specifics:
        - Facebook: ${contentLength === 'short' ? 'Punchy, neighborly, high energy.' : `Story-rich, community-driven, following: ${longCopyInstructions}`}
        - LinkedIn: ${contentLength === 'short' ? 'Professional update, business insight, direct.' : `Educational, professional storytelling, following: ${longCopyInstructions}`}
      - Emoji Usage: ${emojiPreference}. (High for FB, Low for LI).

      Goal: Inspire pride in eco-conscious farming. Build brand credibility and community trust.
      ${sharedRequirements}`;

        } else if (contentType === "recipe") {
            prompt = `You are a social media expert for local farmers. Generate 2 mouthwatering platform-specific recipe or cooking tip captions for ${farmName}${location ? ` in ${location}` : ""}.

      Brand Voice: ${brandVoice}
      ${farmContext ? `Farm Context:\n      ${farmContext}` : ""}

      Post Details:
      - Dish/Tip: ${contentData.primaryField}
      - Main ingredient: ${contentData.secondaryField || "N/A"}
      - Serves/Prep time: ${contentData.extra1 || "N/A"}
      - Steps/Tips: ${contentData.details || "N/A"}
      Tone Guide:
      - Length: ${contentLength === 'short' ? 'Short (2-4 sentences)' : 'Long (8-15 sentences)'}
      - Platform Specifics:
        - Facebook: ${contentLength === 'short' ? 'Punchy, neighborly, high energy.' : `Story-rich, community-driven, following: ${longCopyInstructions}`}
        - LinkedIn: ${contentLength === 'short' ? 'Professional update, business insight, direct.' : `Educational, professional storytelling, following: ${longCopyInstructions}`}
      - Emoji Usage: ${emojiPreference}. (High for FB, Low for LI).

      Goal: Make followers hungry, drive them to buy the featured produce, and position the farm as a lifestyle brand.
      ${sharedRequirements}`;

        } else if (contentType === "event") {
            prompt = `You are a social media expert for local farmers. Generate 2 exciting platform-specific event announcement captions for ${farmName}${location ? ` in ${location}` : ""}.

      Brand Voice: ${brandVoice}
      ${farmContext ? `Farm Context:\n      ${farmContext}` : ""}

      Event Details:
      - Event name: ${contentData.primaryField}
      - Date & Time: ${contentData.secondaryField || "N/A"}
      - Location: ${contentData.extra1 || "N/A"}
      - What to expect: ${contentData.details || "N/A"}
      Tone Guide:
      - Length: ${contentLength === 'short' ? 'Short (2-4 sentences)' : 'Long (8-15 sentences)'}
      - Platform Specifics:
        - Facebook: ${contentLength === 'short' ? 'Punchy, neighborly, high energy.' : `Story-rich, community-driven, following: ${longCopyInstructions}`}
        - LinkedIn: ${contentLength === 'short' ? 'Professional update, business insight, direct.' : `Educational, professional storytelling, following: ${longCopyInstructions}`}
      - Emoji Usage: ${emojiPreference}. (High for FB, Low for LI).

      Goal: Drive attendance, create excitement, and encourage sharing with friends.
      ${sharedRequirements}`;

        } else {
            return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
        }

        // TIER 1 - Gemini models (Prioritizing Speed and Intelligence)
        const modelsToTry = [
            "gemini-2.0-flash-exp",   // Our latest and fastest model
            "gemini-1.5-flash",       // Highly reliable, stable fallback
            "gemini-1.5-pro",         // Smartest fallback for complex requests
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
                    const parsed = JSON.parse(text);
                    const options = parseAIResponse(parsed);

                    if (options.length > 0) {
                        return NextResponse.json({
                            options,
                            source: modelName,
                            usage: {
                                promptTokens: usage?.promptTokenCount,
                                completionTokens: usage?.candidatesTokenCount,
                                totalTokens: usage?.totalTokenCount
                            }
                        });
                    }
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
                    const options = parseAIResponse(parsed);

                    if (options.length > 0) {
                        return NextResponse.json({
                            options,
                            source: "GPT-4o-mini",
                            usage: {
                                promptTokens: completion.usage?.prompt_tokens,
                                completionTokens: completion.usage?.completion_tokens,
                                totalTokens: completion.usage?.total_tokens
                            }
                        });
                    }
                }
            } catch (error: any) {
                console.error("GPT-4o-mini Parsing Error:", error.message);
            }
        }

        // TIER 3 - SMARTER FALLBACK (Human-written Templates)
        console.log("All AI models failed or hit quota. Falling back to templates.");

        const type = isHarvest ? harvestData.produceType : contentData.primaryField;
        const varietyStr = isHarvest && harvestData.variety ? ` (${harvestData.variety})` : "";

        const fallbackOptions = [
            {
                platform: "facebook",
                caption: `Freshly harvested today! 🌿 Our ${type}${varietyStr} is looking absolutely beautiful and ready for your kitchen. Nothing beats the taste of produce that was still in the soil just hours ago. Who else is planning their meals around what's fresh this week?`,
                hashtags: `#localharvest #freshpicked #${type.toLowerCase().replace(/\s+/g, '')} #farmtotable`,
                recommended: true
            },
            {
                platform: "linkedin",
                caption: `Bounty of the day: ${harvestData.quantity || ""} ${harvestData.unit || ""} of fresh ${type}${varietyStr}! ✨ Professionally grown and harvested at peak perfection. We're proud to bring this level of quality to our local agricultural ecosystem. ${harvestData.notes || ""}`,
                hashtags: `#farmlife #agriculture #harvest2024 #sustainability`,
                recommended: true
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
