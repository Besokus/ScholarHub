import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import { incrWithTTL, cacheGet, cacheSet, cacheDel } from '../cache';
import { sendMail, buildCodeTemplate } from '../mail';

const router = Router();
const RATE_LIMIT_WINDOW = 10 * 60;
const RATE_LIMIT_MAX = 10;
const RESET_CODE_TTL_SEC = 5 * 60;
const RESET_FAIL_LOCK_SEC = 60 * 60;

export function isValidUsername(input: string): boolean {
  const name = String(input || '').trim()
  return /^[\u4e00-\u9fa5A-Za-z0-9_.-]{2,20}$/.test(name)
}

function genCode(): string {
  const n = Math.floor(Math.random() * 1000000);
  return String(n).padStart(6, '0');
}

function logReset(entry: any) {
  try { fs.appendFileSync('password_reset.log', `${new Date().toISOString()} ${JSON.stringify(entry)}\n`) } catch {}
}

async function sendResetMail(email: string, code: string) {
  const tpl = buildCodeTemplate(email, code)
  await sendMail({ to: email, subject: tpl.subject, text: tpl.text, html: tpl.html })
}

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
  if (!isValidUsername(uname)) {
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
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT uploads, downloads FROM "User" WHERE id = $1`, sub)
      const stats = rows && rows[0] ? rows[0] : { uploads: 0, downloads: 0 }
      res.json({ user: { ...user, uploads: stats.uploads ?? 0, downloads: stats.downloads ?? 0 } })
    } catch {
      res.json({ user })
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.get('/session', requireAuth, async (req, res) => {
  const uid = (req as any).userId as string
  const role = (req as any).userRole as string | undefined
  const anyReq = req as any
  const exp = typeof anyReq.sessionExp === 'number' ? anyReq.sessionExp : null
  res.json({ valid: true, userId: uid, role, expiresAt: exp })
})

// Update username (students only)
router.patch('/username', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).userId as string
    const { username } = req.body as { username?: string }
    const uname = String(username || '').trim()
    if (!uname) return res.status(400).json({ message: 'Username required' })
    if (!isValidUsername(uname)) return res.status(400).json({ message: 'Invalid username' })
    const user = await prisma.user.findUnique({ where: { id: uid } })
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.role !== 'STUDENT') return res.status(403).json({ message: 'Only students can update username' })
    const exists = await prisma.user.findUnique({ where: { username: uname } })
    if (exists && exists.id !== uid) return res.status(400).json({ message: 'Username already exists' })
    const updated = await prisma.user.update({ where: { id: uid }, data: { username: uname } })
    res.json({ user: { id: updated.id, username: updated.username, role: updated.role, email: updated.email, avatar: updated.avatar, title: updated.title } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// Username unique check
router.get('/username/check', async (req, res) => {
  try {
    const u = String(req.query.u || '').trim()
    if (!u) return res.json({ exists: false })
    const found = await prisma.user.findUnique({ where: { username: u } })
    res.json({ exists: !!found })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router;
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).userId as string
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT uploads, downloads FROM "User" WHERE id = $1`, uid)
    const stats = rows && rows[0] ? rows[0] : { uploads: 0, downloads: 0 }
    res.json(stats)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})
// Request password reset code
router.post('/reset-password', async (req, res) => {
  const { email } = req.body as { email?: string }
  const em = String(email || '').trim()
  if (!em) return res.status(400).json({ message: 'Email required' })
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(em)) return res.status(400).json({ message: 'Invalid email' })
  try {
    const user = await prisma.user.findUnique({ where: { email: em } })
    if (!user) {
      logReset({ phase: 'request', email: em, ok: false, reason: 'not_found' })
      return res.status(404).json({ message: '注册邮箱不存在' })
    }
    const code = genCode()
    await cacheSet(`pwd:code:${em}`, JSON.stringify({ code, ts: Date.now() }), RESET_CODE_TTL_SEC)
    await cacheDel(`pwd:fail:${em}`)
    await sendResetMail(em, code)
    logReset({ phase: 'request', email: em, ok: true })
    res.json({ message: '验证码已发送至您的邮箱' })
  } catch (err: any) {
    logReset({ phase: 'request', email: em, ok: false, error: err?.message })
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})

// Confirm password reset with code
router.post('/reset-password/confirm', async (req, res) => {
  const { email, code, newPassword } = req.body as { email?: string; code?: string; newPassword?: string }
  const em = String(email || '').trim()
  const cd = String(code || '').trim()
  const np = String(newPassword || '')
  if (!em || !cd || !np) return res.status(400).json({ message: 'Params required' })
  if (!/^\d{6}$/.test(cd)) return res.status(400).json({ message: '验证码错误或已过期' })
  try {
    const lock = await cacheGet(`pwd:lock:${em}`)
    if (lock) {
      logReset({ phase: 'confirm', email: em, ok: false, reason: 'locked' })
      return res.status(429).json({ message: '尝试过多，邮箱已锁定，请稍后再试' })
    }
    const cached = await cacheGet(`pwd:code:${em}`)
    if (!cached) {
      await incrFail(em)
      logReset({ phase: 'confirm', email: em, ok: false, reason: 'code_missing' })
      return res.status(400).json({ message: '验证码错误或已过期' })
    }
    let parsed: any = null
    try { parsed = JSON.parse(cached) } catch {}
    const valid = parsed && parsed.code === cd && (Date.now() - (parsed.ts || 0)) <= RESET_CODE_TTL_SEC * 1000
    if (!valid) {
      await incrFail(em)
      logReset({ phase: 'confirm', email: em, ok: false, reason: 'code_invalid' })
      return res.status(400).json({ message: '验证码错误或已过期' })
    }

    // Password strength: ≥8, contains upper, lower, digit
    const strong = np.length >= 8 && /[A-Z]/.test(np) && /[a-z]/.test(np) && /[0-9]/.test(np)
    if (!strong) return res.status(400).json({ message: '密码需至少8位，包含大小写字母和数字' })

    const user = await prisma.user.findUnique({ where: { email: em } })
    if (!user) return res.status(404).json({ message: 'User not found' })
    const hashed = await bcrypt.hash(np, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    await cacheDel(`pwd:code:${em}`)
    await cacheDel(`pwd:fail:${em}`)
    logReset({ phase: 'confirm', email: em, ok: true })
    res.json({ message: '密码修改成功' })
  } catch (err: any) {
    logReset({ phase: 'confirm', email: em, ok: false, error: err?.message })
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})

async function incrFail(email: string) {
  const n = await incrWithTTL(`pwd:fail:${email}`, RESET_FAIL_LOCK_SEC)
  if (n >= 3) await cacheSet(`pwd:lock:${email}`, '1', RESET_FAIL_LOCK_SEC)
}

// Email format + MX check
router.get('/email/check', requireAuth, async (req, res) => {
  try {
    const em = String(req.query.email || '').trim()
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(em)) return res.json({ valid: false, reason: '格式不合法' })
    try {
      const domain = em.split('@')[1]
      const dns = await import('dns')
      const p: any = (dns as any).promises
      const mx = await p.resolveMx(domain)
      return res.json({ valid: !!(mx && mx.length) })
    } catch {
      return res.json({ valid: false, reason: 'MX记录不可用' })
    }
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})

// Update password (self)
router.post('/password', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).userId as string
    const { newPassword } = (req.body || {}) as { newPassword?: string }
    const np = String(newPassword || '')
    if (!np) return res.status(400).json({ message: '新密码需填写' })
    const strong = (np.length >= 8 && /[A-Za-z]/.test(np) && /[0-9]/.test(np)) || (np.length > 12 && /[A-Z]/.test(np) && /[a-z]/.test(np) && /[0-9]/.test(np) && /[^A-Za-z0-9]/.test(np))
    if (!strong) return res.status(400).json({ message: '密码需至少8位且包含字母与数字（更强建议含大小写和特殊符号）' })
    const hashed = await bcrypt.hash(np, 12)
    await prisma.user.update({ where: { id: uid }, data: { password: hashed } })
    try { fs.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op:'password_update', user: uid })}\n`) } catch {}
    res.json({ message: '密码已更新' })
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})

// Update avatar (self)
router.post('/avatar', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).userId as string
    const { avatarUrl } = (req.body || {}) as { avatarUrl?: string }
    const url = String(avatarUrl || '').trim()
    if (!url) return res.status(400).json({ message: '头像地址需填写' })
    if (!/^\/uploads\//.test(url)) return res.status(400).json({ message: '非法头像地址' })
    const user = await prisma.user.findUnique({ where: { id: uid } })
    if (!user) return res.status(404).json({ message: 'User not found' })
    await prisma.user.update({ where: { id: uid }, data: { avatar: url } })
    try { fs.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op:'avatar_set', user: uid, url })}\n`) } catch {}
    res.json({ message: '头像已更新', avatar: url })
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})

// Start email change (send code to new email)
router.post('/email', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).userId as string
    const { email } = (req.body || {}) as { email?: string }
    const em = String(email || '').trim()
    if (!em) return res.status(400).json({ message: 'Email required' })
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(em)) return res.status(400).json({ message: 'Invalid email' })
    const exists = await prisma.user.findFirst({ where: { email: em } })
    if (exists) return res.status(400).json({ message: '该邮箱已被使用' })
    try {
      const domain = em.split('@')[1]
      const dns = await import('dns')
      const p: any = (dns as any).promises
      const mx = await p.resolveMx(domain)
      if (!mx || mx.length === 0) return res.status(400).json({ message: '邮箱域名无有效MX记录' })
    } catch {
      return res.status(400).json({ message: '邮箱域名验证失败' })
    }
    await prisma.user.update({ where: { id: uid }, data: { email: em } })
    try { fs.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op:'email_update', user: uid, email: em })}\n`) } catch {}
    res.json({ message: '邮箱已更新', email: em })
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})

// Confirm email change
router.post('/email/confirm', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).userId as string
    const { code } = (req.body || {}) as { code?: string }
    const cd = String(code || '').trim()
    if (!/^\d{6}$/.test(cd)) return res.status(400).json({ message: '验证码错误或已过期' })
    const cached = await cacheGet(`emailchg:${uid}`)
    if (!cached) return res.status(400).json({ message: '验证码错误或已过期' })
    let parsed: any = null
    try { parsed = JSON.parse(cached) } catch {}
    const valid = parsed && parsed.code === cd && (Date.now() - (parsed.ts || 0)) <= 600000
    if (!valid) return res.status(400).json({ message: '验证码错误或已过期' })
    const email = String(parsed.email || '').trim()
    if (!email) return res.status(400).json({ message: '邮箱信息缺失' })
    await prisma.user.update({ where: { id: uid }, data: { email } })
    await cacheDel(`emailchg:${uid}`)
    try { fs.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op:'email_update', user: uid, email })}\n`) } catch {}
    res.json({ message: '邮箱已更新', email })
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})
