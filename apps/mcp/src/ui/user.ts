export const USER_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your Account</title>
    <meta name="color-scheme" content="light dark" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 overflow-x-hidden">
    <div class="max-w-3xl mx-auto p-4 md:p-8" style="padding-bottom: env(safe-area-inset-bottom)">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-3">
            <div id="avatar" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
              <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A9 9 0 1118.88 6.196 7 7 0 005.121 17.804z" />
              </svg>
            </div>
            <div>
              <h2 id="user-name" class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Guest</h2>
              <p id="user-email" class="text-xs sm:text-sm text-gray-600 dark:text-gray-400"></p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="signin-btn" class="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 text-sm font-medium rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-gray-200 dark:focus:ring-offset-gray-900 w-full sm:w-auto justify-center">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.606-2.665-.304-5.466-1.334-5.466-5.933 0-1.31.468-2.38 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.803 5.625-5.475 5.922.43.372.823 1.104.823 2.225 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Sign in with GitHub
            </button>
            <button id="signout-btn" class="hidden px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-700 dark:focus:ring-offset-gray-900 w-full sm:w-auto">
              Sign out
            </button>
          </div>
        </div>

        <div class="h-px bg-gray-200 dark:bg-gray-800 my-6"></div>

        <div id="auth-hint" class="text-sm text-gray-600 dark:text-gray-400">
          Please sign in to access your account dashboard.
        </div>

        <div id="tabs" class="hidden">
          <div class="overflow-x-auto -mx-2 px-2 snap-x">
            <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-sm min-w-max">
              <button data-tab="funds" class="tab-btn shrink-0 whitespace-nowrap px-3 py-2 sm:px-4 transition-colors font-medium text-gray-700 dark:text-gray-300 snap-start">Funds</button>
              <button data-tab="wallets" class="tab-btn shrink-0 whitespace-nowrap px-3 py-2 sm:px-4 transition-colors font-medium text-gray-700 dark:text-gray-300 snap-start">Wallets</button>
              <button data-tab="settings" class="tab-btn shrink-0 whitespace-nowrap px-3 py-2 sm:px-4 transition-colors font-medium text-gray-700 dark:text-gray-300 snap-start">Settings</button>
              <button data-tab="developer" class="tab-btn shrink-0 whitespace-nowrap px-3 py-2 sm:px-4 transition-colors font-medium text-gray-700 dark:text-gray-300 snap-start">Developer</button>
            </div>
          </div>

          <div class="mt-4 space-y-4">
            <section id="panel-funds" class="tab-panel">
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V4m0 12v4" />
                    </svg>
                    <h4 class="font-medium text-gray-900 dark:text-gray-100">Your Funds</h4>
                  </div>
                </div>
                <div class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">$0.00</div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">No balances found. Link a wallet to get started.</p>
              </div>
            </section>

            <section id="panel-wallets" class="tab-panel hidden">
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-medium text-gray-900 dark:text-gray-100">Connected Wallets</h4>
                  <button id="reload-wallets" class="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">Reload</button>
                </div>
                <div id="wallets-empty" class="text-sm text-gray-600 dark:text-gray-400">No wallets linked yet. Link your on-chain wallet from the app.</div>
                <div id="wallets-table-wrap" class="overflow-x-auto hidden">
                  <table class="min-w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th class="text-left font-medium px-3 py-2">Address</th>
                        <th class="text-left font-medium px-3 py-2">Provider</th>
                        <th class="text-left font-medium px-3 py-2">Type</th>
                        <th class="text-left font-medium px-3 py-2">Chain</th>
                        <th class="text-left font-medium px-3 py-2">Primary</th>
                        <th class="text-left font-medium px-3 py-2">Active</th>
                        <th class="text-left font-medium px-3 py-2">Created</th>
                        <th class="text-right font-medium px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="wallets-tbody" class="divide-y divide-gray-200 dark:divide-gray-800"></tbody>
                  </table>
                </div>
              </div>
            </section>

            <section id="panel-settings" class="tab-panel hidden">
              <div class="grid md:grid-cols-2 gap-4">
                <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A9 9 0 1118.88 6.196 7 7 0 005.121 17.804z" />
                    </svg>
                    <h4 class="font-medium text-gray-900 dark:text-gray-100">Profile</h4>
                  </div>
                  <dl class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">Name</dt><dd id="profile-name" class="font-medium text-gray-900 dark:text-gray-100 text-right break-words break-all whitespace-pre-wrap max-w-[70%] sm:max-w-none">—</dd></div>
                    <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">Email</dt><dd id="profile-email" class="font-medium text-gray-900 dark:text-gray-100 text-right break-words break-all whitespace-pre-wrap max-w-[70%] sm:max-w-none">—</dd></div>
                    <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">Email Verified</dt><dd id="profile-verified" class="font-medium text-right max-w-[70%] sm:max-w-none">—</dd></div>
                    <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">User ID</dt><dd id="profile-id" class="font-mono text-gray-900 dark:text-gray-100 text-right break-words break-all whitespace-pre-wrap max-w-[70%] sm:max-w-none">—</dd></div>
                  </dl>
                </div>
                <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v8m-4-4h8" />
                    </svg>
                    <h4 class="font-medium text-gray-900 dark:text-gray-100">Account Actions</h4>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button id="copy-id-btn" class="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 w-full sm:w-auto">Copy User ID</button>
                    <a href="/connect" class="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 w-full sm:w-auto text-center">Open Connect</a>
                  </div>
                </div>
              </div>
            </section>

            <section id="panel-developer" class="tab-panel hidden">
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                <div>
                  <h4 class="font-medium mb-1 text-gray-900 dark:text-gray-100">Developer / API Keys</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Create and manage API keys for programmatic access.</p>
                </div>

                <div id="api-key-created" class="hidden rounded-md border border-green-300 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20 p-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="text-sm font-medium text-green-800 dark:text-green-200">API key created</p>
                      <p class="text-xs text-green-700 dark:text-green-300">Copy it now — it will not be shown again.</p>
                      <code id="api-key-created-value" class="mt-1 inline-block whitespace-pre-wrap break-all text-xs bg-white/60 dark:bg-black/30 px-1.5 py-1 rounded">—</code>
                    </div>
                    <div class="shrink-0 flex gap-2">
                      <button id="api-key-created-copy" class="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700">Copy</button>
                      <button id="api-key-created-dismiss" class="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 hover:bg-green-200">Dismiss</button>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <label class="text-xs text-gray-600 dark:text-gray-400">Name
                      <input id="api-key-name" type="text" placeholder="project-api-key" class="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                    </label>
                    <label class="text-xs text-gray-600 dark:text-gray-400">Prefix
                      <input id="api-key-prefix" type="text" value="mcpay_" class="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                    </label>
                    <label class="text-xs text-gray-600 dark:text-gray-400">Expires in (days)
                      <input id="api-key-expires-days" type="number" min="1" max="365" placeholder="30" class="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                    </label>
                    <label class="text-xs text-gray-600 dark:text-gray-400">Remaining (optional)
                      <input id="api-key-remaining" type="number" min="0" placeholder="100" class="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                    </label>
                  </div>
                  <div class="mt-3 flex items-center justify-between gap-2">
                    <p class="text-xs text-gray-500 dark:text-gray-400">Keys inherit default permissions unless specified by the server.</p>
                    <button id="create-api-key-btn" class="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 text-sm font-medium rounded-md">Create API Key</button>
                  </div>
                </div>

                <div class="rounded-lg border border-gray-200 dark:border-gray-700">
                  <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h5 class="font-medium text-gray-900 dark:text-gray-100">Your API Keys</h5>
                    <button id="reload-api-keys" class="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">Reload</button>
                  </div>
                  <div id="api-keys-empty" class="p-4 text-sm text-gray-600 dark:text-gray-400">No API keys yet. Create one above.</div>
                  <div class="overflow-x-auto hidden" id="api-keys-table-wrap">
                    <table class="min-w-full text-sm">
                      <thead class="bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300">
                        <tr>
                          <th class="text-left font-medium px-3 py-2">Name</th>
                          <th class="text-left font-medium px-3 py-2">Prefix</th>
                          <th class="text-left font-medium px-3 py-2">Start</th>
                          <th class="text-left font-medium px-3 py-2">Enabled</th>
                          <th class="text-left font-medium px-3 py-2">Remaining</th>
                          <th class="text-left font-medium px-3 py-2">Expires</th>
                          <th class="text-left font-medium px-3 py-2">Created</th>
                          <th class="text-right font-medium px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody id="api-keys-tbody" class="divide-y divide-gray-200 dark:divide-gray-800"></tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>

    <script type="module">
      const callbackURL = window.location.href;
      const authBaseURL = window.location.origin + '/api/auth';

      const signinBtn = document.getElementById('signin-btn');
      const signoutBtn = document.getElementById('signout-btn');
      const authHint = document.getElementById('auth-hint');
      const tabsEl = document.getElementById('tabs');
      const userNameEl = document.getElementById('user-name');
      const userEmailEl = document.getElementById('user-email');
      const avatarEl = document.getElementById('avatar');
      const profileName = document.getElementById('profile-name');
      const profileEmail = document.getElementById('profile-email');
      const profileVerified = document.getElementById('profile-verified');
      const profileId = document.getElementById('profile-id');
      const copyIdBtn = document.getElementById('copy-id-btn');

      // API Keys UI elements
      const apiKeyCreatedBanner = document.getElementById('api-key-created');
      const apiKeyCreatedValue = document.getElementById('api-key-created-value');
      const apiKeyCreatedCopy = document.getElementById('api-key-created-copy');
      const apiKeyCreatedDismiss = document.getElementById('api-key-created-dismiss');
      const apiKeyNameInput = document.getElementById('api-key-name');
      const apiKeyPrefixInput = document.getElementById('api-key-prefix');
      const apiKeyExpiresDaysInput = document.getElementById('api-key-expires-days');
      const apiKeyRemainingInput = document.getElementById('api-key-remaining');
      const createApiKeyBtn = document.getElementById('create-api-key-btn');
      const reloadApiKeysBtn = document.getElementById('reload-api-keys');
      const apiKeysEmpty = document.getElementById('api-keys-empty');
      const apiKeysTableWrap = document.getElementById('api-keys-table-wrap');
      const apiKeysTbody = document.getElementById('api-keys-tbody');

      // Wallets UI elements
      const reloadWalletsBtn = document.getElementById('reload-wallets');
      const walletsEmpty = document.getElementById('wallets-empty');
      const walletsTableWrap = document.getElementById('wallets-table-wrap');
      const walletsTbody = document.getElementById('wallets-tbody');

      let currentUser = null;
      let apiKeysLoadedOnce = false;
      let walletsLoadedOnce = false;

      async function getAuthClient() {
        const { createAuthClient } = await import('https://esm.sh/better-auth@1.3.26/client');
        const { genericOAuthClient } = await import('https://esm.sh/better-auth@1.3.26/client/plugins');
        return createAuthClient({
          baseURL: authBaseURL,
          fetchOptions: { credentials: 'include' },
          plugins: [genericOAuthClient()],
        });
      }

      const activeTabClasses = ['bg-gray-900','text-white','dark:bg-white','dark:text-gray-900'];
      const inactiveTabClasses = ['bg-transparent','text-gray-700','dark:text-gray-300'];

      function setActiveTab(name) {
        document.querySelectorAll('.tab-btn').forEach((btn) => {
          const isActive = btn.dataset.tab === name;
          [...activeTabClasses, ...inactiveTabClasses].forEach((cls) => btn.classList.remove(cls));
          (isActive ? activeTabClasses : inactiveTabClasses).forEach((cls) => btn.classList.add(cls));
        });
        document.querySelectorAll('.tab-panel').forEach((panel) => {
          panel.classList.toggle('hidden', panel.id !== 'panel-' + name);
        });
        if (name === 'developer' && currentUser && !apiKeysLoadedOnce) {
          loadApiKeys();
        }
        if (name === 'wallets' && currentUser && !walletsLoadedOnce) {
          loadWallets();
        }
      }

      async function loadSession() {
        try {
          const res = await fetch('/api/me', { credentials: 'include' });
          if (!res.ok) return null;
          const data = await res.json();
          return data.user || null;
        } catch (err) {
          console.error('Failed to load session', err);
          return null;
        }
      }

      function fmtDate(value) {
        if (!value) return '—';
        try { return new Date(value).toLocaleString(); } catch { return String(value); }
      }

      async function apiCall(path, init = {}) {
        const res = await fetch(path, { credentials: 'include', headers: { 'content-type': 'application/json', ...(init.headers || {}) }, ...init });
        if (!res.ok) {
          let msg = 'Request failed';
          try { const j = await res.json(); msg = j.error || msg; } catch {}
          throw new Error(msg);
        }
        try { return await res.json(); } catch { return null; }
      }

      async function loadApiKeys() {
        try {
          const keys = await apiCall('/api/keys');
          apiKeysLoadedOnce = true;
          renderApiKeys(keys || []);
        } catch (err) {
          console.error('Failed to load API keys', err);
        }
      }

      async function loadWallets() {
        try {
          const wallets = await apiCall('/api/wallets');
          walletsLoadedOnce = true;
          renderWallets(wallets || []);
        } catch (err) {
          console.error('Failed to load wallets', err);
        }
      }

      function renderApiKeys(keys) {
        if (!Array.isArray(keys) || keys.length === 0) {
          apiKeysEmpty.classList.remove('hidden');
          apiKeysTableWrap.classList.add('hidden');
          apiKeysTbody.innerHTML = '';
          return;
        }
        apiKeysEmpty.classList.add('hidden');
        apiKeysTableWrap.classList.remove('hidden');
        apiKeysTbody.innerHTML = keys.map((k) => {
          const enabled = k.enabled !== false; // default true
          const remaining = k.remaining == null ? '∞' : k.remaining;
          const enabledHtml = enabled ? '<span class="text-green-700 dark:text-green-300">Yes</span>' : '<span class="text-red-700 dark:text-red-300">No</span>';
          const toggleLabel = enabled ? 'Disable' : 'Enable';
          const enabledAttr = enabled ? '1' : '0';
          return (
            '<tr>' +
            '<td class="px-3 py-2 text-gray-900 dark:text-gray-100">' + (k.name || '—') + '</td>' +
            '<td class="px-3 py-2">' + (k.prefix || '—') + '</td>' +
            '<td class="px-3 py-2">' + (k.start || '—') + '</td>' +
            '<td class="px-3 py-2">' + enabledHtml + '</td>' +
            '<td class="px-3 py-2">' + remaining + '</td>' +
            '<td class="px-3 py-2">' + fmtDate(k.expiresAt) + '</td>' +
            '<td class="px-3 py-2">' + fmtDate(k.createdAt) + '</td>' +
            '<td class="px-3 py-2 text-right">' +
              '<div class="inline-flex gap-2">' +
                '<button data-action="toggle" data-id="' + k.id + '" data-enabled="' + enabledAttr + '" class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">' + toggleLabel + '</button>' +
                '<button data-action="delete" data-id="' + k.id + '" class="px-2 py-1 text-xs rounded border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>' +
              '</div>' +
            '</td>' +
            '</tr>'
          );
        }).join('');
      }

      function fmtBool(value) {
        return value ? '<span class="text-green-700 dark:text-green-300">Yes</span>' : '<span class="text-gray-600 dark:text-gray-400">No</span>';
      }

      function shortAddress(addr) {
        if (!addr || typeof addr !== 'string') return '—';
        const a = addr.trim();
        if (a.length <= 12) return a;
        return a.slice(0, 6) + '…' + a.slice(-4);
      }

      function renderWallets(wallets) {
        if (!Array.isArray(wallets) || wallets.length === 0) {
          walletsEmpty?.classList.remove('hidden');
          walletsTableWrap?.classList.add('hidden');
          if (walletsTbody) walletsTbody.innerHTML = '';
          return;
        }
        walletsEmpty?.classList.add('hidden');
        walletsTableWrap?.classList.remove('hidden');
        if (!walletsTbody) return;
        walletsTbody.innerHTML = wallets.map((w) => {
          const createdAt = fmtDate(w.createdAt);
          const address = w.walletAddress || '—';
          const provider = w.provider || '—';
          const type = w.walletType || '—';
          const chain = w.blockchain || '—';
          const primaryHtml = fmtBool(!!w.isPrimary);
          const activeHtml = fmtBool(w.isActive !== false);
          return (
            '<tr>' +
            '<td class="px-3 py-2 text-gray-900 dark:text-gray-100 font-mono">' +
              '<span title="' + address + '">' + shortAddress(address) + '</span>' +
            '</td>' +
            '<td class="px-3 py-2">' + provider + '</td>' +
            '<td class="px-3 py-2">' + type + '</td>' +
            '<td class="px-3 py-2">' + chain + '</td>' +
            '<td class="px-3 py-2">' + primaryHtml + '</td>' +
            '<td class="px-3 py-2">' + activeHtml + '</td>' +
            '<td class="px-3 py-2">' + createdAt + '</td>' +
            '<td class="px-3 py-2 text-right">' +
              '<div class="inline-flex gap-2">' +
                '<button data-action="copy-address" data-address="' + address + '" class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">Copy</button>' +
                '<button data-action="onramp" data-address="' + address + '" class="px-2 py-1 text-xs rounded border border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20">Fund</button>' +
              '</div>' +
            '</td>' +
            '</tr>'
          );
        }).join('');
      }

      function renderUser(user) {
        if (user) {
          userNameEl.textContent = user.name || 'User';
          userEmailEl.textContent = user.email || '';
          authHint.classList.add('hidden');
          tabsEl.classList.remove('hidden');
          signinBtn.classList.add('hidden');
          signoutBtn.classList.remove('hidden');

          profileName.textContent = user.name || '—';
          profileEmail.textContent = user.email || '—';
          profileId.textContent = user.id || '—';
          const verified = user.emailVerified === true || user.emailVerified === 'true';
          profileVerified.textContent = verified ? 'Yes' : 'No';
          profileVerified.className = verified ? 'font-medium text-green-600' : 'font-medium text-gray-700 dark:text-gray-300';

          if (user.image) {
            const img = document.createElement('img');
            img.src = user.image;
            img.alt = 'Avatar';
            img.className = 'w-10 h-10 rounded-full object-cover';
            avatarEl.innerHTML = '';
            avatarEl.appendChild(img);
          }
        } else {
          userNameEl.textContent = 'Guest';
          userEmailEl.textContent = '';
          authHint.classList.remove('hidden');
          tabsEl.classList.add('hidden');
          signinBtn.classList.remove('hidden');
          signoutBtn.classList.add('hidden');
          profileName.textContent = '—';
          profileEmail.textContent = '—';
          profileVerified.textContent = '—';
          profileId.textContent = '—';
          avatarEl.innerHTML = '<svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A9 9 0 1118.88 6.196 7 7 0 005.121 17.804z" /></svg>';
        }
      }

      async function refreshUI() {
        const user = await loadSession();
        renderUser(user);
        currentUser = user;
        if (user) {
          loadApiKeys();
          loadWallets();
        }
        setActiveTab('funds');
      }

      signinBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        signinBtn.disabled = true;
        try {
          const authClient = await getAuthClient();
          await authClient.signIn.social({ provider: 'github', callbackURL });
        } catch (err) {
          console.error('Sign-in failed', err);
          alert('Failed to start sign-in. Check console for details.');
        } finally {
          signinBtn.disabled = false;
        }
      });

      signoutBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        signoutBtn.disabled = true;
        try {
          const authClient = await getAuthClient();
          await authClient.signOut();
          await refreshUI();
        } catch (err) {
          console.error('Sign-out failed', err);
          alert('Failed to sign out. Check console for details.');
        } finally {
          signoutBtn.disabled = false;
        }
      });

      document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
      });

      copyIdBtn?.addEventListener('click', async () => {
        const text = profileId?.textContent || '';
        if (!text || text === '—') return;
        try { await navigator.clipboard.writeText(text); alert('Copied User ID'); } catch {}
      });

      // API Keys: create
      createApiKeyBtn?.addEventListener('click', async () => {
        if (!currentUser) return alert('Please sign in first.');
        const name = (apiKeyNameInput?.value || '').trim();
        const prefix = (apiKeyPrefixInput?.value || '').trim();
        const expiresDaysRaw = apiKeyExpiresDaysInput?.value || '';
        const remainingRaw = apiKeyRemainingInput?.value || '';

        let body = { name, prefix };
        const expiresInDays = parseInt(expiresDaysRaw, 10);
        if (!Number.isNaN(expiresInDays) && expiresInDays > 0) {
          body.expiresInDays = expiresInDays;
        }
        const remaining = parseInt(remainingRaw, 10);
        if (!Number.isNaN(remaining) && remaining >= 0) {
          body.remaining = remaining;
        }

        createApiKeyBtn.disabled = true;
        try {
          const created = await apiCall('/api/keys', { method: 'POST', body: JSON.stringify(body) });
          if (created && created.key) {
            apiKeyCreatedValue.textContent = created.key;
            apiKeyCreatedBanner.classList.remove('hidden');
          }
          // Clear inputs and reload
          if (apiKeyNameInput) apiKeyNameInput.value = '';
          if (apiKeyExpiresDaysInput) apiKeyExpiresDaysInput.value = '';
          if (apiKeyRemainingInput) apiKeyRemainingInput.value = '';
          await loadApiKeys();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to create API key');
        } finally {
          createApiKeyBtn.disabled = false;
        }
      });

      // API Keys: created banner actions
      apiKeyCreatedCopy?.addEventListener('click', async () => {
        const value = apiKeyCreatedValue?.textContent || '';
        if (!value || value === '—') return;
        try { await navigator.clipboard.writeText(value); alert('Copied API key'); } catch {}
      });
      apiKeyCreatedDismiss?.addEventListener('click', () => {
        apiKeyCreatedBanner?.classList.add('hidden');
        apiKeyCreatedValue.textContent = '—';
      });

      // API Keys: reload
      reloadApiKeysBtn?.addEventListener('click', () => loadApiKeys());

      // Wallets: reload
      reloadWalletsBtn?.addEventListener('click', () => loadWallets());

      // Wallets: row actions via delegation
      walletsTbody?.addEventListener('click', async (e) => {
        const target = e.target;
        if (!(target && target.getAttribute)) return;
        const action = target.getAttribute('data-action');
        if (action === 'copy-address') {
          const address = target.getAttribute('data-address') || '';
          if (!address || address === '—') return;
          try { await navigator.clipboard.writeText(address); alert('Copied address'); } catch {}
        } else if (action === 'onramp') {
          if (!currentUser) return alert('Please sign in first.');
          const address = target.getAttribute('data-address') || '';
          if (!address || address === '—') return;
          try {
            const res = await apiCall('/api/onramp/url', {
              method: 'POST',
              body: JSON.stringify({ walletAddress: address }),
            });
            const url = res && res.url;
            if (typeof url === 'string' && url.startsWith('http')) {
              window.open(url, '_blank', 'noopener');
            } else {
              alert('Failed to generate onramp URL');
            }
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create onramp URL');
          }
        }
      });

      // API Keys: row actions via delegation
      apiKeysTbody?.addEventListener('click', async (e) => {
        const target = e.target;
        if (!(target && target.getAttribute)) return;
        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');
        if (!action || !id) return;
        if (action === 'delete') {
          if (!confirm('Delete this API key? This cannot be undone.')) return;
          try {
            await apiCall('/api/keys/' + id, { method: 'DELETE' });
            await loadApiKeys();
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete API key');
          }
        } else if (action === 'toggle') {
          const enabled = target.getAttribute('data-enabled') === '1';
          try {
            await apiCall('/api/keys/' + id, { method: 'PUT', body: JSON.stringify({ enabled: !enabled }) });
            await loadApiKeys();
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update API key');
          }
        }
      });

      // Seed Tailwind JIT CDN with dynamic classes used via JS
      const seed = document.createElement('div');
      seed.className = 'hidden bg-gray-900 text-white dark:bg-white dark:text-gray-900 bg-transparent text-gray-700 dark:text-gray-300 text-green-700 dark:text-green-300';
      document.body.appendChild(seed);

      refreshUI();
    </script>
  </body>
  </html>
`;

