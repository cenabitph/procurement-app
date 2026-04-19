import 'dotenv/config';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

import dashboardRoutes from './routes/dashboard';
import ppmpRoutes from './routes/ppmp';
import appPlanRoutes from './routes/app-plan';
import projectRoutes from './routes/projects';
import supplierRoutes from './routes/suppliers';
import bidRoutes from './routes/bids';
import bacRoutes from './routes/bac';
import awardRoutes from './routes/awards';

const app = new Hono();

app.use('*', logger());

app.route('/', dashboardRoutes);
app.route('/ppmp', ppmpRoutes);
app.route('/app-plan', appPlanRoutes);
app.route('/projects', projectRoutes);
app.route('/suppliers', supplierRoutes);
app.route('/bids', bidRoutes);
app.route('/bac', bacRoutes);
app.route('/awards', awardRoutes);

const port = parseInt(process.env.PORT ?? '3000');
console.log(`🚀 Procurement System running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
