import { generateImageFromPrompt } from './imageGeneration';

function buildMaterialPrompt(materialName) {
  return `A seamless, tileable, high-resolution top-down flat-lay photo texture swatch of "${materialName}" interior finish material, evenly lit, no shadows, no watermark, no text, no border, fills the entire frame edge to edge, realistic repeating material sample photograph.`;
}

// Reuses the same same-origin -> Cloudflare Worker -> direct Google API
// fallback chain as product-icon generation (imageGeneration.js), just with
// a texture-oriented prompt instead of a catalog-icon one.
export async function generateMaterialImage(materialName) {
  return generateImageFromPrompt(buildMaterialPrompt(materialName));
}
