import './env'; // This must be the very first import to fix hoisting issues!
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

import authRoutes from './routes/auth';
import categoriesRoutes from './routes/categories';
import menuRoutes from './routes/menu';
import ordersRoutes from './routes/orders';

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);

import { supabase } from './db/index';


app.listen(PORT, async () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS custom_options JSONB DEFAULT '[]'::jsonb;`
    });
    if (!error) {
      console.log('Migration successful: custom_options ensured.');
      await supabase.rpc('exec_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
    }
  } catch(e) {
    console.error('Migration failed', e);
  }


});

