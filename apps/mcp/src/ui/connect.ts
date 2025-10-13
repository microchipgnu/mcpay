export const CONNECT_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign In</title>
    <meta name="color-scheme" content="light dark" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-neutral-50 dark:bg-neutral-950 min-h-screen text-neutral-900 dark:text-neutral-100 overflow-x-hidden flex items-center justify-center">
    <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg rounded-xl px-8 py-10 w-full max-w-md flex flex-col items-center">
      <svg class="w-12 h-12 mb-4 text-neutral-800 dark:text-neutral-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="#f3f4f6"/>
        <path d="M8 12l2 2 4-4" stroke="#6d28d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h1 class="text-2xl font-bold mb-2 text-neutral-900 dark:text-neutral-100">Sign In</h1>
      <p class="text-neutral-600 dark:text-neutral-400 mb-6 text-center">Please sign in to authorize the application.</p>
      <button
        id="gh"
        class="flex items-center gap-2 px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 text-sm font-medium rounded-lg shadow transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 dark:focus:ring-neutral-200 dark:focus:ring-offset-neutral-900"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.606-2.665-.304-5.466-1.334-5.466-5.933 0-1.31.468-2.38 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.803 5.625-5.475 5.922.43.372.823 1.104.823 2.225 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z"
          />
        </svg>
        Sign in with GitHub
      </button>
    </div>
    <!-- Toast container -->
    <div id="toast-root" class="fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"></div>
    <script type="module">
      const callbackURL = window.location.href;
      const authBaseURL = window.location.origin + '/api/auth';
      function showToast(message, type = 'info') {
        const root = document.getElementById('toast-root');
        if (!root) return alert(message);
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
      async function startSignIn() {
        try {
          const { createAuthClient } = await import('https://esm.sh/better-auth@1.3.26/client');
          const { genericOAuthClient } = await import('https://esm.sh/better-auth@1.3.26/client/plugins');
          const authClient = createAuthClient({
            baseURL: authBaseURL,
            fetchOptions: { credentials: 'include' },
            plugins: [genericOAuthClient()],
          });
          await authClient.signIn.social({ provider: 'github', callbackURL });
        } catch (err) {
          console.error('Sign-in failed', err);
          showToast('Failed to start sign-in. Check console for details.', 'error');
        }
      }
      document.getElementById('gh')?.addEventListener('click', (e) => {
        e.preventDefault();
        startSignIn();
      });
    </script>
  </body>
</html>
`