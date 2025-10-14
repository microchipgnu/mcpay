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
  <body class="bg-neutral-50 dark:bg-neutral-950 min-h-screen text-neutral-900 dark:text-neutral-100 overflow-x-hidden">
    <div class="max-w-2xl mx-auto p-4 md:p-8" style="padding-bottom: env(safe-area-inset-bottom)">
      <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-3">
            <div id="avatar" class="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
              <svg class="w-5 h-5 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A9 9 0 1118.88 6.196 7 7 0 005.121 17.804z" />
              </svg>
            </div>
            <div>
              <h2 id="user-name" class="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">Guest</h2>
              <p id="user-email" class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"></p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="signin-btn" class="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 text-sm font-medium rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 dark:focus:ring-neutral-200 dark:focus:ring-offset-neutral-900 w-full sm:w-auto justify-center">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.606-2.665-.304-5.466-1.334-5.466-5.933 0-1.31.468-2.38 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.803 5.625-5.475 5.922.43.372.823 1.104.823 2.225 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Sign in with GitHub
            </button>
            <button id="signout-btn" class="hidden px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-300 dark:focus:ring-neutral-700 dark:focus:ring-offset-neutral-900 w-full sm:w-auto">
              Sign out
            </button>
          </div>
        </div>

        <div class="h-px bg-neutral-200 dark:bg-neutral-800 my-6"></div>

        <div id="auth-hint" class="text-sm text-neutral-600 dark:text-neutral-400">
          Please sign in to view your profile.
        </div>

        <div id="content" class="hidden space-y-4">
          <section class="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/50">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-4 h-4 text-neutral-700 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A9 9 0 1118.88 6.196 7 7 0 005.121 17.804z" />
              </svg>
              <h4 class="font-medium text-neutral-900 dark:text-neutral-100">Profile</h4>
            </div>
            <dl class="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
              <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">Name</dt><dd id="profile-name" class="font-medium text-neutral-900 dark:text-neutral-100 text-right break-words break-all whitespace-pre-wrap max-w-[70%] sm:max-w-none">—</dd></div>
              <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">Email</dt><dd id="profile-email" class="font-medium text-neutral-900 dark:text-neutral-100 text-right break-words break-all whitespace-pre-wrap max-w-[70%] sm:max-w-none">—</dd></div>
              <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">Email Verified</dt><dd id="profile-verified" class="font-medium text-right max-w-[70%] sm:max-w-none">—</dd></div>
            </dl>
          </section>

          <section class="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/50">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-neutral-700 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c1.657 0 3-.895 3-2s-1.343-2-3-2-3 .895-3 2 1.343 2 3 2zm0 0v4m0 4v-4" />
                </svg>
                <h4 class="font-medium text-neutral-900 dark:text-neutral-100">Primary Wallet</h4>
              </div>
              <div class="shrink-0 inline-flex gap-2">
                <button id="copy-primary-address" class="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">Copy</button>
                <button id="fund-primary-address" class="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20">Fund</button>
              </div>
            </div>
            <dl class="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
              <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">Address</dt><dd id="primary-wallet-address" class="font-mono text-neutral-900 dark:text-neutral-100 text-right break-words break-all whitespace-pre-wrap max-w-[70%] sm:max-w-none">—</dd></div>
              <div class="flex items-start justify-between gap-3 min-w-0"><dt class="shrink-0">Balance</dt><dd id="account-balance" class="font-medium text-right max-w-[70%] sm:max-w-none">—</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>

    <script type="module">
      function showToast(message, type = 'info') {
        let root = document.getElementById('toast-root');
        if (!root) {
          root = document.createElement('div');
          root.id = 'toast-root';
          root.className = 'fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none';
          document.body.appendChild(root);
        }
        const color = type === 'error' ? 'border-red-300 text-red-800 dark:border-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20' : type === 'success' ? 'border-green-300 text-green-800 dark:border-green-900/50 dark:text-green-200 bg-green-50 dark:bg-green-900/20' : 'border-neutral-300 text-neutral-800 dark:border-neutral-700 dark:text-neutral-200 bg-white/80 dark:bg-neutral-900/80 backdrop-blur';
        const el = document.createElement('div');
        el.className = 'pointer-events-auto rounded-md border ' + color + ' shadow px-3 py-2 text-sm transition-opacity duration-300 opacity-0';
        el.setAttribute('role', 'status');
        el.textContent = message;
        root.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => {
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 300);
        }, 2200);
      }
      const callbackURL = window.location.href;
      const authBaseURL = window.location.origin + '/api/auth';

      const signinBtn = document.getElementById('signin-btn');
      const signoutBtn = document.getElementById('signout-btn');
      const authHint = document.getElementById('auth-hint');
      const contentEl = document.getElementById('content');
      const userNameEl = document.getElementById('user-name');
      const userEmailEl = document.getElementById('user-email');
      const avatarEl = document.getElementById('avatar');
      const profileName = document.getElementById('profile-name');
      const profileEmail = document.getElementById('profile-email');
      const profileVerified = document.getElementById('profile-verified');
      const primaryAddressEl = document.getElementById('primary-wallet-address');
      const accountBalanceEl = document.getElementById('account-balance');
      const copyPrimaryBtn = document.getElementById('copy-primary-address');
      const fundPrimaryBtn = document.getElementById('fund-primary-address');

      let currentUser = null;

      async function getAuthClient() {
        const { createAuthClient } = await import('https://esm.sh/better-auth@1.3.26/client');
        const { genericOAuthClient } = await import('https://esm.sh/better-auth@1.3.26/client/plugins');
        return createAuthClient({
          baseURL: authBaseURL,
          fetchOptions: { credentials: 'include' },
          plugins: [genericOAuthClient()],
        });
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

      async function apiCall(path, init = {}) {
        const res = await fetch(path, { credentials: 'include', headers: { 'content-type': 'application/json', ...(init.headers || {}) }, ...init });
        if (!res.ok) {
          let msg = 'Request failed';
          try { const j = await res.json(); msg = j.error || msg; } catch {}
          throw new Error(msg);
        }
        try { return await res.json(); } catch { return null; }
      }

      function setSignedInUI(isSignedIn) {
        if (isSignedIn) {
          authHint.classList.add('hidden');
          contentEl.classList.remove('hidden');
          signinBtn.classList.add('hidden');
          signoutBtn.classList.remove('hidden');
        } else {
          authHint.classList.remove('hidden');
          contentEl.classList.add('hidden');
          signinBtn.classList.remove('hidden');
          signoutBtn.classList.add('hidden');
        }
      }

      function renderUser(user) {
        if (user) {
          userNameEl.textContent = user.name || 'User';
          userEmailEl.textContent = user.email || '';
          profileName.textContent = user.name || '—';
          profileEmail.textContent = user.email || '—';
          const verified = user.emailVerified === true || user.emailVerified === 'true';
          profileVerified.textContent = verified ? 'Yes' : 'No';
          profileVerified.className = verified ? 'font-medium text-green-600' : 'font-medium text-neutral-700 dark:text-neutral-300';
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
          profileName.textContent = '—';
          profileEmail.textContent = '—';
          profileVerified.textContent = '—';
          avatarEl.innerHTML = '<svg class="w-5 h-5 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A9 9 0 1118.88 6.196 7 7 0 005.121 17.804z" /></svg>';
        }
      }

      async function loadPrimaryWallet() {
        try {
          const wallets = await apiCall('/api/wallets');
          const list = Array.isArray(wallets) ? wallets : [];
          const primary = list.find((w) => w && (w.isPrimary === true)) || list[0];
          const address = primary?.walletAddress || '—';
          if (primaryAddressEl) primaryAddressEl.textContent = address;
          copyPrimaryBtn?.setAttribute('data-address', address);
          fundPrimaryBtn?.setAttribute('data-address', address);
        } catch (err) {
          console.error('Failed to load wallets', err);
        }
      }

      async function loadAccountBalance() {
        try {
          const summary = await apiCall('/api/balance');
          if (!accountBalanceEl) return;
          if (summary && summary.usdc) {
            accountBalanceEl.textContent = String(summary.usdc.balanceFormatted) + ' ' + String(summary.usdc.tokenSymbol);
            return;
          }
          if (summary && summary.native) {
            accountBalanceEl.textContent = String(summary.native.balanceFormatted) + ' ' + String(summary.native.nativeSymbol);
            return;
          }
          accountBalanceEl.textContent = '—';
        } catch (err) {
          if (accountBalanceEl) accountBalanceEl.textContent = '—';
          console.error('Failed to load balance', err);
        }
      }

      async function refreshUI() {
        const user = await loadSession();
        currentUser = user;
        setSignedInUI(!!user);
        renderUser(user);
        if (user) {
          await loadPrimaryWallet();
          await loadAccountBalance();
        } else {
          if (primaryAddressEl) primaryAddressEl.textContent = '—';
          if (accountBalanceEl) accountBalanceEl.textContent = '—';
        }
      }

      signinBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        signinBtn.disabled = true;
        try {
          const authClient = await getAuthClient();
          await authClient.signIn.social({ provider: 'github', callbackURL });
        } catch (err) {
          console.error('Sign-in failed', err);
          showToast('Failed to start sign-in. Check console for details.', 'error');
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
          showToast('Failed to sign out. Check console for details.', 'error');
        } finally {
          signoutBtn.disabled = false;
        }
      });

      copyPrimaryBtn?.addEventListener('click', async () => {
        const addr = copyPrimaryBtn.getAttribute('data-address') || '';
        if (!addr || addr === '—') return;
        try { await navigator.clipboard.writeText(addr); showToast('Copied address', 'success'); } catch {}
      });

      fundPrimaryBtn?.addEventListener('click', async () => {
        if (!currentUser) return alert('Please sign in first.');
        const addr = fundPrimaryBtn.getAttribute('data-address') || '';
        if (!addr || addr === '—') return;
        try {
          const res = await apiCall('/api/onramp/url', { method: 'POST', body: JSON.stringify({ walletAddress: addr }) });
          const url = res && res.url;
          if (typeof url === 'string' && url.startsWith('http')) {
            window.open(url, '_blank', 'noopener');
          } else {
            showToast('Failed to generate onramp URL', 'error');
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Failed to create onramp URL', 'error');
        }
      });

      // Seed Tailwind JIT CDN with dynamic classes used via JS
      const seed = document.createElement('div');
      seed.className = 'hidden bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 bg-transparent text-neutral-700 dark:text-neutral-300 text-green-700 dark:text-green-300';
      document.body.appendChild(seed);

      refreshUI();
    </script>
  </body>
  </html>
`;

