export interface LayoutOptions {
  title: string;
  active: string;
  content: string;
  user?: { username: string; role: string };
  flash?: { type: 'success' | 'error' | 'info'; message: string };
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: '▣', key: 'dashboard' },
  { href: '/ppmp', label: 'PPMP', icon: '📋', key: 'ppmp' },
  { href: '/app-plan', label: 'APP', icon: '📅', key: 'app-plan' },
  { href: '/projects', label: 'Projects', icon: '📁', key: 'projects' },
  { href: '/suppliers', label: 'Suppliers', icon: '🏢', key: 'suppliers' },
  { href: '/bids', label: 'Bids', icon: '📩', key: 'bids' },
  { href: '/bac', label: 'BAC', icon: '⚖️', key: 'bac' },
  { href: '/awards', label: 'Awards & NTP', icon: '🏆', key: 'awards' },
];

const navGroups = [
  { heading: 'Planning', keys: ['dashboard', 'ppmp', 'app-plan'] },
  { heading: 'Procurement', keys: ['projects', 'bids', 'bac'] },
  { heading: 'Registry', keys: ['suppliers'] },
  { heading: 'Post-Award', keys: ['awards'] },
];

export function layout({ title, active, content, user, flash }: LayoutOptions): string {
  const navHtml = navGroups.map((group) => {
    const items = navItems.filter((n) => group.keys.includes(n.key));
    return `
      <div class="mb-4">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1">${group.heading}</div>
        ${items.map((item) => {
          const isActive = active === item.key;
          return `<a href="${item.href}" class="flex items-center gap-2 px-3 py-2 text-sm font-medium border-l-2 ${
            isActive
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }">${item.icon} ${item.label}</a>`;
        }).join('')}
      </div>`;
  }).join('');

  const flashHtml = flash
    ? `<div class="px-6 pt-4">
        <div class="px-4 py-3 text-sm font-medium border ${
          flash.type === 'success'
            ? 'bg-green-50 border-green-300 text-green-800'
            : flash.type === 'error'
            ? 'bg-red-50 border-red-300 text-red-800'
            : 'bg-blue-50 border-blue-300 text-blue-800'
        }">${flash.message}</div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)} — Philippine Procurement System</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter','system-ui','sans-serif'] }
        }
      }
    }
  </script>
  <style>
    [x-cloak] { display: none !important; }
    body { font-family: Inter, system-ui, sans-serif; }
  </style>
</head>
<body class="bg-slate-100 text-slate-900">

  <!-- Top bar -->
  <header class="fixed top-0 left-0 right-0 h-14 bg-blue-900 flex items-center justify-between px-5 z-50 border-b-2 border-yellow-400">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-yellow-400 flex items-center justify-center shrink-0">
        <span class="text-blue-900 font-black text-xs leading-none">PH<br>GOV</span>
      </div>
      <div>
        <div class="text-white font-bold text-sm leading-tight">Philippine Government Procurement System</div>
        <div class="text-blue-300 text-xs">Republic Act No. 9184 — 2016 Revised IRR</div>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <div class="text-blue-200 text-xs">FY ${new Date().getFullYear()}</div>
      ${user ? `
      <div class="flex items-center gap-3 pl-3 border-l border-blue-700">
        <div class="text-right text-xs">
          <div class="text-white font-semibold">${escHtml(user.username)}</div>
          <div class="text-blue-300 text-xs">${escHtml(user.role)}</div>
        </div>
        <button onclick="logout()" class="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white transition">Logout</button>
      </div>
      ` : ''}
    </div>
  </header>

  <!-- Sidebar -->
  <aside class="fixed top-14 left-0 bottom-0 w-56 bg-white border-r border-slate-200 overflow-y-auto z-40">
    <nav class="pt-4 pb-8">${navHtml}</nav>
  </aside>

  <!-- Main content -->
  <main class="ml-56 mt-14 min-h-screen">
    ${flashHtml}
    ${content}
  </main>

  <script>
    async function logout() {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  </script>

</body>
</html>`;
}

/** Escape HTML special characters */
export function escHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
