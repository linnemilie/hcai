"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, TriangleAlert } from "lucide-react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AccessibilityFeedbackDialog } from "./AccessibilityFeedbackDialog";

interface ContrastResult {
  text_color: string;
  background_color: string;
  contrast_ratio: number | "mixed"; // Can be a number or "mixed" for mixed backgrounds
}

interface ImageAnalyzerProps {
  onResultsChange?: (results: ContrastResult[]) => void;
}

export default function ImageAnalyzer({ onResultsChange }: ImageAnalyzerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [results, setResults] = useState<ContrastResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [textSizes, setTextSizes] = useState<{ [key: number]: string }>({});
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false);
  const [accessibilityFeedback, setAccessibilityFeedback] = useState<{
    summary: string;
    issues: { severity: "high" | "medium" | "low"; description: string }[];
    recommendations: string[];
    passedItems: string[];
  } | null>(null);

  // Helper function to get or set text size for a specific result
  const getTextSize = (index: number) => textSizes[index] || "normal";
  const updateTextSize = (index: number, size: string) => {
    setTextSizes((prev) => ({ ...prev, [index]: size }));
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check if it's an image
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result as string);
          setFeedback(null);
          setResults([]);
          if (onResultsChange) {
            onResultsChange([]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        setFeedback("Please upload an image file.");
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setFeedback(null);
        setResults([]);
        setAccessibilityFeedback(null);
        if (onResultsChange) {
          onResultsChange([]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = async () => {
    if (!image) {
      setFeedback("Please upload an image first.");
      return;
    }
    setAccessibilityFeedback(null);
    setFeedback(null);
    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      const data = await response.json();

      if (response.ok) {
        const newResults = data.results || [];
        setResults(newResults);
        if (onResultsChange) {
          onResultsChange(newResults);
        }
      } else {
        setFeedback(data.error || "Failed to analyze image.");
        setResults([]);
        if (onResultsChange) {
          onResultsChange([]);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setFeedback("Error analyzing image.");
      setResults([]);
      if (onResultsChange) {
        onResultsChange([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  const getAccessibilityFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samples: results,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get feedback");
      }

      const data = await response.json();
      console.log("API Response:", data); // Add this logging
      console.log("Feedback structure:", data.feedback); // Examine the structure
      setAccessibilityFeedback(data.feedback);
      setFeedbackOpen(true);
    } catch (error) {
      console.error("Error getting accessibility feedback:", error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Outer border container */}
      <div className="w-full max-w-5xl  rounded-lg p-8  bg-[#d9d9d8]">
        <h2 className="text-xl font-semibold text-center mb-6">
          Image Contrast Analyzer
        </h2>

        {/* Inner flex container for the two colummns */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left side - Image Upload Card */}
          <Card className="w-full md:w-1/2">
            <CardHeader className="px-6 py-4">
              <CardTitle className="text-center">Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`relative flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                  isDragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 bg-gray-50"
                } hover:bg-gray-100`}
                onClick={triggerFileInput}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                {image ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={image || "/placeholder.svg"}
                      alt="Uploaded image"
                      fill
                      className="rounded-lg object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center">
                    <svg
                      className="h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">
                      Click to upload an image or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                )}
              </div>
              {/* Button with Loading Indicator */}
              <Button
                className="w-full flex items-center justify-center gap-2 disabled:opacity-50 bg-[#262626] text-white hover:bg-[#5f5f5f]"
                onClick={handleButtonClick}
                disabled={!image || loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Analyze Image"
                )}
              </Button>
              {loading && (
                <p className="text-center text-sm text-gray-500">
                  Analyzing image, please wait...
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-xs text-gray-500">
                Upload an image to analyze its color contrast
              </p>
            </CardFooter>
          </Card>

          {/* Middle - Results Card */}
          <Card className="w-full md:w-1/2">
            <CardHeader className="px-6 py-4">
              <CardTitle className="text-center">Results</CardTitle>
            </CardHeader>

            <CardContent>
              {results.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="mb-2 font-medium">Contrast Analysis:</h3>
                  <div className="max-h-[400px] overflow-y-auto pr-1">
                    {results.map((result, index) => (
                      <div key={index} className="rounded border p-2 mb-2">
                        <h4 className="font-medium text-sm border-b pb-1 mb-2">
                          Color Pair {index + 1}
                        </h4>
                        {/* Existing result item content */}
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded border"
                            style={{ backgroundColor: result.text_color }}
                          ></div>
                          <span>Text: {result.text_color}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded border"
                            style={{ backgroundColor: result.background_color }}
                          ></div>
                          <span>Background: {result.background_color}</span>
                        </div>
                        <div className="mt-1">
                          <div className="flex items-center gap-1">
                            <div>
                              <span
                                className={`font-semibold ${
                                  typeof result.contrast_ratio === "number" &&
                                  result.contrast_ratio >= 4.5
                                    ? "text-green-700"
                                    : typeof result.contrast_ratio === "number"
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {typeof result.contrast_ratio === "number" ? (
                                  `${
                                    result.contrast_ratio >= 4.5 ? "✓" : "✗"
                                  } Contrast ratio: ${result.contrast_ratio.toFixed(
                                    2
                                  )}`
                                ) : (
                                  <span className="flex items-center gap-1">
                                    Contrast ratio: N/A (mixed background)
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-help">
                                            <TriangleAlert className="h-4 w-4" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-sm p-4">
                                          <h4 className="font-semibold mb-2">
                                            !Mixed Background Warning!
                                          </h4>
                                          <p className="text-xs mb-2">
                                            Mixed backgrounds occur when text
                                            appears over images, gradients, or
                                            non-uniform colors which cannot be
                                            represented by a single color value.
                                          </p>
                                          <p className="text-xs font-medium">
                                            We recommend that you manual manual
                                            check the contrast to evaluate text
                                            visibility against the varying
                                            background colors.
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </span>
                                )}
                              </span>
                            </div>

                            {typeof result.contrast_ratio === "number" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                      <Info className="h-4 w-4 text-gray-500" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm p-4">
                                    <h4 className="font-semibold mb-2">
                                      WCAG Contrast Requirements
                                    </h4>
                                    <p className="mb-2 text-xs">
                                      The Web Content Accessibility Guidelines
                                      (WCAG) define minimum contrast
                                      requirements for accessible text:
                                    </p>
                                    <div className="space-y-2 text-xs">
                                      <div>
                                        <p className="font-medium">
                                          WCAG 2.1 Success Criterion 1.4.3
                                          (Level AA)
                                        </p>
                                        <ul className="list-disc list-inside pl-1">
                                          <li>
                                            Normal text (less than 18pt): 4.5:1
                                            minimum ratio
                                          </li>
                                          <li>
                                            Large text (18pt+ or 14pt+ bold):
                                            3:1 minimum ratio
                                          </li>
                                        </ul>
                                      </div>
                                      <div>
                                        <p className="font-medium">
                                          WCAG 2.1 Success Criterion 1.4.6
                                          (Level AAA):
                                        </p>
                                        <ul className="list-disc list-inside pl-1">
                                          <li>
                                            Normal text (less than 18pt): 7:1
                                            minimum ratio
                                          </li>
                                          <li>
                                            Large text (18pt+ or 14pt+ bold):
                                            4.5:1 minimum ratio
                                          </li>
                                        </ul>
                                      </div>
                                      <p className="mt-1 text-xs italic">
                                        Level AA is the commonly accepted
                                        standard for most websites, while AAA
                                        represents enhanced accessibility.
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          {/*WCAG compliance section*/}
                          {typeof result.contrast_ratio === "number" && (
                            <div className="text-sm mt-3">
                              {/* Add a simple tab interface */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex border rounded overflow-hidden">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          className={`px-2 py-1 text-xs font-medium ${
                                            textSizes[index] !== "large"
                                              ? "bg-gray-100 text-gray-800"
                                              : "bg-white text-gray-500"
                                          }`}
                                          onClick={() =>
                                            updateTextSize(index, "normal")
                                          }
                                        >
                                          Normal Text
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="p-2"
                                      >
                                        <p className="text-xs">
                                          Text under 18pt
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          className={`px-2 py-1 text-xs font-medium ${
                                            textSizes[index] === "large"
                                              ? "bg-gray-100 text-gray-800"
                                              : "bg-white text-gray-500"
                                          }`}
                                          onClick={() =>
                                            updateTextSize(index, "large")
                                          }
                                        >
                                          Large Text
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="p-2"
                                      >
                                        <p className="text-xs">
                                          Text 18pt+ or 14pt+ bold
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>

                              <div className="mt-2 pl-1">
                                {getTextSize(index) !== "large" ? (
                                  // Normal text compliance - remove the explanatory text
                                  <>
                                    {result.contrast_ratio >= 7 ? (
                                      <p className="text-green-700">
                                        ✓ Passes WCAG AAA (highest level)
                                      </p>
                                    ) : result.contrast_ratio >= 4.5 ? (
                                      <p className="text-green-700">
                                        ✓ Passes WCAG AA
                                      </p>
                                    ) : (
                                      <p className="text-red-600">
                                        ✗ Fails WCAG requirements for normal
                                        text
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  // Large text compliance - remove the explanatory text
                                  <>
                                    {result.contrast_ratio >= 4.5 ? (
                                      <p className="text-green-700">
                                        ✓ Passes WCAG AAA (highest level)
                                      </p>
                                    ) : result.contrast_ratio >= 3 ? (
                                      <p className="text-green-700">
                                        ✓ Passes WCAG AA
                                      </p>
                                    ) : (
                                      <p className="text-red-600">
                                        ✗ Fails WCAG requirements for large text
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  <span>Analyzing image...</span>
                </div>
              ) : feedback ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-red-500">{feedback}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  No results to display yet. Upload and analyze an image to see
                  results.
                </div>
              )}
            </CardContent>
            {results.length > 0 && (
              <div className="px-6 pb-0 pt-0">
                <Button
                  onClick={
                    accessibilityFeedback
                      ? () => setFeedbackOpen(true)
                      : getAccessibilityFeedback
                  }
                  className="w-full bg-[#262626] text-white hover:bg-[#5f5f5f] hover:text-white"
                  disabled={feedbackLoading}
                >
                  {feedbackLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Feedback...
                    </>
                  ) : accessibilityFeedback ? (
                    "View Accessibility Feedback"
                  ) : (
                    "Get Accessibility Feedback"
                  )}
                </Button>
              </div>
            )}

            {results.length > 0 && (
              <CardFooter className="flex justify-center">
                <p className="text-xs text-gray-500 italic">
                  This analysis is generated by artificial intelligence and
                  should be used as a guide only.
                </p>
              </CardFooter>
            )}
          </Card>
        </div>
        <AccessibilityFeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          feedback={accessibilityFeedback} // Use the properly structured data
        />
      </div>
    </div>
  );
}
