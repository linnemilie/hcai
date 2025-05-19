export interface TextBlock {
  text_color: string;
  background_color: string;
}

export interface InputData {
  text_blocks: TextBlock[];
}

export interface ContrastResult {
  text_color: string;
  background_color: string;
  contrast_ratio: number;
}

export function calculateContrast(jsonData: InputData): ContrastResult[] {
  // Helper function to convert a hex color to its relative luminance
  function relativeLuminance(color: string): number {
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      return { r, g, b };
    };

    const rgb = hexToRgb(color);
    const toLinear = (c: number) => {
      const sc = c / 255;
      return sc <= 0.03928 ? sc / 12.92 : Math.pow((sc + 0.055) / 1.055, 2.4);
    };

    const R = toLinear(rgb.r);
    const G = toLinear(rgb.g);
    const B = toLinear(rgb.b);

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  // Helper function to calculate the contrast ratio
  function contrastRatio(L1: number, L2: number): number {
    if (L1 > L2) {
      return (L1 + 0.05) / (L2 + 0.05);
    } else {
      return (L2 + 0.05) / (L1 + 0.05);
    }
  }

  const textBlocks = jsonData.text_blocks;

  const results: ContrastResult[] = [];

  for (const block of textBlocks) {
    const textColor = block.text_color;
    const backgroundColor = block.background_color;

    // Calculate relative luminance for both colors
    const L1 = relativeLuminance(textColor);
    const L2 = relativeLuminance(backgroundColor);

    // Calculate the contrast ratio
    const contrast = contrastRatio(L1, L2);

    results.push({
      text_color: textColor,
      background_color: backgroundColor,
      contrast_ratio: contrast,
    });
  }

  return results;
}
