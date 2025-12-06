import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// User Registration (Student/Teacher)
router.post('/register', async (req, res) => {
  const { id, username, password, email, role } = req.body as {
    id?: string;
    username?: string;
    password?: string;
    email?: string;
    role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  };

  if (!id || !username || !password || !email) {
    return res.status(400).json({ message: 'Id, username, password, and email are required' });
  }

  if (role === 'ADMIN') {
    return res.status(403).json({ message: 'Admin registration is not allowed' });
  }

  const userRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { username }, { email }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        id,
        username,
        fullName: userRole === 'TEACHER' ? username : undefined,
        password: hashedPassword,
        email,
        role: userRole,
      },
    });

    res.status(201).json({ message: 'User created successfully', userId: user.id, role: userRole });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { id: username } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { username } });
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
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
