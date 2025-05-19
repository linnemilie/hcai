import { NextResponse } from "next/server";
import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

export async function POST(req: Request) {
  try {
    const { samples, customColors } = await req.json();

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json(
        { error: "Valid color samples are required" },
        { status: 400 }
      );
    }

    // Prepare the data for the prompt
    const colorData = samples.map((sample, index) => {
      const customColor = customColors?.[index];
      const textColor = customColor ? customColor.text : sample.text_color;
      const bgColor = customColor ? customColor.bg : sample.background_color;
      const contrastRatio = customColor
        ? customColor.contrastRatio
        : sample.contrast_ratio;

      return {
        textColor,
        backgroundColor: bgColor === "mixed" ? "mixed background" : bgColor,
        contrastRatio:
          typeof contrastRatio === "number" ? contrastRatio.toFixed(2) : "N/A",
      };
    });

    // Format the prompt with the color data
    let prompt = `You are an accessibility expert specializing in color contrast. Analyze the following text/background color combinations and provide detailed feedback:\n\n`;

    colorData.forEach((item, i) => {
      prompt += `Color Pair ${i + 1}:\n`;
      prompt += `- Text Color: ${item.textColor}\n`;
      prompt += `- Background Color: ${item.backgroundColor}\n`;
      prompt += `- Contrast Ratio: ${item.contrastRatio}\n\n`;
    });

    prompt += `WCAG Guidelines:\n`;
    prompt += `- Level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text\n`;
    prompt += `- Level AAA requires a contrast ratio of at least 7:1 for normal text and 4.5:1 for large text\n\n`;

    prompt += `Based on this information, provide the following in JSON format:
    1. A brief summary of the overall accessibility status (1-2 sentences)
    2. Specific issues identified, each with a severity level (high, medium, or low)
    3. Concrete recommendations to improve accessibility, including:
       - General guidance on whether to make text darker/lighter or background darker/lighter
       - Approximate degree of change needed (slight, moderate, significant)
       - If a color pair has very low contrast, suggest considering a completely different color scheme
       - AVOID suggesting specific hex codes, as calculations may vary between systems
       - Format each recommendation as a plain string like "Color Pair X: Your recommendation text here"
    4. Positive aspects of the current design that are already working well
    
    Format your response as a valid JSON object with these keys: summary, issues, recommendations, and passedItems.
    `;
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an accessibility expert specialized in color contrast analysis. Provide actionable feedback and specific recommendations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    let feedback;
    try {
      feedback = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI JSON response:", e);
      console.log("Raw response:", content);
      throw new Error("Invalid response format from OpenAI");
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error generating accessibility feedback:", error);
    return NextResponse.json(
      { error: "Failed to generate accessibility feedback" },
      { status: 500 }
    );
  }
}
