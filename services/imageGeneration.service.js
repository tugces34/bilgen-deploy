const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { InferenceClient } = require('@huggingface/inference');
const { GoogleGenAI } = require("@google/genai");

// Configuration
const USE_MOCK = process.env.USE_MOCK === 'true'; // Legacy support
// Options: 'mock', 'huggingface', 'google'
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER || (USE_MOCK ? 'mock' : 'huggingface');

const HF_API_KEY = process.env.HF_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/images';

/**
 * Parse template variables and replace with actual values
 * Example: "{{sınıf}}. sınıf {{konu}}" -> "3. sınıf Toplama"
 */
function parseTemplate(templateText, variables) {
  let result = templateText;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Generate image using mock service (placeholder)
 */
async function generateMockImage(prompt) {
  try {
    console.log('🎨 Generating MOCK image for prompt:', prompt);
    
    // Use picsum.photos for random placeholder images
    const width = 512;
    const height = 512;
    const randomSeed = Math.floor(Math.random() * 1000);
    const imageUrl = `https://picsum.photos/seed/${randomSeed}/${width}/${height}`;
    
    // Download the image
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer'
    });
    
    // Save to file system
    const filename = `${uuidv4()}.jpg`;
    const uploadPath = path.join(process.cwd(), UPLOAD_DIR);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    const filePath = path.join(uploadPath, filename);
    fs.writeFileSync(filePath, response.data);
    
    console.log('✅ Mock image saved:', filename);
    
    return {
      success: true,
      filePath: `${UPLOAD_DIR}/${filename}`,
      filename: filename,
      mockMode: true,
      provider: 'mock'
    };
  } catch (error) {
    console.error('❌ Mock image generation error:', error.message);
    throw new Error('Mock image generation failed');
  }
}

/**
 * Generate image using Hugging Face API (Stable Diffusion)
 */
async function generateHuggingFaceImage(prompt) {
  try {
    console.log('🎨 Generating REAL image via Hugging Face:', prompt);
    
    if (!HF_API_KEY || HF_API_KEY === 'your_huggingface_api_key_here') {
      throw new Error('Hugging Face API key not configured');
    }
    
    // Initialize HfInference client
    const hf = new InferenceClient(HF_API_KEY);
    
    // Generate image using textToImage
    const result = await hf.textToImage({
      provider: "zai-org",
      model: "zai-org/GLM-Image",
      inputs: prompt,
      parameters: { num_inference_steps: 5 },
    });
    
    // Convert result to buffer
    const buffer = Buffer.from(await result.arrayBuffer());
    
    // Save to file system
    const filename = `${uuidv4()}.png`;
    const uploadPath = path.join(process.cwd(), UPLOAD_DIR);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    const filePath = path.join(uploadPath, filename);
    fs.writeFileSync(filePath, buffer);
    
    console.log('✅ HuggingFace image saved:', filename);
    
    return {
      success: true,
      filePath: `${UPLOAD_DIR}/${filename}`,
      filename: filename,
      mockMode: false,
      provider: 'huggingface'
    };
  } catch (error) {
    console.error('❌ HuggingFace image generation error:', error.message);
    throw new Error('HuggingFace image generation failed: ' + error.message);
  }
}

/**
 * Generate image using Google Generative AI (Gemini 2.5 Flash Image)
 */
async function generateGoogleImage(prompt) {
  try {
    console.log('🎨 Generating REAL image via Google Gen AI (Gemini):', prompt);
    
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }

    // Initialize GoogleGenAI
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
    
    // Generate Content using gemini-2.5-flash-image
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    let buffer = null;

    // Parse response to find image data
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const imageData = part.inlineData.data;
            buffer = Buffer.from(imageData, "base64");
            break; // Found the image, stop searching
          }
        }
      }
    }

    if (!buffer) {
      console.error('Google API Response:', JSON.stringify(response, null, 2));
      throw new Error('No image data found in Google API response');
    }
    
    // Save to file system
    const filename = `${uuidv4()}.png`;
    const uploadPath = path.join(process.cwd(), UPLOAD_DIR);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    const filePath = path.join(uploadPath, filename);
    fs.writeFileSync(filePath, buffer);
    
    console.log('✅ Google Gen AI image saved:', filename);
    
    return {
      success: true,
      filePath: `${UPLOAD_DIR}/${filename}`,
      filename: filename,
      mockMode: false,
      provider: 'google'
    };
  } catch (error) {
    console.error('❌ Google image generation error:', error.message);
    if (error.response) {
        console.error('API Response:', JSON.stringify(error.response, null, 2));
    }
    throw new Error('Google image generation failed: ' + error.message);
  }
}

/**
 * Main image generation function
 */
async function generateImage(prompt, templateVariables = null) {
  let finalPrompt = prompt;
  
  // If template variables provided, parse the template
  if (templateVariables) {
    finalPrompt = parseTemplate(prompt, templateVariables);
  }
  
  console.log('📝 Final prompt:', finalPrompt);
  console.log('⚙️ Provider:', IMAGE_PROVIDER);
  
  switch (IMAGE_PROVIDER.toLowerCase()) {
    case 'google':
      return await generateGoogleImage(finalPrompt);
    case 'huggingface':
      return await generateHuggingFaceImage(finalPrompt);
    case 'mock':
    default:
      return await generateMockImage(finalPrompt);
  }
}

// Placeholder for missing function to prevent crashes if called
async function createLineArtFromExisting(filePath) {
    console.warn('⚠️ createLineArtFromExisting is not implemented yet.');
    return { filePath, success: false };
}

module.exports = {
  generateImage,
  parseTemplate,
  createLineArtFromExisting
};
