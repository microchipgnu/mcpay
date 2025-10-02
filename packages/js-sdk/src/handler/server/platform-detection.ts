
export type HostingPlatform =
  | 'Vercel' | 'Netlify' | 'Cloudflare Pages' | 'Cloudflare Workers'
  | 'Railway' | 'Render' | 'Heroku' | 'Fly.io'
  | 'AWS Lambda' | 'AWS Elastic Beanstalk' | 'AWS Amplify' | 'Azure Functions'
  | 'GCP Cloud Functions' | 'GCP Cloud Run'
  | 'Deno Deploy' | 'Supabase Edge Functions' | 'Bun.sh'
  | 'GitHub Pages' | 'GitLab Pages' | 'DigitalOcean App'
  | 'Kubernetes' | 'Docker' | 'Edge Runtime'
  | 'Bare‑metal' | 'Unknown';

export type RuntimeEnvironment = 
  | 'Node.js' | 'Bun' | 'Deno' | 'Edge' | 'Unknown';

export interface RuntimeInfo {
  name: RuntimeEnvironment;
  version?: string;
  isEdge: boolean;
}

interface PlatformSignature {
  platform: HostingPlatform;
  // At least one var that uniquely identifies this platform
  signatureVars: readonly string[];
  // Optional additional detection logic
  detect?: (env: NodeJS.ProcessEnv) => boolean;
  // Optional URL builder: (env, port) → public URL
  url: (env: NodeJS.ProcessEnv, port: number) => string | undefined;
  // Priority for detection order (higher = checked first)
  priority?: number;
}

export interface PlatformInfo {
  platform: HostingPlatform;
  runtime: RuntimeInfo;
  signatureEnv: Record<string, string>;
  urls: string[];
  isEdgeRuntime: boolean;
  isContainer: boolean;
  isCloudVM: boolean;
}

function detectRuntime(): RuntimeInfo {
  // Check for Edge Runtime first
  if (typeof globalThis !== 'undefined') {
    const edgeRuntime = (globalThis as unknown as { EdgeRuntime?: string }).EdgeRuntime;
    if (typeof edgeRuntime === 'string') {
      return {
        name: 'Edge',
        version: edgeRuntime,
        isEdge: true
      };
    }
  }

  // Check for specific runtimes
  if (typeof process !== 'undefined' && process.versions) {
    // Deno check
    const denoGlobal = (globalThis as unknown as { Deno?: { version?: { deno?: string } } }).Deno;
    if (denoGlobal) {
      return {
        name: 'Deno',
        version: denoGlobal.version?.deno,
        isEdge: false
      };
    }

    // Bun check
    const versions = process.versions as NodeJS.ProcessVersions & { bun?: string };
    if ('bun' in versions && versions.bun) {
      return {
        name: 'Bun',
        version: versions.bun,
        isEdge: false
      };
    }

    // Node.js check
    if (versions.node) {
      return {
        name: 'Node.js',
        version: versions.node,
        isEdge: false
      };
    }
  }

  // Fallback: check for other edge indicators
  const hasWebStreams = typeof ReadableStream !== 'undefined' && 
                        typeof WritableStream !== 'undefined';
  const hasServiceWorkerGlobals = typeof Request !== 'undefined' && 
                                  typeof Response !== 'undefined' && 
                                  typeof fetch !== 'undefined';
  
  if (hasWebStreams && hasServiceWorkerGlobals && typeof process === 'undefined') {
    return {
      name: 'Edge',
      isEdge: true
    };
  }

  return {
    name: 'Unknown',
    isEdge: false
  };
}

const SIGNATURES: readonly PlatformSignature[] = [
  // Vercel - highest priority for Vercel-specific detection
  {
    platform: 'Vercel' as const,
    signatureVars: ['VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_REGION', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL'],
    url: (env: NodeJS.ProcessEnv) => {
      // Check if running on Vercel
      const isVercel = env.VERCEL === "1";
      
      if (!isVercel) {
        return undefined;
      }

      // Vercel environment
      const vercelEnv = env.VERCEL_ENV;

      // For preview deployments, use the branch URL if available
      if (vercelEnv === "preview") {
        const branchUrl = env.VERCEL_BRANCH_URL;
        if (branchUrl) {
          return `https://${branchUrl}`;
        }
        // Fallback to the general deployment URL
        return env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;
      }

      // For production, use the production URL if available
      if (vercelEnv === "production") {
        const productionUrl = env.VERCEL_PROJECT_PRODUCTION_URL;
        if (productionUrl) {
          return `https://${productionUrl}`;
        }
        // Fallback to the general deployment URL
        return env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;
      }

      // Default fallback for other environments
      return env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;
    },
    priority: 100
  },
  
  // Edge Runtime - detect if running in edge environment
  {
    platform: 'Edge Runtime' as const,
    signatureVars: [],
    detect: () => {
      const runtime = detectRuntime();
      return runtime.isEdge && runtime.name === 'Edge';
    },
    url: () => undefined,
    priority: 95
  },

  // Netlify
  {
    platform: 'Netlify' as const,
    signatureVars: ['NETLIFY', 'NETLIFY_ENV', 'DEPLOY_URL', 'URL', 'SITE_NAME'],
    url: (env: NodeJS.ProcessEnv) => env.NETLIFY_URL ?? env.DEPLOY_URL ?? env.URL,
    priority: 90
  },

  // Cloudflare
  {
    platform: 'Cloudflare Pages' as const,
    signatureVars: ['CF_PAGES', 'CF_PAGES_URL', 'CF_PAGES_BRANCH'],
    url: (env: NodeJS.ProcessEnv) => env.CF_PAGES_URL,
    priority: 90
  },
  {
    platform: 'Cloudflare Workers' as const,
    signatureVars: ['CF_WORKER', 'CLOUDFLARE_WORKER'],
    detect: (env: NodeJS.ProcessEnv) => {
      // Additional heuristics for Workers
      return Boolean(env.CF_WORKER || env.CLOUDFLARE_WORKER || 
        (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Cloudflare-Workers')));
    },
    url: () => undefined,
    priority: 85
  },

  // Deno Deploy
  {
    platform: 'Deno Deploy' as const,
    signatureVars: ['DENO_DEPLOYMENT_ID', 'DENO_REGION'],
    detect: () => {
      const runtime = detectRuntime();
      return runtime.name === 'Deno' && Boolean(process.env.DENO_DEPLOYMENT_ID);
    },
    url: () => undefined,
    priority: 85
  },

  // Supabase Edge Functions
  {
    platform: 'Supabase Edge Functions' as const,
    signatureVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    detect: (env: NodeJS.ProcessEnv) => Boolean(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY)),
    url: (env: NodeJS.ProcessEnv) => env.SUPABASE_URL,
    priority: 80
  },

  // AWS
  {
    platform: 'AWS Lambda' as const,
    signatureVars: ['AWS_LAMBDA_FUNCTION_NAME', 'AWS_EXECUTION_ENV', 'LAMBDA_TASK_ROOT'],
    url: () => undefined,
    priority: 80
  },
  {
    platform: 'AWS Amplify' as const,
    signatureVars: ['AWS_APP_ID', 'AWS_BRANCH', 'AWS_CLONE_URL'],
    url: (env: NodeJS.ProcessEnv) => env.AWS_CLONE_URL,
    priority: 75
  },
  {
    platform: 'AWS Elastic Beanstalk' as const,
    signatureVars: ['EB_ENVIRONMENT_NAME'],
    url: () => undefined,
    priority: 70
  },

  // Railway
  {
    platform: 'Railway' as const,
    signatureVars: ['RAILWAY_ENVIRONMENT', 'RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_PROJECT_ID'],
    url: (env: NodeJS.ProcessEnv) => env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : undefined,
    priority: 75
  },

  // Render
  {
    platform: 'Render' as const,
    signatureVars: ['RENDER', 'RENDER_EXTERNAL_URL', 'RENDER_SERVICE_ID'],
    url: (env: NodeJS.ProcessEnv) => env.RENDER_EXTERNAL_URL,
    priority: 75
  },

  // Heroku
  {
    platform: 'Heroku' as const,
    signatureVars: ['HEROKU_APP_NAME', 'DYNO', 'HEROKU_DYNO_ID'],
    url: (env: NodeJS.ProcessEnv) => env.HEROKU_APP_NAME ? `https://${env.HEROKU_APP_NAME}.herokuapp.com` : undefined,
    priority: 75
  },

  // Fly.io
  {
    platform: 'Fly.io' as const,
    signatureVars: ['FLY_APP_NAME', 'FLY_REGION'],
    url: (env: NodeJS.ProcessEnv) => env.FLY_APP_NAME ? `https://${env.FLY_APP_NAME}.fly.dev` : undefined,
    priority: 75
  },

  // DigitalOcean
  {
    platform: 'DigitalOcean App' as const,
    signatureVars: ['DO_APP_NAME', 'DO_DEPLOYMENT_ID', 'DIGITALOCEAN_APP_NAME'],
    url: () => undefined,
    priority: 70
  },

  // GitHub/GitLab Pages
  {
    platform: 'GitHub Pages' as const,
    signatureVars: ['GITHUB_PAGES', 'GITHUB_REPOSITORY'],
    detect: (env: NodeJS.ProcessEnv) => Boolean(env.GITHUB_PAGES || (env.GITHUB_REPOSITORY && env.GITHUB_ACTIONS)),
    url: (env: NodeJS.ProcessEnv) => {
      if (env.GITHUB_REPOSITORY) {
        const [owner, repo] = env.GITHUB_REPOSITORY.split('/');
        return `https://${owner}.github.io/${repo}`;
      }
      return undefined;
    },
    priority: 60
  },
  {
    platform: 'GitLab Pages' as const,
    signatureVars: ['GITLAB_CI', 'CI_PAGES_URL'],
    detect: (env: NodeJS.ProcessEnv) => Boolean(env.GITLAB_CI && env.CI_PAGES_URL),
    url: (env: NodeJS.ProcessEnv) => env.CI_PAGES_URL,
    priority: 60
  },

  // Azure
  {
    platform: 'Azure Functions' as const,
    signatureVars: ['FUNCTIONS_WORKER_RUNTIME', 'WEBSITE_SITE_NAME', 'AZURE_FUNCTIONS_ENVIRONMENT'],
    url: (env: NodeJS.ProcessEnv) => env.WEBSITE_SITE_NAME ? `https://${env.WEBSITE_SITE_NAME}.azurewebsites.net` : undefined,
    priority: 70
  },

  // GCP
  {
    platform: 'GCP Cloud Functions' as const,
    signatureVars: ['FUNCTION_SIGNATURE_TYPE', 'K_SERVICE', 'FUNCTION_TARGET', 'GCP_PROJECT'],
    url: () => undefined,
    priority: 70
  },
  {
    platform: 'GCP Cloud Run' as const,
    signatureVars: ['K_REVISION', 'CLOUD_RUN_JOB', 'K_CONFIGURATION'],
    url: () => undefined,
    priority: 70
  },

  // Kubernetes
  {
    platform: 'Kubernetes' as const,
    signatureVars: ['KUBERNETES_SERVICE_HOST', 'KUBERNETES_PORT', 'KUBERNETES_PORT_443_TCP'],
    url: () => undefined,
    priority: 50
  },

  // Bun.sh (if it becomes a hosting platform)
  {
    platform: 'Bun.sh' as const,
    signatureVars: ['BUN_ENV', 'BUN_DEPLOYMENT_ID'],
    detect: () => {
      const runtime = detectRuntime();
      return runtime.name === 'Bun' && Boolean(process.env.BUN_DEPLOYMENT_ID);
    },
    url: () => undefined,
    priority: 75
  },
].sort((a, b) => (b.priority || 0) - (a.priority || 0));

async function tryReadCgroup(): Promise<string | null> {
  if (typeof process === 'undefined' || !process.versions?.node) return null;
  try {
    // Lazy import avoids breaking non‑Node runtimes like Workers / Deno
    const mod = await import('node:fs/promises');
    return await mod.readFile('/proc/1/cgroup', 'utf8');
  } catch {
    return null;
  }
}

function hasFetch(): boolean {
  return typeof fetch === 'function';
}

function isEdgeRuntime(): boolean {
  const runtime = detectRuntime();
  return runtime.isEdge;
}

// Enhanced container detection
async function detectContainer(): Promise<boolean> {
  const cgroup = await tryReadCgroup();
  if (cgroup) {
    // More comprehensive container detection
    return /docker|kubepods|containerd|lxc|garden|podman/.test(cgroup);
  }
  
  // Additional container indicators
  if (typeof process !== 'undefined') {
    return Boolean(
      process.env.DOCKER_CONTAINER ||
      process.env.KUBERNETES_SERVICE_HOST ||
      process.env.container ||
      process.env.CONTAINER_NAME
    );
  }
  
  return false;
}

// Cache for platform detection to avoid repeated expensive operations
const detectionCache = new Map<string, HostingPlatform>();
const cacheTimeout = 60000; // 1 minute
let lastCacheTime = 0;

export async function detectPlatform(env: NodeJS.ProcessEnv = process.env): Promise<HostingPlatform> {
  // Check cache first
  const cacheKey = JSON.stringify(env);
  const now = Date.now();
  
  if (detectionCache.has(cacheKey) && (now - lastCacheTime) < cacheTimeout) {
    return detectionCache.get(cacheKey)!;
  }

  let detectedPlatform: HostingPlatform = 'Unknown';

  // 1. Signature-based detection (ordered by priority)
  for (const sig of SIGNATURES) {
    // Check environment variables
    const hasEnvVar = sig.signatureVars.some((v) => v in env);
    
    // Check custom detection logic
    const hasCustomDetection = sig.detect ? sig.detect(env) : false;
    
    if (hasEnvVar || hasCustomDetection) {
      detectedPlatform = sig.platform;
      break;
    }
  }

  // 2. Container runtime heuristics (if not already detected)
  if (detectedPlatform === 'Unknown') {
    const isContainer = await detectContainer();
    if (isContainer) {
      detectedPlatform = 'Docker';
    }
  }

  // 3. Cloud VM detection via metadata API (skip if no fetch or already detected)
  if (detectedPlatform === 'Unknown' && hasFetch()) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 500); // Increased timeout slightly
      
      const res = await fetch('http://169.254.169.254/latest/meta-data/', { 
        signal: controller.signal 
      });
      
      if (res.ok) {
        detectedPlatform = 'Bare‑metal';
      }
    } catch {
      // Ignore failures - this is just a heuristic
    }
  }

  // Cache the result
  detectionCache.set(cacheKey, detectedPlatform);
  lastCacheTime = now;

  return detectedPlatform;
}

export function generatePotentialUrls(env: NodeJS.ProcessEnv = process.env): string[] {
  const urls = new Set<string>();
  const defaultPort = 3000;
  
  // Get URLs from platform signatures
  for (const sig of SIGNATURES) {
    const url = sig.url(env, defaultPort);
    if (url) urls.add(url);
  }
  
  // Additional URL sources
  const additionalUrls = [
    env.PUBLIC_URL,
    env.SITE_URL,
    env.BASE_URL,
    env.APP_URL,
    env.FRONTEND_URL
  ].filter(Boolean);
  
  additionalUrls.forEach(url => urls.add(url!));
  
  // Platform-specific URL generation
  if (env.FLY_APP_NAME) urls.add(`https://${env.FLY_APP_NAME}.fly.dev`);
  if (env.RAILWAY_PUBLIC_DOMAIN) urls.add(`https://${env.RAILWAY_PUBLIC_DOMAIN}`);
  if (env.RENDER_EXTERNAL_URL) urls.add(env.RENDER_EXTERNAL_URL);
  
  // Fallback URLs
  if (urls.size === 0) {
    urls.add(`http://localhost:${defaultPort}`);
    urls.add(`http://127.0.0.1:${defaultPort}`);
  }
  
  return [...urls];
}

export async function gatherPlatformInfo(env: NodeJS.ProcessEnv = process.env): Promise<PlatformInfo> {
  const [platform, isContainer, runtime] = await Promise.all([
    detectPlatform(env),
    detectContainer(),
    Promise.resolve(detectRuntime())
  ]);
  
  const urls = generatePotentialUrls(env);
  const isEdge = isEdgeRuntime();

  const match = SIGNATURES.find((s) => s.platform === platform);
  const signatureEnv: Record<string, string> = {};
  
  if (match) {
    for (const key of match.signatureVars) {
      if (env[key]) {
        signatureEnv[key] = env[key]!;
      }
    }
  }

  // Detect if running on cloud VM (simplified heuristic)
  const isCloudVM = platform === 'Bare‑metal' || Boolean(
    env.AWS_INSTANCE_METADATA_DISABLED === 'false' ||
    env.GOOGLE_CLOUD_PROJECT ||
    env.AZURE_SUBSCRIPTION_ID
  );

  return { 
    platform, 
    runtime,
    signatureEnv, 
    urls,
    isEdgeRuntime: isEdge,
    isContainer,
    isCloudVM
  };
}
    
/**
 * Check if the current environment is a specific platform
 */
export async function isPlatform(targetPlatform: HostingPlatform, env?: NodeJS.ProcessEnv): Promise<boolean> {
  const platform = await detectPlatform(env);
  return platform === targetPlatform;
}

/**
 * Get a summary of the current runtime environment
 */
export function getRuntimeSummary(): string {
  const runtime = detectRuntime();
  const parts: string[] = [runtime.name];
  
  if (runtime.version) {
    parts.push(`v${runtime.version}`);
  }
  
  if (runtime.isEdge) {
    parts.push('(Edge)');
  }
  
  return parts.join(' ');
}

/**
 * Clear the platform detection cache (useful for testing)
 */
export function clearDetectionCache(): void {
  detectionCache.clear();
  lastCacheTime = 0;
}