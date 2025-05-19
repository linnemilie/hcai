"use client";

import { useState } from "react";
import ImageAnalyzer from "./api/analyze/components/imageAnalyzer";
import ColorSamplesContainer from "./api/analyze/components/ColorSample";

export default function Home() {
  // Shared state to be passed between components
  const [results, setResults] = useState<any[]>([]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#F2EFE9] p-4 pt-8">
      <div className="w-full flex flex-col lg:flex-row gap-6 xl:p-8">
        {/* Left side - Image Analyzer */}
        <div className="w-full lg:w-2/3">
          <ImageAnalyzer onResultsChange={setResults} />
        </div>

        {/* Right side - Color Samples */}
        <div className="w-full lg:w-1/3">
          <ColorSamplesContainer results={results} />
        </div>
      </div>
    </div>
  );
}
