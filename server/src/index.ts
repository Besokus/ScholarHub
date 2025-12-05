import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import resourcesRouter from './routes/resources';
import qaRouter from './routes/qa';
import notificationsRouter from './routes/notifications';
import coursesRouter from './routes/courses';
import prisma from './db';
import bcrypt from 'bcryptjs';
import path from 'path';
import uploadsRouter from './routes/uploads';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/qa', qaRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/uploads', uploadsRouter);

app.get('/', (req, res) => {
  res.send('Hello from ULEP Server!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
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
