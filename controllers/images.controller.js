const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const { generateImage, createLineArtFromExisting } = require('../services/imageGeneration.service');

/**
 * Generate new image
 * POST /api/images/generate
 */
async function generateNewImage(req, res, next) {
  try {
    const { prompt, metadata, isLineArt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log('📨 Generate image request:', { prompt, metadata, isLineArt });
    
    // Parse metadata if it's a string
    let parsedMetadata = metadata;
    if (typeof metadata === 'string') {
      parsedMetadata = JSON.parse(metadata);
    }
    
    // Generate image
    const result = await generateImage(prompt, parsedMetadata?.variables, isLineArt);
    
    // Add line art info to metadata
    if (isLineArt) {
      parsedMetadata = {
        ...parsedMetadata,
        isLineArt: true
      };
    }
    
    // Save to database
    const image = await prisma.generatedImage.create({
      data: {
        prompt: prompt,
        filePath: result.filePath,
        status: 'PENDING',
        metadata: JSON.stringify(parsedMetadata || {}),
        subjectId: parsedMetadata?.subjectId ? parseInt(parsedMetadata.subjectId) : null
      },
      include: {
        subject: true
      }
    });
    
    console.log('✅ Image generated and saved:', image.id);
    
    res.status(201).json({
      success: true,
      data: {
        ...image,
        metadata: JSON.parse(image.metadata || '{}'),
        mockMode: result.mockMode,
        provider: result.provider
      }
    });
  } catch (error) {
    console.error('Generate image error:', error);
    next(error);
  }
}

/**
 * Convert existing image to line art
 * POST /api/images/:id/convert-to-lineart
 */
async function convertToLineArt(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get original image
    const originalImage = await prisma.generatedImage.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!originalImage) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Convert to line art
    const result = await createLineArtFromExisting(originalImage.filePath);
    
    // Parse existing metadata
    const existingMetadata = JSON.parse(originalImage.metadata || '{}');
    const newMetadata = {
      ...existingMetadata,
      isLineArt: true,
      originalImageId: originalImage.id
    };
    
    // Save new image entry
    const newImage = await prisma.generatedImage.create({
      data: {
        prompt: originalImage.prompt,
        filePath: result.filePath,
        status: 'PENDING',
        metadata: JSON.stringify(newMetadata),
        subjectId: originalImage.subjectId
      },
      include: {
        subject: true
      }
    });
    
    console.log('✅ Converted to line art:', newImage.id);
    
    res.status(201).json({
      success: true,
      data: {
        ...newImage,
        metadata: newMetadata
      }
    });
    
  } catch (error) {
    console.error('Convert to line art error:', error);
    next(error);
  }
}

/**
 * Get images with optional status filter
 * GET /api/images?status=PENDING|APPROVED|REJECTED
 */
async function getImages(req, res, next) {
  try {
    const { status } = req.query;
    
    const where = {};
    if (status) {
      where.status = status;
    }
    
    const images = await prisma.generatedImage.findMany({
      where,
      include: {
        subject: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Parse metadata JSON
    const imagesWithParsedMetadata = images.map(img => ({
      ...img,
      metadata: JSON.parse(img.metadata || '{}')
    }));
    
    res.json({
      success: true,
      data: imagesWithParsedMetadata,
      count: imagesWithParsedMetadata.length
    });
  } catch (error) {
    console.error('Get images error:', error);
    next(error);
  }
}

/**
 * Get single image by ID
 * GET /api/images/:id
 */
async function getImageById(req, res, next) {
  try {
    const { id } = req.params;
    
    const image = await prisma.generatedImage.findUnique({
      where: { id: parseInt(id) },
      include: {
        subject: true
      }
    });
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json({
      success: true,
      data: {
        ...image,
        metadata: JSON.parse(image.metadata || '{}')
      }
    });
  } catch (error) {
    console.error('Get image error:', error);
    next(error);
  }
}

/**
 * Approve image
 * PATCH /api/images/:id/approve
 */
async function approveImage(req, res, next) {
  try {
    const { id } = req.params;
    
    const image = await prisma.generatedImage.update({
      where: { id: parseInt(id) },
      data: { status: 'APPROVED' },
      include: {
        subject: true
      }
    });
    
    console.log('✅ Image approved:', image.id);
    
    res.json({
      success: true,
      data: {
        ...image,
        metadata: JSON.parse(image.metadata || '{}')
      }
    });
  } catch (error) {
    console.error('Approve image error:', error);
    next(error);
  }
}

/**
 * Reject and delete image
 * DELETE /api/images/:id/reject
 */
async function rejectImage(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get image first
    const image = await prisma.generatedImage.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete file from filesystem
    const filePath = path.join(process.cwd(), image.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ File deleted:', image.filePath);
    }
    
    // Delete from database
    await prisma.generatedImage.delete({
      where: { id: parseInt(id) }
    });
    
    console.log('✅ Image rejected and deleted:', id);
    
    res.json({
      success: true,
      message: 'Image rejected and deleted'
    });
  } catch (error) {
    console.error('Reject image error:', error);
    next(error);
  }
}

module.exports = {
  generateNewImage,
  convertToLineArt,
  getImages,
  getImageById,
  approveImage,
  rejectImage
};
