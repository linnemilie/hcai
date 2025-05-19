import { NextResponse } from "next/server";
import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";
import {
  calculateContrast,
  InputData,
  ContrastResult,
} from "./utils/contrastUtils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const promptFilePath = path.join(
      process.cwd(),
      "src/app/api/analyze/prompts/extract_hex.txt"
    );
    const promptText = await fs.readFile(promptFilePath, "utf8");

    // const verificationPromptPath = path.join(
    //   process.cwd(),
    //   "src/app/api/analyze/prompts/verifying.txt"
    // );
    // const verificationPrompt = await fs.readFile(
    //   verificationPromptPath,
    //   "utf8"
    // );

    // Initial analysis request with option to continue the conversation
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.0,
      messages: [
        {
          role: "system",
          content:
            "You are a precise color analysis tool. Extract exact hex color codes from images with consistent results. Always provide colors in #RRGGBB format with maximum accuracy.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: { url: image },
            },
          ],
        },
      ],
    });

    const initialAnalysis = response.choices[0].message.content;
    console.log("Initial hex info from OpenAI:", initialAnalysis);

    if (!initialAnalysis) {
      return NextResponse.json(
        { error: "No content received from OpenAI" },
        { status: 500 }
      );
    }

    // // Second pass: Verify and refine the analysis using the same conversation context
    // const verificationResponse = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   temperature: 0.1,
    //   messages: [
    //     {
    //       role: "system",
    //       content:
    //         "You are a precise color analysis tool. Extract exact hex color codes from images with consistent results. Always provide colors in #RRGGBB format with maximum accuracy.",
    //     },
    //     {
    //       role: "user",
    //       content: [
    //         { type: "text", text: promptText },
    //         {
    //           type: "image_url",
    //           image_url: { url: image },
    //         },
    //       ],
    //     },
    //     {
    //       role: "assistant",
    //       content: initialAnalysis,
    //     },
    //     {
    //       role: "user",
    //       content: [
    //         { type: "text", text: verificationPrompt },
    //         {
    //           type: "image_url",
    //           image_url: { url: image },
    //         },
    //       ],
    //     },
    //   ],
    // });

    // const verifiedAnalysis = verificationResponse.choices[0].message.content;
    // console.log("Verified hex info from OpenAI:", verifiedAnalysis);

    // if (!verifiedAnalysis) {
    //   return NextResponse.json(
    //     { error: "No verification received from OpenAI" },
    //     { status: 500 }
    //   );
    // }

    let contrastResults: ContrastResult[] = [];
    let parsedInfo: InputData | null = null;

    try {
      let jsonContent = "";

      // First check if the response is already a clean JSON string
      if (
        initialAnalysis.trim().startsWith("{") &&
        initialAnalysis.trim().endsWith("}")
      ) {
        jsonContent = initialAnalysis.trim();
      } else {
        // If not, try to extract JSON using regex
        const jsonRegex = /```json\s*({[\s\S]*?})\s*```|({[\s\S]*?})/g;
        const matches = [...initialAnalysis.matchAll(jsonRegex)];

        if (matches.length > 0) {
          // Use the first match, prioritizing the content inside code blocks if present
          jsonContent = (matches[0][1] || matches[0][2]).trim();
        } else {
          throw new Error("No JSON structure found in the response");
        }
      }

      // Remove comments from JSON before parsing
      jsonContent = jsonContent
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");

      // Clean up any trailing commas which are invalid in JSON
      jsonContent = jsonContent.replace(/,(\s*[}\]])/g, "$1");

      // Log the cleaned JSON before parsing
      //console.log("Cleaned JSON for parsing:", jsonContent);

      try {
        parsedInfo = JSON.parse(jsonContent) as InputData;
      } catch (parseError: unknown) {
        console.error("JSON parse error:", parseError);
        const errorMessage =
          parseError instanceof Error
            ? parseError.message
            : "Unknown parsing error";

        throw new Error(`JSON parsing failed: ${errorMessage}`);
      }

      // Validate that the parsed object has the expected structure
      if (!parsedInfo.text_blocks || !Array.isArray(parsedInfo.text_blocks)) {
        throw new Error("Invalid response format: missing text_blocks array");
      }

      contrastResults = calculateContrast(parsedInfo);
      // Filter out results where text color and background color are identical
      contrastResults = contrastResults.filter((result) => {
        return result.text_color !== result.background_color;
      });
      // Filter out duplicate color combinations
      const seen = new Set<string>();
      contrastResults = contrastResults.filter((result) => {
        const colorPair = `${result.text_color}-${result.background_color}`;
        if (seen.has(colorPair)) {
          return false; // Skip this duplicate
        }
        seen.add(colorPair);
        return true;
      });
    } catch (e) {
      console.error("Failed to parse OpenAI response:", e);
      console.log("Raw response:", initialAnalysis);

      return NextResponse.json(
        { error: "Invalid response format from OpenAI" },
        { status: 500 }
      );
    }

    // Add sample text information to each result
    const resultsWithSamples = contrastResults.map((result) => ({
      ...result,
      sample_text: {
        text: "Sample Text",
        styles: {
          color: result.text_color,
          backgroundColor: result.background_color,
        },
      },
    }));

    return NextResponse.json({
      results: resultsWithSamples,
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
