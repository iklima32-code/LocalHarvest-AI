const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    try {
        const list = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
        console.log("Available Models:");
        list.models.forEach(m => {
            console.log(`- ${m.name} (${m.displayName})`);
            console.log(`  Supported Methods: ${m.supportedGenerationMethods.join(", ")}`);
        });
    } catch (e) {
        if (e.message.includes("is not a function")) {
            // The listModels might not be on the model object in some versions of the SDK
            // Let's check the library documentation or common patterns
            console.error("The SDK version might be different. Trying manual fetch...");
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
                const data = await res.json();
                console.log(JSON.stringify(data, null, 2));
            } catch (err) {
                console.error("Manual fetch failed:", err);
            }
        } else {
            console.error("Error listing models:", e);
        }
    }
}

listModels();
