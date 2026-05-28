import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup request body limits for handling webcam/file uploads safely
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // API Route for soccer boots analysis using Gemini 3.5 Flash
  app.post("/api/analyze-boots", async (req, res) => {
    try {
      const { image } = req.body; // Base64 encoded image bytes (without data URI description)
      if (!image) {
        return res.status(400).json({ error: "No image received. Please upload or take a photo." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY is not defined in the workspace environment variables." 
        });
      }

      // Initialize the Gemini client server-side
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare payload
      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      };

      const promptPart = {
        text: "You are the Retro RPG Habit Tracker AI Referee. Analyze this image. Determine if it contains soccer boots, cleats, soccer shoes, athletic shoes, or sports gear that looks like soccer boots/footwear. Output an 8-bit retro, styled verdict (under 50 words). Start with [SUCCESS] if you see soccer boots/cleats/sports shoes. Start with [FAIL] if the photo is NOT soccer boots/shoes/sports gear."
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
      });

      const text = response.text || "";
      res.json({ result: text });
    } catch (err: any) {
      console.error("Gemini boots analysis error:", err);
      res.status(500).json({ error: err.message || "An error occurred during verification." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
