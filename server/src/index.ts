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
import categoryRoutes from './routes/categories';
import courseCategoriesRouter from './routes/courseCategories';
import { registerSwagger } from './swagger';
import answersRouter from './routes/answers';
import { authOptional } from './middleware/auth';
import fs from 'fs';
import { redis, cacheGet, cacheSet, incrWithTTL, delByPrefix } from './cache';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const corsOptions = { origin: allowed.length ? allowed : true, credentials: true, optionsSuccessStatus: 204 }
app.use(cors(corsOptions));
app.use(express.json());
const uploadsPath = path.join(process.cwd(), 'uploads')
console.log('Serving uploads from:', uploadsPath)
console.log('Allowed origins:', allowed.length ? allowed : ['*'])
console.log('Env:', (process.env.NODE_ENV || 'development'))
console.log('Database URL set:', !!process.env.DATABASE_URL)
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
app.use('/api/course-categories', courseCategoriesRouter);
app.use('/api/categories', categoryRoutes);
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
    void bootstrapCourseCategories();
    void bootstrapCourseAssignments();
    void bootstrapResourceCategoriesDict();
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

async function bootstrapCourseCategories() {
  try {
    const names = [
      '计算机与信息技术类',
      '数学与统计类',
      '电子信息与通信类',
      '自动化与控制工程类',
      '机械与工程技术类',
      '电气与能源类',
      '经济管理与商科类',
      '人文社科与通识教育类',
      '外语与语言类',
      '艺术与设计类',
      '体育与健康类',
      '创新创业与实践类'
    ]
    const existing = await prisma.courseCategory.findMany({ select: { name: true } })
    const ex = new Set(existing.map(x => x.name))
    const missing = names.filter(n => !ex.has(n))
    if (missing.length) {
      await prisma.courseCategory.createMany({
        data: missing.map(n => ({ name: n }))
      })
    }
    const all = await prisma.courseCategory.findMany({ orderBy: { id: 'asc' } })
    const seen = new Set<string>()
    const dupIds: number[] = []
    for (const c of all) {
      if (seen.has(c.name)) dupIds.push((c as any).id as number)
      else seen.add(c.name)
    }
    if (dupIds.length) {
      for (const id of dupIds) {
        try { await prisma.courseCategory.delete({ where: { id } }) } catch {}
      }
    }
    try { await delByPrefix('course_categories') } catch {}
    const count = await prisma.courseCategory.count()
    console.log(`Course categories ensured. Total: ${count}`)
  } catch (err) {
    console.error('Failed to bootstrap course categories', err)
  }
}

async function bootstrapCourseAssignments() {
  try {
    const ccNames = ['计算机与信息技术类', '体育与健康类']
    const ccList = await prisma.courseCategory.findMany({ where: { name: { in: ccNames } } })
    const ccMap = new Map(ccList.map(c => [c.name, c.id]))
    const csBasic = await ensureCat('基础课', 'basic')
    const csMajor = await ensureCat('专业课', 'major')
    const csSport = await ensureCat('体育课', 'sport')
    const courses = await prisma.course.findMany({ where: { name: { in: ['数据结构','软件工程','web开发','击剑'] } } })
    for (const c of courses) {
      let categoryId: number | null = null
      let courseCategoryId: number | null = null
      if (c.name === '数据结构') {
        categoryId = csBasic.id
        courseCategoryId = ccMap.get('计算机与信息技术类') || null
      } else if (c.name === '软件工程') {
        categoryId = csBasic.id
        courseCategoryId = ccMap.get('计算机与信息技术类') || null
      } else if (c.name.toLowerCase() === 'web开发' || c.name.toLowerCase() === 'web') {
        categoryId = csMajor.id
        courseCategoryId = ccMap.get('计算机与信息技术类') || null
      } else if (c.name === '击剑') {
        categoryId = csSport.id
        courseCategoryId = ccMap.get('体育与健康类') || null
      }
      const data: any = {}
      if (categoryId !== null) data.categoryId = categoryId
      if (courseCategoryId !== null) data.courseCategoryId = courseCategoryId
      if (Object.keys(data).length) {
        await prisma.course.update({ where: { id: c.id }, data })
      }
    }
    try { await delByPrefix('courses:list') } catch {}
    console.log('Course assignments ensured')
  } catch (err) {
    console.error('Failed to bootstrap course assignments', err)
  }
}

async function ensureCat(name: string, code: string, parentId?: number, sortOrder?: number) {
  const exists = await prisma.category.findUnique({ where: { code } })
  if (exists) return exists
  return prisma.category.create({ data: { name, code, parentId: parentId || null, sortOrder: sortOrder || 0 } })
}

async function bootstrapResourceCategoriesDict() {
  try {
    const TAGS = ['课件', '真题', '作业', '代码', '答案', '笔记', '教材', '其他']
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ResourceCategory" (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort INTEGER NOT NULL DEFAULT 0
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ResourceCategoryMap" (
        resource_id INTEGER PRIMARY KEY,
        category_code TEXT NOT NULL REFERENCES "ResourceCategory"(code) ON UPDATE CASCADE ON DELETE RESTRICT
      );
    `)
    for (let i = 0; i < TAGS.length; i++) {
      const code = TAGS[i]
      const name = TAGS[i]
      const sort = i
      await prisma.$executeRawUnsafe(`
        INSERT INTO "ResourceCategory"(code, name, sort) VALUES ($1, $2, $3)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort
      `, code, name, sort)
    }
    try { await delByPrefix('res:list:') } catch {}
    console.log('Resource category dictionary ensured')
  } catch (err) {
    console.error('Failed to bootstrap resource category dict', err)
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
