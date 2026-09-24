import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const uniAppSchema = z.object({
  universityId: z.string().uuid(),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string()
  })).optional(),
});

const bursaryAppSchema = z.object({
  bursaryId: z.string().uuid(),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string()
  })).min(1, "At least one document is required"),
});

// --- University Endpoints ---

router.get('/universities', async (req, res) => {
  try {
    const universities = await prisma.university.findMany({
      include: { requirements: true }
    });
    res.json(universities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch universities' });
  }
});

router.get('/universities/:id', async (req, res) => {
  try {
    const university = await prisma.university.findUnique({
      where: { id: req.params.id },
      include: { requirements: true }
    });
    if (!university) return res.status(404).json({ error: 'University not found' });
    res.json(university);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch university details' });
  }
});

// --- Bursary Endpoints ---

router.get('/bursaries', async (req, res) => {
  try {
    const bursaries = await prisma.bursary.findMany();
    res.json(bursaries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bursaries' });
  }
});

router.get('/bursaries/:id', async (req, res) => {
  try {
    const bursary = await prisma.bursary.findUnique({
      where: { id: req.params.id }
    });
    if (!bursary) return res.status(404).json({ error: 'Bursary not found' });
    res.json(bursary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bursary details' });
  }
});

// --- Application Submissions ---

router.post('/applications/uni', requireAuth, async (req: any, res) => {
  try {
    const data = uniAppSchema.parse(req.body);
    const application = await prisma.application.create({
      data: {
        userId: req.user.id,
        type: 'UNIVERSITY',
        universityId: data.universityId,
        documents: data.documents || [],
        status: 'PENDING'
      }
    });
    res.status(201).json(application);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'University application failed' });
  }
});

router.post('/applications/bursary', requireAuth, async (req: any, res) => {
  try {
    const data = bursaryAppSchema.parse(req.body);
    const application = await prisma.application.create({
      data: {
        userId: req.user.id,
        type: 'BURSARY',
        bursaryId: data.bursaryId,
        documents: data.documents,
        status: 'PENDING'
      }
    });
    res.status(201).json(application);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Bursary application failed' });
  }
});

router.get('/applications/me', requireAuth, async (req: any, res) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.user.id },
      include: { university: true, bursary: true },
      orderBy: { submittedAt: 'desc' }
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your applications' });
  }
});

export default router;
