const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all subjects with optional filtering
 * GET /api/subjects?grade=3&name=Matematik
 */
async function getSubjects(req, res, next) {
  try {
    const { grade, name } = req.query;

    const whereClause = {};
    if (grade) {
      whereClause.grade = parseInt(grade);
    }
    if (name) {
      whereClause.name = name;
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      orderBy: [
        { grade: 'asc' },
        { name: 'asc' },
        { unit: 'asc' }
      ]
    });
    
    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    next(error);
  }
}

/**
 * Get distinct subject names (Ders isimleri)
 * GET /api/subjects/names
 */
async function getSubjectNames(req, res, next) {
  try {
    const subjects = await prisma.subject.findMany({
      distinct: ['name'],
      select: {
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    const names = subjects.map(s => s.name);

    res.json({
      success: true,
      data: names
    });
  } catch (error) {
    console.error('Get subject names error:', error);
    next(error);
  }
}

/**
 * Get units by grade and subject name
 * GET /api/subjects/units?grade=5&name=Matematik
 */
async function getUnits(req, res, next) {
  try {
    const { grade, name } = req.query;

    if (!grade || !name) {
      return res.status(400).json({
        success: false,
        error: 'Grade and name parameters are required'
      });
    }

    const subjects = await prisma.subject.findMany({
      where: {
        grade: parseInt(grade),
        name: name
      },
      distinct: ['unit'],
      select: {
        unit: true
      },
      orderBy: {
        unit: 'asc'
      }
    });

    const units = subjects.map(s => s.unit).filter(unit => unit !== null);

    res.json({
      success: true,
      data: units
    });
  } catch (error) {
    console.error('Get units error:', error);
    next(error);
  }
}

/**
 * Get topics by grade, subject name, and unit
 * GET /api/subjects/topics?grade=5&name=Matematik&unit=1. Ünite: Sayılar
 */
async function getTopics(req, res, next) {
  try {
    const { grade, name, unit } = req.query;

    if (!grade || !name || !unit) {
      return res.status(400).json({
        success: false,
        error: 'Grade, name, and unit parameters are required'
      });
    }

    const subjects = await prisma.subject.findMany({
      where: {
        grade: parseInt(grade),
        name: name,
        unit: unit
      },
      distinct: ['topic'],
      select: {
        topic: true
      },
      orderBy: {
        topic: 'asc'
      }
    });

    const topics = subjects.map(s => s.topic).filter(topic => topic !== null);

    res.json({
      success: true,
      data: topics
    });
  } catch (error) {
    console.error('Get topics error:', error);
    next(error);
  }
}

/**
 * Get grades where a subject exists
 * GET /api/subjects/grades?name=Matematik
 */
async function getGradesBySubject(req, res, next) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Subject name is required'
      });
    }

    const subjects = await prisma.subject.findMany({
      where: {
        name: name
      },
      distinct: ['grade'],
      select: {
        grade: true
      },
      orderBy: {
        grade: 'asc'
      }
    });

    const grades = subjects.map(s => s.grade).filter(grade => grade !== null);

    res.json({
      success: true,
      data: grades
    });
  } catch (error) {
    console.error('Get grades by subject error:', error);
    next(error);
  }
}

/**
 * Create new subject
 * POST /api/subjects
 */
async function createSubject(req, res, next) {
  try {
    const { name, grade, unit, topic, outcome } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }
    
    if (grade && (grade < 1 || grade > 8)) {
      return res.status(400).json({
        success: false,
        error: 'Grade must be between 1 and 8'
      });
    }
    
    const subject = await prisma.subject.create({
      data: {
        name,
        grade: grade ? parseInt(grade) : null,
        unit,
        topic,
        outcome
      }
    });
    
    console.log('✅ Subject created:', subject.id);
    
    res.status(201).json({
      success: true,
      data: subject
    });
  } catch (error) {
    console.error('Create subject error:', error);
    next(error);
  }
}

module.exports = {
  getSubjects,
  getSubjectNames,
  getUnits,
  getTopics,
  getGradesBySubject,
  createSubject
};
