import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: Write a short marketing post about: ${prompt},
        },
      ],
    });

    res.json({
      output: msg.content[0].text,
    });

  } catch (error) {
    console.error(error);
    res.json({
      output: "Error generating content",
    });
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});