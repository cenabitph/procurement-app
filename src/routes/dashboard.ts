import { Hono } from 'hono';
import { query } from '../db/index';
import { layout } from '../views/layout';
import { kpiCard, formatPeso, statusBadge, tableWrapper, th, td, trLink, formatDate } from '../views/components';

const app = new Hono();

app.get('/', async (c) => {
  const [[stats], recentProjects, statusBreakdown] = await Promise.all([
    query<{ total: number; active: number; completed: number; total_abc: string }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status NOT IN ('TERMINATED','FAILED','DRAFT') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status NOT IN ('TERMINATED','FAILED') THEN abc ELSE 0 END) as total_abc
       FROM procurement_projects`
    ),
    query<{
      id: string; pr_ref: string; title: string; category: string;
      procurement_mode: string; abc: string; status: string; created_at: string;
    }>(
      `SELECT id, pr_ref, title, category, procurement_mode, abc, status, created_at
       FROM procurement_projects ORDER BY created_at DESC LIMIT 8`
    ),
    query<{ status: string; cnt: number }>(
      `SELECT status, COUNT(*) as cnt FROM procurement_projects GROUP BY status ORDER BY cnt DESC`
    ),
  ]);

  const [supplierCount] = await query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM suppliers WHERE blacklisted = 0`
  );

  const kpis = `
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4 px-6 pt-6">
      ${kpiCard('Total Projects', String(stats?.total ?? 0), 'All fiscal years')}
      ${kpiCard('Active Projects', String(stats?.active ?? 0), 'In progress', 'blue')}
      ${kpiCard('Completed', String(stats?.completed ?? 0), 'Successfully closed', 'green')}
      ${kpiCard('Total ABC', formatPeso(stats?.total_abc ?? 0), 'Excluding failed/terminated', 'amber')}
    </div>`;

  const recentTable = `
    <div class="px-6 pt-6 pb-2">
      <h2 class="text-sm font-semibold text-slate-700 mb-3">Recent Procurement Projects</h2>
      <div class="bg-white border border-slate-200">
        ${tableWrapper(`
          <thead><tr>
            ${th('PR Ref')}${th('Title')}${th('Category')}${th('Mode')}${th('ABC')}${th('Status')}${th('Created')}
          </tr></thead>
          <tbody>
            ${recentProjects.length === 0
              ? `<tr><td colspan="7" class="px-4 py-8 text-center text-slate-400 text-sm">No projects yet</td></tr>`
              : recentProjects.map((p) => trLink(
                  `/projects/${p.id}`,
                  td(escHtml(p.pr_ref), 'font-mono text-xs text-blue-600') +
                  td(escHtml(p.title), 'max-w-xs truncate font-medium') +
                  td(escHtml(p.category.replace(/_/g, ' '))) +
                  td(escHtml(p.procurement_mode.replace(/_/g, ' ')), 'text-xs text-slate-500') +
                  td(formatPeso(p.abc), 'text-right font-mono text-xs') +
                  td(statusBadge(p.status)) +
                  td(formatDate(p.created_at), 'text-xs text-slate-500 whitespace-nowrap')
                )).join('')}
          </tbody>
        `)}
      </div>
    </div>`;

  const breakdown = `
    <div class="px-6 pt-4 pb-6">
      <h2 class="text-sm font-semibold text-slate-700 mb-3">Status Breakdown</h2>
      <div class="flex flex-wrap gap-2">
        ${statusBreakdown.map((s) => `
          <a href="/projects?status=${encodeURIComponent(s.status)}" class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-xs hover:border-blue-400">
            ${statusBadge(s.status)}
            <span class="font-semibold text-slate-700">${s.cnt}</span>
          </a>`).join('')}
      </div>
    </div>`;

  const supplierKpi = `
    <div class="px-6 pt-2 pb-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${kpiCard('Active Suppliers', String(supplierCount?.cnt ?? 0), 'Registered, not blacklisted', 'green')}
      </div>
    </div>`;

  const content = kpis + recentTable + breakdown + supplierKpi;

  return c.html(layout({ title: 'Dashboard', active: 'dashboard', content }));
});

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default app;
