import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Hello from ULEP Server!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});