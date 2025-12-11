import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import { incrWithTTL } from '../cache';

const router = Router();
const RATE_LIMIT_WINDOW = 10 * 60;
const RATE_LIMIT_MAX = 10;

// User Registration (Student/Teacher)
router.post('/register', async (req, res) => {
  const { id, username, password, email, role } = req.body as {
    id?: string;
    username?: string;
    password?: string;
    email?: string;
    role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  };

  const idTrim = String(id || '').trim()
  if (!idTrim || !username || !password || !email) {
    return res.status(400).json({ message: 'Id, username, password, and email are required' });
  }

  const uname = String(username).trim();
  const emailStr = String(email).trim();
  const passStr = String(password);
  if (!/^[A-Za-z0-9_\-\.]{3,64}$/.test(uname)) {
    return res.status(400).json({ message: 'Invalid username' });
  }
  if (!/^[A-Za-z0-9_\-]{3,64}$/.test(idTrim)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailStr)) {
    return res.status(400).json({ message: 'Invalid email' });
  }
  if (passStr.length < 8 || !/[A-Za-z]/.test(passStr) || !/[0-9]/.test(passStr)) {
    return res.status(400).json({ message: 'Weak password' });
  }

  if (role === 'ADMIN') {
    return res.status(403).json({ message: 'Admin registration is not allowed' });
  }

  const userRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';

  try {
    console.log('register', JSON.stringify({ id, username, email, role }))
    const ors: any[] = [{ username }, { email }]
    if (id) ors.push({ id })
    const existingUser = await prisma.user.findFirst({ where: { OR: ors } })

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(passStr, 12);

    const data = {
      id: idTrim,
      username: uname,
      fullName: userRole === 'TEACHER' ? username : undefined,
      password: hashedPassword,
      email: emailStr,
      role: userRole,
    }
    console.log('register.data', JSON.stringify(data))
    try { fs.appendFileSync('register.log', `[REQ] ${new Date().toISOString()} ${JSON.stringify({ body: { id, username, email, role }, data })}\n`) } catch {}
    const user = await prisma.user.create({ data })
    try { fs.appendFileSync('register.log', `[OK ] ${new Date().toISOString()} ${JSON.stringify({ userId: user.id })}\n`) } catch {}

    res.status(201).json({ message: 'User created successfully', userId: user.id, role: userRole });
  } catch (error: any) {
    try { fs.appendFileSync('register.log', `[ERR] ${new Date().toISOString()} ${JSON.stringify({ code: error?.code, meta: error?.meta, message: error?.message })}\n`) } catch {}
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'User already exists', target: error?.meta?.target });
    }
    if (error?.code === 'P2011') {
      return res.status(400).json({ message: 'Invalid id', id: idTrim });
    }
    res.status(500).json({ message: 'Error creating user', error, id: idTrim });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const key = `login:${ip}:${String(username).trim()}`;
    const count = await incrWithTTL(key, RATE_LIMIT_WINDOW);
    if (count > RATE_LIMIT_MAX) {
      return res.status(429).json({ message: 'Too many attempts' });
    }
    const account = String(username).trim();
    const user = await prisma.user.findFirst({ where: { OR: [{ username: account }, { id: account }, { email: account }] } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch {
      valid = false;
    }
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload | string;
    const payload = typeof decoded === 'string' ? {} : decoded;
    const sub = typeof payload.sub === 'string' ? payload.sub : String(payload.sub || '');
    if (!sub) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, username: true, fullName: true, role: true, email: true, avatar: true, title: true },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update username (students only)
router.patch('/username', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).userId as string
    const { username } = req.body as { username?: string }
    if (!username || !username.trim()) return res.status(400).json({ message: 'Username required' })
    const user = await prisma.user.findUnique({ where: { id: uid } })
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.role !== 'STUDENT') return res.status(403).json({ message: 'Only students can update username' })
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists && exists.id !== uid) return res.status(400).json({ message: 'Username already exists' })
    const updated = await prisma.user.update({ where: { id: uid }, data: { username } })
    res.json({ user: { id: updated.id, username: updated.username, role: updated.role, email: updated.email, avatar: updated.avatar, title: updated.title } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router;
