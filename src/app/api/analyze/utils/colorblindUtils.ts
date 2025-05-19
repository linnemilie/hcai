/**
 * Utility functions for colorblindness simulation
 * Uses the Machado et al. (2009) method for accurate simulation
 */

// Constants: Transformation matrices
// const RGB_TO_LMS = [
//   [17.8824, 43.5161, 4.11935],
//   [3.45565, 27.1554, 3.86714],
//   [0.0299566, 0.184309, 1.46709],
// ];

// const LMS_TO_RGB = [
//   [0.080944, -0.130504, 0.116721],
//   [-0.0102485, 0.0540194, -0.113615],
//   [-0.000365294, -0.00412163, 0.693513],
// ];

// Converts hex to RGB [0-255]
export const hexToRgb = (hex: string): number[] => {
  hex = hex.replace("#", "");
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
};

// Converts RGB [0-255] to hex
export const rgbToHex = (rgb: number[]): string => {
  return (
    "#" +
    rgb
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
};

// Applies a 3x3 matrix to a vector
export const applyMatrix = (matrix: number[][], vector: number[]): number[] => {
  return matrix.map((row) =>
    row.reduce((sum, value, i) => sum + value * vector[i], 0)
  );
};

// Clamp RGB values to 0-255 range
export const clampRgb = (rgb: number[]): number[] =>
  rgb.map((v) => Math.min(Math.max(Math.round(v), 0), 255));

// Gamma correction (sRGB gamma space)
export const gammaCorrect = (rgb: number[], inverse = false): number[] => {
  if (inverse) {
    // sRGB to linear RGB
    return rgb.map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
  } else {
    // Linear RGB to sRGB
    return rgb
      .map((v) => {
        return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
      })
      .map((v) => v * 255);
  }
};

// Type for colorblind types
export type ColorblindType =
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia"
  | "colors";

// Simulation matrices for different types of colorblindness
const COLORBLIND_MATRICES = {
  protanopia: [
    // Most severe red-green colorblindness
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    // Another type of red-green colorblindness
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    // Blue-yellow colorblindness
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.491367, 0.5039],
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
};

/**
 * Accurate colorblind simulation based on Machado et al. (2009)
 * @param hexColor The hex color to simulate
 * @param type The type of colorblindness to simulate (protanopia, deuteranopia, or tritanopia)
 * @returns The simulated color in hex format
 */
export const simulateColorblindness = (
  hexColor: string,
  type: ColorblindType = "protanopia"
): string => {
  // If normal vision is selected, return the original color
  if (type === "colors") {
    return hexColor;
  }

  // Convert hex to RGB [0-255]
  const rgb = hexToRgb(hexColor);

  // Convert to linear RGB space (remove gamma correction)
  const linear = rgb.map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

  // Apply the appropriate simulation matrix
  const matrix = COLORBLIND_MATRICES[type as keyof typeof COLORBLIND_MATRICES];
  const simulated = [
    linear[0] * matrix[0][0] +
      linear[1] * matrix[0][1] +
      linear[2] * matrix[0][2],
    linear[0] * matrix[1][0] +
      linear[1] * matrix[1][1] +
      linear[2] * matrix[1][2],
    linear[0] * matrix[2][0] +
      linear[1] * matrix[2][1] +
      linear[2] * matrix[2][2],
  ];

  // Convert back to sRGB space (apply gamma correction)
  const corrected = simulated.map((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  });

  // Convert to 0-255 range and to hex
  const rgbResult = corrected.map((v) => Math.round(v * 255));
  return rgbToHex(rgbResult);
};
