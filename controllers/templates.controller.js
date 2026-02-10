const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all prompt templates
 * GET /api/templates
 */
async function getTemplates(req, res, next) {
  try {
    const templates = await prisma.promptTemplate.findMany({
      include: {
        subject: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Parse variables JSON
    const templatesWithParsedVars = templates.map(t => ({
      ...t,
      variables: JSON.parse(t.variables || '[]')
    }));
    
    res.json({
      success: true,
      data: templatesWithParsedVars
    });
  } catch (error) {
    console.error('Get templates error:', error);
    next(error);
  }
}

/**
 * Create new prompt template
 * POST /api/templates
 */
async function createTemplate(req, res, next) {
  try {
    const { templateText, variables, description, subjectId } = req.body;
    
    if (!templateText) {
      return res.status(400).json({ error: 'Template text is required' });
    }
    
    const template = await prisma.promptTemplate.create({
      data: {
        templateText,
        variables: JSON.stringify(variables || []),
        description,
        subjectId: subjectId || null
      },
      include: {
        subject: true
      }
    });
    
    console.log('✅ Template created:', template.id);
    
    res.status(201).json({
      success: true,
      data: {
        ...template,
        variables: JSON.parse(template.variables || '[]')
      }
    });
  } catch (error) {
    console.error('Create template error:', error);
    next(error);
  }
}

/**
 * Update prompt template
 * PUT /api/templates/:id
 */
async function updateTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { templateText, variables, description, subjectId } = req.body;
    
    if (!templateText) {
      return res.status(400).json({ error: 'Template text is required' });
    }
    
    const template = await prisma.promptTemplate.update({
      where: { id: parseInt(id) },
      data: {
        templateText,
        variables: JSON.stringify(variables || []),
        description,
        subjectId: subjectId || null
      },
      include: {
        subject: true
      }
    });
    
    console.log('✅ Template updated:', template.id);
    
    res.json({
      success: true,
      data: {
        ...template,
        variables: JSON.parse(template.variables || '[]')
      }
    });
  } catch (error) {
    console.error('Update template error:', error);
    next(error);
  }
}

/**
 * Delete template
 * DELETE /api/templates/:id
 */
async function deleteTemplate(req, res, next) {
  try {
    const { id } = req.params;
    
    await prisma.promptTemplate.delete({
      where: { id: parseInt(id) }
    });
    
    console.log('✅ Template deleted:', id);
    
    res.json({
      success: true,
      message: 'Template deleted'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    next(error);
  }
}

module.exports = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
