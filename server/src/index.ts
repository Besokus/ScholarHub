import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import resourcesRouter from './routes/resources';
import qaRouter from './routes/qa';
import notificationsRouter from './routes/notifications';
import coursesRouter from './routes/courses';
import prisma from './db';
import { sendMail } from './mail';
import bcrypt from 'bcryptjs';
import path from 'path';
import uploadsRouter from './routes/uploads';
import { registerSwagger } from './swagger';
import answersRouter from './routes/answers';
import { authOptional } from './middleware/auth';
import fs from 'fs';
import { redis, cacheGet, cacheSet, incrWithTTL } from './cache';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const corsOptions = { origin: allowed.length ? allowed : true, credentials: true, optionsSuccessStatus: 204 }
app.use(cors(corsOptions));
app.use(express.json());
const uploadsPath = path.join(process.cwd(), 'uploads')
console.log('Serving uploads from:', uploadsPath)
app.use('/uploads', (req, res, next) => {
  try {
    const ref = String(req.headers.referer || '')
    const ok = !ref || (Array.isArray(allowed) && allowed.length ? allowed.some(o => ref.startsWith(o)) : true)
    if (!ok) return res.status(403).send('Forbidden')
  } catch {}
  next()
}, express.static(uploadsPath));
app.use(authOptional);
app.use((req, _res, next) => {
  try {
    const headers: any = { ...req.headers }
    if (headers.authorization) headers.authorization = 'Bearer ***'
    const body = { ...(req as any).body }
    if (body && body.password) body.password = '***'
    const entry = { t: new Date().toISOString(), m: req.method, u: req.url, h: headers, b: body };
    fs.appendFileSync('req.log', JSON.stringify(entry) + '\n');
  } catch {}
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/qa', qaRouter);
app.use('/api', answersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/uploads', uploadsRouter);
registerSwagger(app);

app.get('/', (req, res) => {
  res.send('Hello from ULEP Server!');
});

app.get('/api/health/redis', async (_req, res) => {
  try {
    if (!redis || (redis.status && redis.status !== 'ready')) {
      return res.json({ ok: true, mode: 'memory', ping: 'PONG' })
    }
    const r = await redis.ping()
    res.json({ ok: true, mode: 'redis', ping: r })
  } catch {
    res.json({ ok: true, mode: 'memory', ping: 'PONG' })
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production' && (process.env.JWT_SECRET || 'dev-secret') === 'dev-secret') {
    console.warn('Unsafe JWT_SECRET in production');
  }
  if (process.env.DATABASE_URL) {
    void bootstrapAdmin();
  } else {
    console.warn('DATABASE_URL not set; skipping admin bootstrap');
  }
});

async function bootstrapAdmin() {
  try {
    const username = 'admin';
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashed = await bcrypt.hash(defaultPassword, 10);
      await prisma.user.create({
        data: {
          id: username,
          username,
          password: hashed,
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          role: 'ADMIN',
        },
      });
      console.log('Default admin user created with username "admin"');
    }
  } catch (err) {
    console.error('Failed to bootstrap admin user', err);
  }
}
app.post('/api/send-email-code', async (req, res) => {
  try {
    const email = String((req as any).body?.email || '').trim()
    if (!email) return res.status(400).json({ error: 'bad_request', message: 'Email required' })
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) return res.status(400).json({ error: 'bad_request', message: 'Invalid email' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'not_found', message: '注册邮箱不存在' })

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || ''
    const ipKey = `emailcode:ip:${ip}`
    const ipCount = await incrWithTTL(ipKey, 3600)
    if (ipCount > 10) return res.status(429).json({ error: 'too_frequent', retry_after: 3600 })

    const now = Date.now()
    const coolKey = `user:${user.id}:email_code_cooldown`
    const cool = await cacheGet(coolKey)
    if (cool) {
      let sendTime = 0
      try { sendTime = JSON.parse(cool)?.send_time || 0 } catch {}
      const elapsed = Math.floor((now - sendTime) / 1000)
      const remain = Math.max(0, 60 - elapsed)
      if (remain > 0) return res.status(429).json({ error: 'too_frequent', retry_after: remain })
    }

    const n = Math.floor(Math.random() * 1000000)
    const code = String(n).padStart(6, '0')
    await cacheSet(`user:${user.id}:email_code`, JSON.stringify({ code, send_time: now }), 300)
    await cacheSet(coolKey, JSON.stringify({ send_time: now }), 60)
    try { await sendMail({ to: email, subject: 'ScholarHub 邮件验证码', text: `验证码：${code}（5分钟内有效）`, html: `<p>验证码：<b>${code}</b>（5分钟内有效）</p>` }) } catch (e: any) { try { fs.appendFileSync('mail.log', `[CODE-FALLBACK] ${new Date().toISOString()} to=${email} code=${code} err=${e?.message}\n`) } catch {} }
    try { fs.appendFileSync('password_reset.log', `${new Date().toISOString()} ${JSON.stringify({ phase: 'send', email, ip })}\n`) } catch {}
    res.json({ status: 'success', next_request: 60 })
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err?.message || 'Server error' })
  }
})
