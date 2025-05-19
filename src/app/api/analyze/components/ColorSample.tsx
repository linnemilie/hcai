"use client";
import { AccessibilityFeedbackDialog } from "./AccessibilityFeedbackDialog";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Info, Pipette, Trash2 } from "lucide-react";
import { calculateContrast, InputData } from "../utils/contrastUtils";
import {
  simulateColorblindness,
  ColorblindType,
} from "../utils/colorblindUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Individual sample component
interface ColorSampleProps {
  textColor: string;
  backgroundColor: string;
  sampleText?: string;
  className?: string;
  onColorChange?: (textColor: string, backgroundColor: string) => void;
}

// Container component for displaying multiple color samples
interface ColorSamplesContainerProps {
  results: Array<{
    text_color: string;
    background_color: string;
    contrast_ratio: number;
  }>;
}

export default function ColorSamplesContainer({
  results,
}: ColorSamplesContainerProps) {
  const [customColors, setCustomColors] = useState<{
    [key: number]: { text: string; bg: string; contrastRatio: number };
  }>({});
  const [previousResultsLength, setPreviousResultsLength] = useState(0);
  const [analysisId, setAnalysisId] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ColorblindType>("colors");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  // Function to scroll to bottom of container
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  };

  const [manualSamples, setManualSamples] = useState<
    Array<{
      text_color: string;
      background_color: string;
      contrast_ratio: number;
      isManual: boolean;
      isModified: boolean;
    }>
  >([]);

  useEffect(() => {
    if (manualSamples.length > 0) {
      // Use a longer timeout to ensure rendering is complete
      setTimeout(scrollToBottom, 200);
    }
  }, [manualSamples.length]);

  // Reset custom colors when results change (new analysis performed)
  useEffect(() => {
    // Only clear custom colors if this is a new set of results (not just mounting)
    if (
      results.length > 0 &&
      (results.length !== previousResultsLength || hasResultsChanged())
    ) {
      setCustomColors({});
      // Reset feedback when new results come in
      setFeedback(null);
      // Increment the analysis ID to force component remounts
      setAnalysisId((prev) => prev + 1);
      setActiveTab("colors");
    }

    // Update previous results info for future comparisons
    setPreviousResultsLength(results.length);

    // This tracks if the results content has changed
    function hasResultsChanged() {
      if (results.length === 0 || previousResults.current.length === 0) {
        return results.length !== previousResults.current.length;
      }

      // Compare the first result as a simple heuristic
      const oldFirstResult = previousResults.current[0];
      const newFirstResult = results[0];

      // If either doesn't exist, something changed
      if (!oldFirstResult || !newFirstResult) return true;

      // Check if the colors changed
      return (
        oldFirstResult.text_color !== newFirstResult.text_color ||
        oldFirstResult.background_color !== newFirstResult.background_color
      );
    }
  }, [results]);

  const addManualSample = () => {
    // Default colors for a new sample
    const defaultTextColor = "#000000";
    const defaultBgColor = "#ffffff";

    // Calculate contrast for the default colors
    const inputData: InputData = {
      text_blocks: [
        { text_color: defaultTextColor, background_color: defaultBgColor },
      ],
    };
    const contrastResults = calculateContrast(inputData);

    const newSample = {
      text_color: defaultTextColor,
      background_color: defaultBgColor,
      contrast_ratio: contrastResults[0].contrast_ratio,
      isManual: true,
      isModified: false,
    };

    setManualSamples([...manualSamples, newSample]);
  };

  // Function to update a manual sample
  const updateManualSample = (
    index: number,
    textColor: string,
    backgroundColor: string
  ) => {
    // Calculate new contrast
    const inputData: InputData = {
      text_blocks: [
        { text_color: textColor, background_color: backgroundColor },
      ],
    };
    const contrastResults = calculateContrast(inputData);

    const updatedSamples = [...manualSamples];
    updatedSamples[index] = {
      text_color: textColor,
      background_color: backgroundColor,
      contrast_ratio: contrastResults[0].contrast_ratio,
      isManual: true,
      isModified: true,
    };

    setManualSamples(updatedSamples);
  };

  // Function to remove a manual sample
  const removeManualSample = (index: number) => {
    const updatedSamples = manualSamples.filter((_, i) => i !== index);
    setManualSamples(updatedSamples);
  };

  // Store previous results for comparison
  const previousResults = useRef(results);
  useEffect(() => {
    previousResults.current = results;
  }, [results]);

  const handleColorChange = (
    index: number,
    textColor: string,
    backgroundColor: string
  ) => {
    // Use the existing calculateContrast function
    const inputData: InputData = {
      text_blocks: [
        { text_color: textColor, background_color: backgroundColor },
      ],
    };

    const contrastResults = calculateContrast(inputData);
    const newContrastRatio = contrastResults[0].contrast_ratio;

    setCustomColors({
      ...customColors,
      [index]: {
        text: textColor,
        bg: backgroundColor,
        contrastRatio: newContrastRatio,
      },
    });
  };
  // Filter out entries with mixed backgrounds
  const validResults = results.filter(
    (result) => result.background_color !== "mixed"
  );
  const allSamples = [...validResults, ...manualSamples];

  return (
    <div className="w-full max-w-5xl rounded-lg p-8 bg-[#d9d9d8] h-full flex flex-col">
      <h2 className="text-xl font-semibold text-center mb-6">
        Color Samples
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block ml-2 cursor-help">
                <Info className="h-5 w-5 text-gray-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm p-4">
              <h4 className="font-semibold mb-2">Color Sample Editor</h4>
              <p className="text-xs">
                Click on any color sample to edit its text and background
                colors. Use this feature to test different color combinations
                for accessibility.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h2>

      <Card className="w-full flex-1 flex flex-col">
        <CardHeader className="px-6 py-4">
          {allSamples.length > 0 && (
            <div className="flex">
              <div className="w-full">
                <Tabs
                  value={activeTab === "colors" ? "normal" : "colorblind"}
                  className="w-full"
                  onValueChange={(value) => {
                    if (value === "normal") {
                      setActiveTab("colors");
                    } else {
                      // If not already in a colorblind mode, default to protanopia
                      if (activeTab === "colors") {
                        setActiveTab("protanopia");
                      }
                      // If already in a colorblind mode, clicking the tab again opens the dropdown
                    }
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="normal">Normal</TabsTrigger>

                    {/* Use the state variable to control the popover */}
                    <Popover
                      open={isPopoverOpen}
                      onOpenChange={setIsPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <div className="relative flex-1">
                          <TabsTrigger value="colorblind" className="w-full">
                            {activeTab === "colors"
                              ? "Colorblind"
                              : activeTab === "protanopia"
                              ? "Red-Blind"
                              : activeTab === "deuteranopia"
                              ? "Green-Blind"
                              : activeTab === "tritanopia"
                              ? "Blue-Blind"
                              : "Monochromacy"}
                          </TabsTrigger>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[220px]" align="end">
                        <div className="flex flex-col">
                          <Button
                            variant={
                              activeTab === "protanopia" ? "secondary" : "ghost"
                            }
                            className="justify-start rounded-none text-xs h-9"
                            onClick={() => {
                              setActiveTab("protanopia");
                              setIsPopoverOpen(false); // Close the popover
                            }}
                          >
                            Red-Blind (Protanopia)
                          </Button>
                          <Button
                            variant={
                              activeTab === "deuteranopia"
                                ? "secondary"
                                : "ghost"
                            }
                            className="justify-start rounded-none text-xs h-9"
                            onClick={() => {
                              setActiveTab("deuteranopia");
                              setIsPopoverOpen(false); // Close the popover
                            }}
                          >
                            Green-Blind (Deuteranopia)
                          </Button>
                          <Button
                            variant={
                              activeTab === "tritanopia" ? "secondary" : "ghost"
                            }
                            className="justify-start rounded-none text-xs h-9"
                            onClick={() => {
                              setActiveTab("tritanopia");
                              setIsPopoverOpen(false); // Close the popover
                            }}
                          >
                            Blue-Blind (Tritanopia)
                          </Button>
                          <Button
                            variant={
                              activeTab === "achromatopsia"
                                ? "secondary"
                                : "ghost"
                            }
                            className="justify-start rounded-none text-xs h-9"
                            onClick={() => {
                              setActiveTab("achromatopsia");
                              setIsPopoverOpen(false); // Close the popover
                            }}
                          >
                            Monochromasy (Achromatopsia)
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {allSamples.length === 0 ? (
            <div
              ref={scrollContainerRef}
              className="flex flex-col items-center justify-center h-48 text-gray-500 flex-1"
            >
              <p className="mb-4">
                {results.length > 0
                  ? "No valid color samples available. All backgrounds are mixed."
                  : "No samples to display yet."}
              </p>
              <Button
                onClick={addManualSample}
                variant="outline"
                className="bg-[#262626] text-white hover:bg-[#5f5f5f] hover:text-white"
              >
                Add Manual Sample
              </Button>
            </div>
          ) : (
            <>
              <div
                ref={scrollContainerRef}
                className="space-y-4 overflow-y-auto pr-1 flex-1"
                style={{ maxHeight: "400px" }}
              >
                {validResults.map((result, index) => {
                  const customColor = customColors[index];
                  let textColor = customColor
                    ? customColor.text
                    : result.text_color;
                  let backgroundColor = customColor
                    ? customColor.bg
                    : result.background_color;
                  if (activeTab !== "colors") {
                    textColor = simulateColorblindness(textColor, activeTab);
                    backgroundColor = simulateColorblindness(
                      backgroundColor,
                      activeTab
                    );
                  }

                  const contrastRatio = customColor
                    ? customColor.contrastRatio
                    : result.contrast_ratio;
                  const isGoodContrast = contrastRatio >= 4.5;

                  return (
                    <div
                      key={`result-${index}`}
                      className="p-2 border rounded mb-4"
                    >
                      {/* Only show Color Pair heading if not modified */}
                      {!customColor && (
                        <h4 className="font-medium text-sm border-b pb-1 mb-2">
                          Color Pair {index + 1}
                        </h4>
                      )}
                      <ColorSample
                        key={`${analysisId}-${index}-${activeTab}`}
                        textColor={textColor}
                        backgroundColor={backgroundColor}
                        sampleText="Sample Text"
                        className="w-full py-4"
                        onColorChange={(text, bg) =>
                          handleColorChange(index, text, bg)
                        }
                      />
                      {customColor && (
                        <div className="mt-2 text-xs text-center">
                          <span className="text-gray-500">
                            *Custom colors applied
                          </span>
                          <div
                            className={`mt-1 font-medium ${
                              isGoodContrast ? "text-green-700" : "text-red-600"
                            }`}
                          >
                            Contrast ratio: {contrastRatio.toFixed(2)}
                            {isGoodContrast ? " ✓" : " ✗"}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Manual samples section */}
                {manualSamples.map((sample, index) => {
                  const isGoodContrast = sample.contrast_ratio >= 4.5;

                  // Apply colorblind simulation if that tab is active
                  let textColor = sample.text_color;
                  let backgroundColor = sample.background_color;

                  if (activeTab !== "colors") {
                    textColor = simulateColorblindness(textColor, activeTab);
                    backgroundColor = simulateColorblindness(
                      backgroundColor,
                      activeTab
                    );
                    console.log("Simulated color for text:", textColor);
                  }

                  return (
                    <div
                      key={`manual-${index}`}
                      className="p-2 border rounded mb-4 border-dashed"
                    >
                      <div className="flex justify-end mb-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeManualSample(index)}
                          className="h-6 text-xs hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <ColorSample
                        key={`manual-sample-${index}-${activeTab}`}
                        textColor={textColor}
                        backgroundColor={backgroundColor}
                        sampleText="Manual Sample"
                        className="w-full py-4"
                        onColorChange={(text, bg) =>
                          updateManualSample(index, text, bg)
                        }
                      />
                      <div className="mt-2 text-xs text-center">
                        {sample.isModified ? (
                          <>
                            <span className="text-gray-500">
                              Manual color sample applied
                            </span>
                            <div
                              className={`mt-1 font-medium ${
                                isGoodContrast
                                  ? "text-green-700"
                                  : "text-red-600"
                              }`}
                            >
                              Contrast ratio: {sample.contrast_ratio.toFixed(2)}
                              {isGoodContrast ? " ✓" : " ✗"}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add sample button */}
              <div className="flex justify-center pt-2 mt-auto ">
                <Button
                  onClick={addManualSample}
                  variant="outline"
                  className="w-full bg-[#262626] text-white hover:bg-[#5f5f5f] hover:text-white"
                >
                  + Add Manual Color Sample
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AccessibilityFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        feedback={feedback}
      />
    </div>
  );
}

export function ColorSample({
  textColor,
  backgroundColor,
  sampleText = "Sample Text",
  className = "",
  onColorChange,
}: ColorSampleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState(textColor);
  const [currentBgColor, setCurrentBgColor] = useState(backgroundColor);
  const [textSize, setTextSize] = useState<"normal" | "large">("normal");

  // Calculate contrast ratio using the imported functions
  const calculateContrastRatio = () => {
    const inputData: InputData = {
      text_blocks: [
        { text_color: currentTextColor, background_color: currentBgColor },
      ],
    };
    const results = calculateContrast(inputData);
    return results[0].contrast_ratio;
  };

  const contrastRatio = calculateContrastRatio();
  const isAACompliant =
    textSize === "normal" ? contrastRatio >= 4.5 : contrastRatio >= 3.0;
  const isAAACompliant =
    textSize === "normal" ? contrastRatio >= 7.0 : contrastRatio >= 4.5;

  const handleApply = () => {
    if (onColorChange) {
      onColorChange(currentTextColor, currentBgColor);
    }
    setIsOpen(false);
  };

  const handleEyeDropper = async (colorType: "text" | "background") => {
    // Check if the EyeDropper API is available
    if ("EyeDropper" in window) {
      try {
        // @ts-ignore - EyeDropper is not in the standard TS types yet
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (colorType === "text") {
          setCurrentTextColor(result.sRGBHex);
        } else {
          setCurrentBgColor(result.sRGBHex);
        }
      } catch (error) {
        console.error("Error using eyedropper:", error);
      }
    } else {
      alert("EyeDropper API is not supported in your browser");
    }
  };

  // Add WCAG compliance section
  const wcagComplianceSection = (
    <div className="text-sm mt-3 border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium">WCAG Compliance</h5>
        <div className="flex border rounded overflow-hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`px-2 py-1 text-xs font-medium ${
                    textSize === "normal"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-white text-gray-500"
                  }`}
                  onClick={() => setTextSize("normal")}
                >
                  Normal Text
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-2">
                <p className="text-xs">Text under 18pt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`px-2 py-1 text-xs font-medium ${
                    textSize === "large"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-white text-gray-500"
                  }`}
                  onClick={() => setTextSize("large")}
                >
                  Large Text
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-2">
                <p className="text-xs">Text 18pt+ or 14pt+ bold</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div>
          <span
            className={`font-semibold ${
              isAACompliant ? "text-green-700" : "text-red-600"
            }`}
          >
            {isAACompliant ? "✓" : "✗"} Contrast ratio:{" "}
            {contrastRatio.toFixed(2)}
          </span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Info className="h-4 w-4 text-gray-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm p-4">
              <h4 className="font-semibold mb-2">WCAG Contrast Requirements</h4>
              <p className="mb-2 text-xs">
                The Web Content Accessibility Guidelines (WCAG) define minimum
                contrast requirements for accessible text:
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-medium">
                    WCAG 2.1 Success Criterion 1.4.3 (Level AA)
                  </p>
                  <ul className="list-disc list-inside pl-1">
                    <li>Normal text (less than 18pt): 4.5:1 minimum ratio</li>
                    <li>Large text (18pt+ or 14pt+ bold): 3:1 minimum ratio</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">
                    WCAG 2.1 Success Criterion 1.4.6 (Level AAA):
                  </p>
                  <ul className="list-disc list-inside pl-1">
                    <li>Normal text (less than 18pt): 7:1 minimum ratio</li>
                    <li>
                      Large text (18pt+ or 14pt+ bold): 4.5:1 minimum ratio
                    </li>
                  </ul>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="mt-2 pl-1">
        {textSize === "normal" ? (
          // Normal text compliance
          <>
            {isAAACompliant ? (
              <p className="text-green-700">
                ✓ Passes WCAG AAA (highest level)
              </p>
            ) : isAACompliant ? (
              <p className="text-green-700">✓ Passes WCAG AA</p>
            ) : (
              <p className="text-red-600">
                ✗ Fails WCAG requirements for normal text
              </p>
            )}
          </>
        ) : (
          // Large text compliance
          <>
            {isAAACompliant ? (
              <p className="text-green-700">
                ✓ Passes WCAG AAA (highest level)
              </p>
            ) : isAACompliant ? (
              <p className="text-green-700">✓ Passes WCAG AA</p>
            ) : (
              <p className="text-red-600">
                ✗ Fails WCAG requirements for large text
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={`px-4 py-3 rounded text-center font-medium cursor-pointer ${className}`}
          style={{
            color: textColor,
            backgroundColor: backgroundColor,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {sampleText}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Edit Colors</h4>

          <Tabs defaultValue="text">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text Color</TabsTrigger>
              <TabsTrigger value="background">Background Color</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor="textColorInput">Hex Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="textColorInput"
                      value={currentTextColor}
                      onChange={(e) => setCurrentTextColor(e.target.value)}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleEyeDropper("text")}
                      title="Pick color from screen"
                    >
                      <Pipette className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <Label htmlFor="textColorPicker">Color Picker</Label>
                <div className="mt-1">
                  <input
                    type="color"
                    id="textColorPicker"
                    value={currentTextColor}
                    onChange={(e) => setCurrentTextColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="background" className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor="bgColorInput">Hex Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bgColorInput"
                      value={currentBgColor}
                      onChange={(e) => setCurrentBgColor(e.target.value)}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleEyeDropper("background")}
                      title="Pick color from screen"
                    >
                      <Pipette className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <Label htmlFor="bgColorPicker">Color Picker</Label>
                <div className="mt-1">
                  <input
                    type="color"
                    id="bgColorPicker"
                    value={currentBgColor}
                    onChange={(e) => setCurrentBgColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          {wcagComplianceSection}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
