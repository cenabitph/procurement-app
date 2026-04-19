import { Hono } from 'hono';
import { query, queryOne } from '../db/index';
import { layout, escHtml } from '../views/layout';
import {
  pageHeader, breadcrumb, tableWrapper, th, td, trLink,
  emptyState, formField, card, cardHeader, formatDate
} from '../views/components';

interface BACCommittee {
  id: string; project_id: string; office_unit: string;
  secretariat_head: string; created_at: string;
  project_title?: string; pr_ref?: string;
}

interface BACMember {
  id: string; bac_id: string; employee_id: string; name: string;
  designation: string; role: string; appointed_at: string; expires_at: string | null;
}

interface BACResolution {
  id: string; bac_id: string; resolution_no: string; subject: string;
  recommendation: string; resolved_at: string; approved_by_hope: number;
  approved_at: string | null;
}

const ROLES = [
  { value: 'CHAIRPERSON', label: 'Chairperson' },
  { value: 'VICE_CHAIRPERSON', label: 'Vice-Chairperson' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'OBSERVER_COA', label: 'Observer — COA' },
  { value: 'OBSERVER_CIVIL_SOCIETY', label: 'Observer — Civil Society' },
  { value: 'OBSERVER_PROFESSIONAL_ORG', label: 'Observer — Professional Org.' },
];

const RECOMMENDATIONS = [
  { value: 'AWARD', label: 'Award of Contract' },
  { value: 'FAILURE_OF_BIDDING', label: 'Failure of Bidding' },
  { value: 'POST_DISQUALIFICATION', label: 'Post-Qualification Disqualification' },
  { value: 'ALTERNATIVE_METHOD', label: 'Alternative Method of Procurement' },
];

const app = new Hono();

// ─── List committees ─────────────────────────────────────────
app.get('/', async (c) => {
  const rows = await query<BACCommittee>(
    `SELECT b.*, p.title as project_title, p.pr_ref
     FROM bac_committees b
     LEFT JOIN procurement_projects p ON b.project_id = p.id
     ORDER BY b.created_at DESC`
  );

  const table = rows.length === 0
    ? emptyState('No BAC committees found.', '/bac/new', 'Form BAC')
    : tableWrapper(`
        <thead><tr>
          ${th('Project')}${th('PR Ref')}${th('Office / Unit')}${th('Secretariat Head')}${th('Formed')}${th('')}
        </tr></thead>
        <tbody>
          ${rows.map((r) => trLink(
            `/bac/${r.id}`,
            td(escHtml(r.project_title ?? ''), 'font-medium max-w-xs truncate') +
            td(`<span class="font-mono text-xs text-blue-600">${escHtml(r.pr_ref ?? '')}</span>`) +
            td(escHtml(r.office_unit)) +
            td(escHtml(r.secretariat_head)) +
            td(formatDate(r.created_at), 'text-xs text-slate-500') +
            td(`<a href="/bac/${r.id}" class="text-xs text-blue-600 hover:underline">Manage</a>`)
          )).join('')}
        </tbody>`);

  const content = pageHeader('BAC — Bidding and Awards Committees', '', { href: '/bac/new', label: 'Form BAC' }) +
    `<div class="p-6">${card(table)}</div>`;

  return c.html(layout({ title: 'BAC', active: 'bac', content }));
});

// ─── New committee form ──────────────────────────────────────
app.get('/new', async (c) => {
  const projects = await query<{ id: string; title: string; pr_ref: string }>(
    `SELECT id, title, pr_ref FROM procurement_projects ORDER BY created_at DESC`
  );

  const form = `
    <form method="POST" action="/bac" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        ${formField('Project', 'project_id', {
          options: projects.map((p) => ({ value: p.id, label: `${p.pr_ref} — ${p.title}` })),
          required: true
        })}
        ${formField('Office / Unit', 'office_unit', { required: true, placeholder: 'e.g. BAC Secretariat Office' })}
        ${formField('Secretariat Head', 'secretariat_head', { required: true, placeholder: 'Name of BAC Secretariat Head' })}
      </div>
      <div class="flex gap-3">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Form BAC</button>
        <a href="/bac" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('Form BAC') +
    breadcrumb([{ label: 'BAC', href: '/bac' }, { label: 'New' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'Form BAC', active: 'bac', content }));
});

// ─── Create committee ────────────────────────────────────────
app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO bac_committees (id, project_id, office_unit, secretariat_head) VALUES (?, ?, ?, ?)`,
    [id, body.project_id, body.office_unit, body.secretariat_head]
  );
  // Link BAC to project
  await query(`UPDATE procurement_projects SET bac_id = ? WHERE id = ?`, [id, body.project_id]);
  return c.redirect(`/bac/${id}?flash=BAC+formed`);
});

// ─── Detail ──────────────────────────────────────────────────
app.get('/:id', async (c) => {
  const bac = await queryOne<BACCommittee>(
    `SELECT b.*, p.title as project_title, p.pr_ref FROM bac_committees b
     LEFT JOIN procurement_projects p ON b.project_id = p.id WHERE b.id = ?`,
    [c.req.param('id')]
  );
  if (!bac) return c.html('<h1>Not found</h1>', 404);

  const [members, resolutions, secretariatMembers] = await Promise.all([
    query<BACMember>(`SELECT * FROM bac_members WHERE bac_id = ? ORDER BY FIELD(role,'CHAIRPERSON','VICE_CHAIRPERSON','MEMBER','OBSERVER_COA','OBSERVER_CIVIL_SOCIETY','OBSERVER_PROFESSIONAL_ORG')`, [bac.id]),
    query<BACResolution>(`SELECT * FROM bac_resolutions WHERE bac_id = ? ORDER BY resolved_at DESC`, [bac.id]),
    query<{ id: string; name: string }>(`SELECT id, name FROM bac_secretariat_members WHERE bac_id = ?`, [bac.id]),
  ]);

  const flash = c.req.query('flash') ? { type: 'success' as const, message: decodeURIComponent(c.req.query('flash')!) } : undefined;

  const ROLE_COLORS: Record<string, string> = {
    CHAIRPERSON: 'bg-blue-100 text-blue-800',
    VICE_CHAIRPERSON: 'bg-indigo-100 text-indigo-700',
    MEMBER: 'bg-slate-100 text-slate-700',
    OBSERVER_COA: 'bg-amber-100 text-amber-700',
    OBSERVER_CIVIL_SOCIETY: 'bg-green-100 text-green-700',
    OBSERVER_PROFESSIONAL_ORG: 'bg-purple-100 text-purple-700',
  };

  const metaCard = card(`
    ${cardHeader(`BAC — ${escHtml(bac.project_title ?? '')}`)}
    <div class="p-5 grid grid-cols-2 gap-4 text-sm">
      <div><div class="text-xs text-slate-500">Project</div><div class="font-medium">${escHtml(bac.project_title ?? '')}</div></div>
      <div><div class="text-xs text-slate-500">PR Ref</div><div class="font-mono text-xs text-blue-600">${escHtml(bac.pr_ref ?? '')}</div></div>
      <div><div class="text-xs text-slate-500">Office / Unit</div><div>${escHtml(bac.office_unit)}</div></div>
      <div><div class="text-xs text-slate-500">Secretariat Head</div><div>${escHtml(bac.secretariat_head)}</div></div>
    </div>
  `);

  const membersCard = card(`
    ${cardHeader(`Members (${members.length})`)}
    ${members.length === 0
      ? '<div class="p-4 text-sm text-slate-400">No members yet.</div>'
      : tableWrapper(`
          <thead><tr>${th('Name')}${th('Designation')}${th('Role')}${th('Appointed')}${th('Expires')}${th('')}</tr></thead>
          <tbody>
            ${members.map((m) => `<tr class="hover:bg-slate-50">
              ${td(escHtml(m.name), 'font-medium')}
              ${td(escHtml(m.designation), 'text-xs text-slate-500')}
              ${td(`<span class="inline-block px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[m.role] ?? 'bg-slate-100 text-slate-700'}">${escHtml(m.role.replace(/_/g, ' '))}</span>`)}
              ${td(formatDate(m.appointed_at), 'text-xs')}
              ${td(m.expires_at ? formatDate(m.expires_at) : '<span class="text-slate-400">—</span>', 'text-xs')}
              ${td(`<form method="POST" action="/bac/${bac.id}/members/${m.id}/delete" onsubmit="return confirm('Remove member?')"><button class="text-xs text-red-500 hover:underline">Remove</button></form>`)}
            </tr>`).join('')}
          </tbody>`)}
    <form method="POST" action="/bac/${bac.id}/members" class="p-4 border-t border-slate-200">
      <div class="text-xs font-semibold text-slate-600 mb-2">Add Member</div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        ${formField('Employee ID', 'employee_id', { required: true })}
        ${formField('Name', 'name', { required: true })}
        ${formField('Designation', 'designation', { required: true })}
        ${formField('Role', 'role', { options: ROLES, required: true })}
        ${formField('Appointed Date', 'appointed_at', { type: 'date', required: true })}
        <div class="flex items-end"><button type="submit" class="px-4 py-2 bg-green-700 text-white text-xs font-semibold hover:bg-green-800 w-full">Add</button></div>
      </div>
    </form>
  `, 'mt-4');

  const secretariatCard = card(`
    ${cardHeader('Secretariat Members')}
    ${secretariatMembers.length === 0
      ? '<div class="p-4 text-sm text-slate-400">No secretariat members.</div>'
      : `<div class="p-4 flex flex-wrap gap-2">${secretariatMembers.map((sm) => `<div class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 text-sm"><span>${escHtml(sm.name)}</span><form method="POST" action="/bac/${bac.id}/secretariat/${sm.id}/delete" onsubmit="return confirm('Remove?')"><button class="text-xs text-red-400 hover:text-red-600">×</button></form></div>`).join('')}</div>`}
    <form method="POST" action="/bac/${bac.id}/secretariat" class="p-4 border-t border-slate-200 flex gap-3">
      ${formField('Member Name', 'name', { required: true })}
      <div class="flex items-end"><button type="submit" class="px-4 py-2 bg-green-700 text-white text-xs font-semibold hover:bg-green-800">Add</button></div>
    </form>
  `, 'mt-4');

  const resolutionsCard = card(`
    ${cardHeader(`Resolutions (${resolutions.length})`, `<a href="/bac/${bac.id}/resolutions/new" class="px-3 py-1 bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800">+ New Resolution</a>`)}
    ${resolutions.length === 0
      ? '<div class="p-4 text-sm text-slate-400">No resolutions.</div>'
      : tableWrapper(`
          <thead><tr>${th('Res. No.')}${th('Subject')}${th('Recommendation')}${th('Resolved')}${th('HOPE Approved')}${th('')}</tr></thead>
          <tbody>
            ${resolutions.map((r) => trLink(
              `/bac/${bac.id}/resolutions/${r.id}`,
              td(`<span class="font-mono text-xs text-blue-600">${escHtml(r.resolution_no)}</span>`) +
              td(escHtml(r.subject), 'max-w-xs truncate') +
              td(escHtml(r.recommendation.replace(/_/g, ' ')), 'text-xs') +
              td(formatDate(r.resolved_at), 'text-xs text-slate-500') +
              td(r.approved_by_hope ? `<span class="text-green-600 font-semibold text-xs">✓ ${formatDate(r.approved_at)}</span>` : '<span class="text-amber-600 text-xs">Pending</span>') +
              td(`<a href="/bac/${bac.id}/resolutions/${r.id}" class="text-xs text-blue-600 hover:underline">View</a>`)
            )).join('')}
          </tbody>`)}
  `, 'mt-4');

  const content = pageHeader('BAC Committee', `${escHtml(bac.project_title ?? '')}`) +
    breadcrumb([{ label: 'BAC', href: '/bac' }, { label: bac.pr_ref ?? '' }]) +
    `<div class="p-6">${metaCard}${membersCard}${secretariatCard}${resolutionsCard}</div>`;

  return c.html(layout({ title: 'BAC', active: 'bac', content, flash }));
});

// ─── Members ─────────────────────────────────────────────────
app.post('/:id/members', async (c) => {
  const body = await c.req.parseBody();
  await query(
    `INSERT INTO bac_members (id, bac_id, employee_id, name, designation, role, appointed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), c.req.param('id'), body.employee_id, body.name, body.designation, body.role, body.appointed_at]
  );
  return c.redirect(`/bac/${c.req.param('id')}?flash=Member+added`);
});

app.post('/:id/members/:memberId/delete', async (c) => {
  await query(`DELETE FROM bac_members WHERE id = ? AND bac_id = ?`, [c.req.param('memberId'), c.req.param('id')]);
  return c.redirect(`/bac/${c.req.param('id')}?flash=Member+removed`);
});

// ─── Secretariat ─────────────────────────────────────────────
app.post('/:id/secretariat', async (c) => {
  const body = await c.req.parseBody();
  await query(`INSERT INTO bac_secretariat_members (id, bac_id, name) VALUES (?, ?, ?)`, [crypto.randomUUID(), c.req.param('id'), body.name]);
  return c.redirect(`/bac/${c.req.param('id')}?flash=Secretariat+member+added`);
});

app.post('/:id/secretariat/:smId/delete', async (c) => {
  await query(`DELETE FROM bac_secretariat_members WHERE id = ? AND bac_id = ?`, [c.req.param('smId'), c.req.param('id')]);
  return c.redirect(`/bac/${c.req.param('id')}?flash=Secretariat+member+removed`);
});

// ─── Resolution — new form ───────────────────────────────────
app.get('/:id/resolutions/new', async (c) => {
  const bac = await queryOne<BACCommittee>(`SELECT * FROM bac_committees WHERE id = ?`, [c.req.param('id')]);
  if (!bac) return c.html('<h1>Not found</h1>', 404);

  const form = `
    <form method="POST" action="/bac/${bac.id}/resolutions" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        ${formField('Resolution No.', 'resolution_no', { required: true, placeholder: 'e.g. BAC-RES-2025-001' })}
        ${formField('Recommendation', 'recommendation', { options: RECOMMENDATIONS, required: true })}
        ${formField('Resolved At', 'resolved_at', { type: 'datetime-local', required: true })}
      </div>
      ${formField('Subject', 'subject', { type: 'textarea', required: true })}
      <div class="flex gap-3">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Create Resolution</button>
        <a href="/bac/${bac.id}" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('New Resolution') +
    breadcrumb([{ label: 'BAC', href: '/bac' }, { label: c.req.param('id').slice(0, 8), href: `/bac/${bac.id}` }, { label: 'New Resolution' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'New Resolution', active: 'bac', content }));
});

// ─── Resolution — create ─────────────────────────────────────
app.post('/:id/resolutions', async (c) => {
  const body = await c.req.parseBody();
  const resId = crypto.randomUUID();
  await query(
    `INSERT INTO bac_resolutions (id, bac_id, resolution_no, subject, recommendation, resolved_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [resId, c.req.param('id'), body.resolution_no, body.subject, body.recommendation, body.resolved_at]
  );
  return c.redirect(`/bac/${c.req.param('id')}/resolutions/${resId}?flash=Resolution+created`);
});

// ─── Resolution — detail ─────────────────────────────────────
app.get('/:id/resolutions/:resId', async (c) => {
  const { id, resId } = c.req.param();
  const [bac, res] = await Promise.all([
    queryOne<BACCommittee>(`SELECT b.*, p.title as project_title, p.pr_ref FROM bac_committees b LEFT JOIN procurement_projects p ON b.project_id = p.id WHERE b.id = ?`, [id]),
    queryOne<BACResolution>(`SELECT * FROM bac_resolutions WHERE id = ? AND bac_id = ?`, [resId, id]),
  ]);
  if (!bac || !res) return c.html('<h1>Not found</h1>', 404);

  const votes = await query<{ id: string; member_id: string; vote: string; name: string }>(
    `SELECT rv.*, bm.name FROM resolution_votes rv LEFT JOIN bac_members bm ON rv.member_id = bm.id WHERE rv.resolution_id = ?`,
    [resId]
  );
  const members = await query<BACMember>(`SELECT * FROM bac_members WHERE bac_id = ?`, [id]);

  const flash = c.req.query('flash') ? { type: 'success' as const, message: decodeURIComponent(c.req.query('flash')!) } : undefined;

  const RECO_COLORS: Record<string, string> = {
    AWARD: 'bg-green-100 text-green-800',
    FAILURE_OF_BIDDING: 'bg-red-100 text-red-700',
    POST_DISQUALIFICATION: 'bg-orange-100 text-orange-700',
    ALTERNATIVE_METHOD: 'bg-blue-100 text-blue-700',
  };

  const resCard = card(`
    ${cardHeader(`Resolution ${escHtml(res.resolution_no)}`)}
    <div class="p-5">
      <div class="flex items-center gap-2 mb-4">
        <span class="inline-block px-3 py-1 text-xs font-semibold ${RECO_COLORS[res.recommendation] ?? 'bg-slate-100'}">
          ${escHtml(res.recommendation.replace(/_/g, ' '))}
        </span>
        ${res.approved_by_hope ? `<span class="text-green-600 text-xs font-semibold">✓ HOPE Approved ${formatDate(res.approved_at)}</span>` : ''}
      </div>
      <div class="text-sm text-slate-500 mb-1">Subject</div>
      <div class="text-sm bg-slate-50 border border-slate-200 p-3">${escHtml(res.subject)}</div>
      <div class="mt-3 text-xs text-slate-500">Resolved: ${formatDate(res.resolved_at)}</div>
    </div>
    ${!res.approved_by_hope ? `
      <div class="border-t border-slate-200 px-5 py-3">
        <form method="POST" action="/bac/${id}/resolutions/${resId}/approve">
          <button class="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold hover:bg-green-700">HOPE Approves Resolution</button>
        </form>
      </div>` : ''}
  `);

  const yesVotes = votes.filter((v) => v.vote === 'YES').length;
  const noVotes = votes.filter((v) => v.vote === 'NO').length;
  const abstainVotes = votes.filter((v) => v.vote === 'ABSTAIN').length;

  const votesCard = card(`
    ${cardHeader(`Votes — ${yesVotes} YES / ${noVotes} NO / ${abstainVotes} ABSTAIN`)}
    ${votes.length === 0
      ? '<div class="p-4 text-sm text-slate-400">No votes recorded.</div>'
      : tableWrapper(`
          <thead><tr>${th('Member')}${th('Vote')}</tr></thead>
          <tbody>
            ${votes.map((v) => `<tr>
              ${td(escHtml(v.name ?? v.member_id), 'font-medium')}
              ${td(`<span class="font-semibold text-sm ${v.vote === 'YES' ? 'text-green-700' : v.vote === 'NO' ? 'text-red-700' : 'text-amber-600'}">${v.vote}</span>`)}
            </tr>`).join('')}
          </tbody>`)}
    <form method="POST" action="/bac/${id}/resolutions/${resId}/votes" class="p-4 border-t border-slate-200 flex gap-3 items-end">
      ${formField('Member', 'member_id', { options: members.map((m) => ({ value: m.id, label: m.name })), required: true })}
      ${formField('Vote', 'vote', { options: [{ value: 'YES', label: 'YES' }, { value: 'NO', label: 'NO' }, { value: 'ABSTAIN', label: 'ABSTAIN' }], required: true })}
      <div class="flex items-end"><button type="submit" class="px-4 py-2 bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800">Record Vote</button></div>
    </form>
  `, 'mt-4');

  const content = pageHeader(`Resolution ${res.resolution_no}`) +
    breadcrumb([{ label: 'BAC', href: '/bac' }, { label: bac.pr_ref ?? '', href: `/bac/${id}` }, { label: res.resolution_no }]) +
    `<div class="p-6">${resCard}${votesCard}</div>`;

  return c.html(layout({ title: `Resolution ${res.resolution_no}`, active: 'bac', content, flash }));
});

app.post('/:id/resolutions/:resId/approve', async (c) => {
  await query(`UPDATE bac_resolutions SET approved_by_hope = 1, approved_at = NOW() WHERE id = ?`, [c.req.param('resId')]);
  return c.redirect(`/bac/${c.req.param('id')}/resolutions/${c.req.param('resId')}?flash=Resolution+approved+by+HOPE`);
});

app.post('/:id/resolutions/:resId/votes', async (c) => {
  const body = await c.req.parseBody();
  await query(
    `INSERT INTO resolution_votes (id, resolution_id, member_id, vote) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE vote = VALUES(vote)`,
    [crypto.randomUUID(), c.req.param('resId'), body.member_id, body.vote]
  );
  return c.redirect(`/bac/${c.req.param('id')}/resolutions/${c.req.param('resId')}?flash=Vote+recorded`);
});

export default app;
