import { Hono } from 'hono';
import { query, queryOne } from '../db/index';
import { getUser } from '../middleware/auth';
import { layout, escHtml } from '../views/layout';
import {
  pageHeader, breadcrumb, statusBadge, tableWrapper, th, td, trLink,
  emptyState, formField, card, cardHeader, formatPeso, formatDate
} from '../views/components';

interface BidDoc {
  id: string; project_id: string; supplier_id: string;
  bid_price: string; grand_total: string;
  bid_security_type: string; bid_security_amount: string; bid_security_expiry: string;
  submitted_at: string; is_late_filing: number; is_disqualified: number;
  disqualification_reason: string | null;
  project_title?: string; supplier_name?: string;
}

interface BidLineItem {
  id: string; bid_document_id: string; item_no: number; description: string;
  unit: string; quantity: string; unit_price: string; total_price: string;
}

const SECURITY_TYPES = [
  { value: 'CASH_MONEY_ORDER', label: 'Cash / Money Order' },
  { value: 'MANAGERS_CHECK', label: "Manager's Check" },
  { value: 'BANK_DRAFT', label: 'Bank Draft' },
  { value: 'GUARANTEE', label: 'Guarantee' },
  { value: 'SURETY_BOND', label: 'Surety Bond' },
  { value: 'IRREVOCABLE_LETTER_OF_CREDIT', label: 'Irrevocable Letter of Credit' },
];

const app = new Hono();

// ─── List ────────────────────────────────────────────────────
app.get('/', async (c) => {
  const projectId = c.req.query('project_id') ?? '';
  const params: unknown[] = [];
  let sql = `SELECT b.*, p.title as project_title, s.business_name as supplier_name
             FROM bid_documents b
             LEFT JOIN procurement_projects p ON b.project_id = p.id
             LEFT JOIN suppliers s ON b.supplier_id = s.id`;
  if (projectId) { sql += ' WHERE b.project_id = ?'; params.push(projectId); }
  sql += ' ORDER BY b.submitted_at DESC';

  const rows = await query<BidDoc>(sql, params);
  const projects = await query<{ id: string; title: string; pr_ref: string }>(
    `SELECT id, title, pr_ref FROM procurement_projects ORDER BY created_at DESC`
  );

  const filterBar = `
    <div class="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-3">
      <form method="GET" action="/bids" class="flex items-center gap-2">
        <label class="text-xs text-slate-500">Project:</label>
        <select name="project_id" class="border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" onchange="this.form.submit()">
          <option value="">All Projects</option>
          ${projects.map((p) => `<option value="${p.id}" ${projectId === p.id ? 'selected' : ''}>${escHtml(p.pr_ref)} — ${escHtml(p.title)}</option>`).join('')}
        </select>
      </form>
    </div>`;

  const table = rows.length === 0
    ? emptyState('No bids found.', projectId ? `/bids/new?project_id=${projectId}` : '/bids/new', 'Submit Bid')
    : tableWrapper(`
        <thead><tr>
          ${th('Project')}${th('Supplier')}${th('Bid Price')}${th('Grand Total')}${th('Submitted')}${th('Late?')}${th('Status')}${th('')}
        </tr></thead>
        <tbody>
          ${rows.map((r) => trLink(
            `/bids/${r.id}`,
            td(escHtml(r.project_title ?? ''), 'max-w-[180px] truncate text-xs') +
            td(escHtml(r.supplier_name ?? ''), 'font-medium') +
            td(formatPeso(r.bid_price), 'text-right font-mono text-xs') +
            td(formatPeso(r.grand_total), 'text-right font-mono text-xs font-semibold') +
            td(formatDate(r.submitted_at), 'text-xs text-slate-500 whitespace-nowrap') +
            td(r.is_late_filing ? '<span class="text-xs text-red-600 font-semibold">LATE</span>' : '<span class="text-xs text-slate-400">On-time</span>') +
            td(r.is_disqualified ? statusBadge('FAILED') : statusBadge('APPROVED')) +
            td(`<a href="/bids/${r.id}" class="text-xs text-blue-600 hover:underline">View</a>`)
          )).join('')}
        </tbody>`);

  const content = pageHeader('Bid Documents', 'Manage bid submissions', { href: '/bids/new', label: 'Submit Bid' }) +
    filterBar +
    `<div class="p-6">${card(table)}</div>`;

  return c.html(layout({ title: 'Bids', active: 'bids', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── New form ────────────────────────────────────────────────
app.get('/new', async (c) => {
  const preselectedProjectId = c.req.query('project_id') ?? '';
  const [projects, suppliers] = await Promise.all([
    query<{ id: string; title: string; pr_ref: string }>(
      `SELECT id, title, pr_ref FROM procurement_projects
       WHERE status IN ('OPENING_OF_BIDS','BID_EVALUATION','POST_QUALIFICATION') ORDER BY title`
    ),
    query<{ id: string; business_name: string }>(
      `SELECT id, business_name FROM suppliers WHERE blacklisted = 0 ORDER BY business_name`
    ),
  ]);

  const form = `
    <form method="POST" action="/bids" class="space-y-5">
      <div class="border-b border-slate-200 pb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Bid Information</div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          ${formField('Project', 'project_id', {
            options: projects.map((p) => ({ value: p.id, label: `${p.pr_ref} — ${p.title}` })),
            value: preselectedProjectId, required: true
          })}
          ${formField('Supplier / Bidder', 'supplier_id', {
            options: suppliers.map((s) => ({ value: s.id, label: s.business_name })),
            required: true
          })}
          ${formField('Bid Price Form (₱)', 'bid_price', { type: 'number', min: '0', step: '0.01', required: true })}
          ${formField('Grand Total (₱)', 'grand_total', { type: 'number', min: '0', step: '0.01', required: true })}
          ${formField('Submission Date & Time', 'submitted_at', { type: 'datetime-local', required: true })}
          ${formField('Late Filing?', 'is_late_filing', { options: [{ value: '0', label: 'No — On-time' }, { value: '1', label: 'Yes — Late' }] })}
        </div>
      </div>
      <div class="border-b border-slate-200 pb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Bid Security</div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          ${formField('Security Type', 'bid_security_type', { options: SECURITY_TYPES, required: true })}
          ${formField('Security Amount (₱)', 'bid_security_amount', { type: 'number', min: '0', step: '0.01', required: true })}
          ${formField('Security Expiry Date', 'bid_security_expiry', { type: 'date', required: true })}
        </div>
      </div>
      <div class="flex gap-3">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Submit Bid</button>
        <a href="/bids" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('Submit Bid Document') +
    breadcrumb([{ label: 'Bids', href: '/bids' }, { label: 'Submit' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'Submit Bid', active: 'bids', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── Create ──────────────────────────────────────────────────
app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO bid_documents (id, project_id, supplier_id, bid_price, grand_total,
       bid_security_type, bid_security_amount, bid_security_expiry, submitted_at, is_late_filing)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.project_id, body.supplier_id, body.bid_price, body.grand_total,
     body.bid_security_type, body.bid_security_amount, body.bid_security_expiry,
     body.submitted_at, body.is_late_filing ?? 0]
  );
  return c.redirect(`/bids/${id}?flash=Bid+submitted`);
});

// ─── Detail ──────────────────────────────────────────────────
app.get('/:id', async (c) => {
  const bid = await queryOne<BidDoc>(
    `SELECT b.*, p.title as project_title, p.pr_ref, s.business_name as supplier_name
     FROM bid_documents b
     LEFT JOIN procurement_projects p ON b.project_id = p.id
     LEFT JOIN suppliers s ON b.supplier_id = s.id
     WHERE b.id = ?`,
    [c.req.param('id')]
  );
  if (!bid) return c.html('<h1>Not found</h1>', 404);

  const lineItems = await query<BidLineItem>(
    `SELECT * FROM bid_line_items WHERE bid_document_id = ? ORDER BY item_no`,
    [bid.id]
  );

  const flash = c.req.query('flash') ? { type: 'success' as const, message: decodeURIComponent(c.req.query('flash')!) } : undefined;

  const infoCard = card(`
    ${cardHeader(`Bid — ${escHtml((bid as any).pr_ref ?? '')} / ${escHtml(bid.supplier_name ?? '')}`, bid.is_disqualified ? statusBadge('FAILED') : statusBadge('APPROVED'))}
    <div class="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
      <div><div class="text-xs text-slate-500">Project</div><div class="font-medium">${escHtml(bid.project_title ?? '')}</div></div>
      <div><div class="text-xs text-slate-500">Supplier</div><div class="font-medium">${escHtml(bid.supplier_name ?? '')}</div></div>
      <div><div class="text-xs text-slate-500">Bid Price</div><div class="font-bold text-blue-700">${formatPeso(bid.bid_price)}</div></div>
      <div><div class="text-xs text-slate-500">Grand Total</div><div class="font-bold">${formatPeso(bid.grand_total)}</div></div>
      <div><div class="text-xs text-slate-500">Submitted</div><div>${formatDate(bid.submitted_at)}</div></div>
      <div><div class="text-xs text-slate-500">Filing</div><div>${bid.is_late_filing ? '<span class="text-red-600 font-semibold">Late</span>' : 'On-time'}</div></div>
      <div><div class="text-xs text-slate-500">Security Type</div><div class="text-xs">${escHtml(bid.bid_security_type.replace(/_/g, ' '))}</div></div>
      <div><div class="text-xs text-slate-500">Security Amount</div><div>${formatPeso(bid.bid_security_amount)}</div></div>
      <div><div class="text-xs text-slate-500">Security Expiry</div><div>${formatDate(bid.bid_security_expiry)}</div></div>
    </div>
    ${bid.is_disqualified ? `<div class="px-5 pb-4 text-xs text-red-700 bg-red-50 py-2 border-t border-red-100">Disqualification reason: ${escHtml(bid.disqualification_reason ?? 'N/A')}</div>` : ''}
    ${!bid.is_disqualified ? `
      <div class="border-t border-slate-200 px-5 py-3">
        <form method="POST" action="/bids/${bid.id}/disqualify" class="flex items-center gap-3" onsubmit="return confirm('Disqualify this bid?')">
          <input type="text" name="reason" required placeholder="Reason for disqualification" class="border border-slate-300 px-3 py-1.5 text-xs flex-1 focus:outline-none">
          <button type="submit" class="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Disqualify</button>
        </form>
      </div>` : `
      <div class="border-t border-slate-200 px-5 py-3">
        <form method="POST" action="/bids/${bid.id}/reinstate" onsubmit="return confirm('Reinstate this bid?')">
          <button class="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold hover:bg-green-700">Reinstate Bid</button>
        </form>
      </div>`}
  `);

  // Line items
  const lineItemsCard = card(`
    ${cardHeader(`Line Items (${lineItems.length})`)}
    ${lineItems.length === 0
      ? '<div class="p-4 text-sm text-slate-400">No line items.</div>'
      : tableWrapper(`
          <thead><tr>${th('#')}${th('Description')}${th('Unit')}${th('Qty')}${th('Unit Price')}${th('Total')}${th('')}</tr></thead>
          <tbody>
            ${lineItems.map((li) => `<tr class="hover:bg-slate-50">
              ${td(String(li.item_no), 'text-center text-xs text-slate-400')}
              ${td(escHtml(li.description))}
              ${td(escHtml(li.unit), 'text-xs')}
              ${td(parseFloat(li.quantity).toLocaleString(), 'text-right')}
              ${td(formatPeso(li.unit_price), 'text-right font-mono text-xs')}
              ${td(formatPeso(li.total_price), 'text-right font-mono text-xs font-semibold')}
              ${td(`<form method="POST" action="/bids/${bid.id}/items/${li.id}/delete" onsubmit="return confirm('Delete?')"><button class="text-xs text-red-500 hover:underline">Del</button></form>`)}
            </tr>`).join('')}
          </tbody>`)}
    <form method="POST" action="/bids/${bid.id}/items" class="p-4 border-t border-slate-200">
      <div class="text-xs font-semibold text-slate-600 mb-2">Add Line Item</div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <div class="col-span-2">${formField('Description', 'description', { required: true })}</div>
        ${formField('Unit', 'unit', { required: true })}
        ${formField('Qty', 'quantity', { type: 'number', min: '0.0001', step: '0.0001', required: true })}
        ${formField('Unit Price ₱', 'unit_price', { type: 'number', min: '0', step: '0.01', required: true })}
        <div class="flex items-end"><button type="submit" class="px-4 py-2 bg-green-700 text-white text-xs font-semibold hover:bg-green-800 w-full">Add</button></div>
      </div>
    </form>
  `, 'mt-4');

  const content = pageHeader('Bid Document', `${escHtml(bid.supplier_name ?? '')} — ${escHtml(bid.project_title ?? '')}`) +
    breadcrumb([{ label: 'Bids', href: '/bids' }, { label: bid.supplier_name ?? '' }]) +
    `<div class="p-6">${infoCard}${lineItemsCard}</div>`;

  return c.html(layout({ title: 'Bid Detail', active: 'bids', content, flash, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── Disqualify / reinstate ──────────────────────────────────
app.post('/:id/disqualify', async (c) => {
  const body = await c.req.parseBody();
  await query(`UPDATE bid_documents SET is_disqualified = 1, disqualification_reason = ? WHERE id = ?`, [body.reason, c.req.param('id')]);
  return c.redirect(`/bids/${c.req.param('id')}?flash=Bid+disqualified`);
});

app.post('/:id/reinstate', async (c) => {
  await query(`UPDATE bid_documents SET is_disqualified = 0, disqualification_reason = NULL WHERE id = ?`, [c.req.param('id')]);
  return c.redirect(`/bids/${c.req.param('id')}?flash=Bid+reinstated`);
});

// ─── Line items ──────────────────────────────────────────────
app.post('/:id/items', async (c) => {
  const body = await c.req.parseBody();
  const qty = parseFloat(String(body.quantity));
  const price = parseFloat(String(body.unit_price));
  const [lastItem] = await query<{ max_no: number }>(
    `SELECT COALESCE(MAX(item_no), 0) as max_no FROM bid_line_items WHERE bid_document_id = ?`,
    [c.req.param('id')]
  );
  await query(
    `INSERT INTO bid_line_items (id, bid_document_id, item_no, description, unit, quantity, unit_price, total_price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), c.req.param('id'), (lastItem?.max_no ?? 0) + 1,
     body.description, body.unit, qty, price, qty * price]
  );
  return c.redirect(`/bids/${c.req.param('id')}?flash=Line+item+added`);
});

app.post('/:id/items/:itemId/delete', async (c) => {
  await query(`DELETE FROM bid_line_items WHERE id = ? AND bid_document_id = ?`, [c.req.param('itemId'), c.req.param('id')]);
  return c.redirect(`/bids/${c.req.param('id')}?flash=Item+removed`);
});

export default app;
