'use client';

import { useMemo, useState } from 'react';
import { ChatBody } from '@/components/custom-ui/chat-body';
import { Button } from '@/components/ui/button';
import { ChatStatus, UIMessage } from 'ai';
import { McpPreview } from './mcp-preview';
import { CodebasePreview } from './code-preview';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ExternalLink, Loader2, XCircle, Copy, Check } from 'lucide-react';
import { api } from '@/lib/client/utils';
import { useSession } from '@/lib/client/auth';

export interface ChatWithPreviewProps {
  id: string;
  messages: UIMessage[];
  status: ChatStatus;
  isReadonly?: boolean;
  onSendMessage: (text: string) => void;
  onStop?: () => void;
  previewUrl?: string | null;
  userWalletAddress?: string;
  codebase?: string;
}

export default function ChatWithPreview({
  id,
  messages,
  status,
  isReadonly = false,
  onSendMessage,
  onStop,
  previewUrl = 'https://vercel-mcp-handler-mcpay.vercel.app/mcp',
  userWalletAddress = '0x0000000000000000000000000000000000000000',
  codebase = '',
}: ChatWithPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [vercelUrl, setVercelUrl] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const { data: session } = useSession();
  type DeployStepStatus = 'pending' | 'active' | 'success' | 'error';
  type DeployStep = { key: string; label: string; status: DeployStepStatus };
  const [steps, setSteps] = useState<DeployStep[]>([ 
    { key: 'prepare', label: 'Prepare codebase', status: 'pending' },
    { key: 'create_repo', label: 'Create GitHub repository', status: 'pending' },
    { key: 'commit_files', label: 'Commit project files', status: 'pending' },
    { key: 'create_vercel_link', label: 'Create Vercel import link', status: 'pending' },
    { key: 'redirect', label: 'Redirect to Vercel', status: 'pending' },
  ]);

  const completedCount = useMemo(() => steps.filter(s => s.status === 'success').length, [steps]);
  const totalCount = steps.length;
  const progressValue = Math.round((completedCount / totalCount) * 100);
  // Infer required env keys from provided codebase (.env, .env.example, env.example)
  type CodebaseFileEntry = { content: string; lastModified?: number; size?: number; lastModifiedISO?: string };
  type CodebasePayload = { files: Record<string, CodebaseFileEntry> };

  function extractEnvKeysFromContent(content: string): string[] {
    const keys = new Set<string>();
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (match && match[1]) keys.add(match[1]);
    }
    return Array.from(keys);
  }

  const requiredEnvKeys = useMemo(() => {
    // Always require MCPAY essentials
    const mustHave = ['MCPAY_API_KEY', 'MCPAY_API_URL'];
    try {
      if (!codebase) return mustHave;
      const parsed = JSON.parse(codebase) as CodebasePayload;
      const files = parsed?.files || {};
      const candidates = Object.keys(files).filter((p) => {
        const name = p.split('/').pop() || p;
        // common env filenames
        return (
          name === '.env' ||
          name === '.env.example' ||
          name === 'env.example' ||
          name === 'env' ||
          /^\.env\./.test(name) // .env.local, .env.production, etc.
        );
      });

      const discoveredKeys = new Set<string>();
      for (const filePath of candidates) {
        const content = files[filePath]?.content || '';
        for (const k of extractEnvKeysFromContent(content)) discoveredKeys.add(k);
      }

      const deduped = Array.from(discoveredKeys);
      // Merge discovered keys with required MCPAY keys (MCPAY first for UX)
      const merged = Array.from(new Set<string>([...mustHave, ...deduped]));
      return merged;
    } catch (_err) {
      return mustHave;
    }
  }, [codebase]);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [envCopied, setEnvCopied] = useState<Record<string, boolean>>({});
  const allEnvCopied = requiredEnvKeys.every((k) => envCopied[k]);

  function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    // btoa returns base64; convert to base64url by replacing chars and trimming '='
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function generateClientApiKey(prefix: string = 'mcpay'): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `${prefix}_${toBase64Url(bytes)}`;
  }

  function deriveApiUrl(): string {
    // Always use current website origin for MCPAY_API_URL
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }

  async function copyEnvValue(name: string) {
    const value = envValues[name] || '';
    try {
      await navigator.clipboard.writeText(value);
      setEnvCopied((prev) => ({ ...prev, [name]: true }));
    } catch (_) {
      // Silently ignore copy errors
    }
  }

  function setStepStatus(key: string, status: DeployStepStatus) {
    setSteps(prev => prev.map(s => (s.key === key ? { ...s, status } : s)));
  }

  async function handleDeploy() {
    setIsDeployOpen(true);
    setDeployError(null);
    setVercelUrl(null);
    setRepoUrl(null);
    // Prepare env values for the user to copy in Vercel
    const preparedEnv: Record<string, string> = {};
    // Provide sensible defaults for known keys
    for (const key of requiredEnvKeys) {
      if (key === 'MCPAY_API_KEY') preparedEnv[key] = generateClientApiKey();
      else if (key === 'MCPAY_API_URL') preparedEnv[key] = deriveApiUrl();
      else preparedEnv[key] = '';
    }

    // If user is authenticated, create a real API key via our API
    try {
      if (session?.user?.id && requiredEnvKeys.includes('MCPAY_API_KEY')) {
        const resp = await api.createApiKey(session.user.id, {
          name: 'Deploy Button Key',
          permissions: ['read', 'write', 'execute'],
        });
        if (resp && typeof resp === 'object' && 'apiKey' in resp && resp.apiKey) {
          preparedEnv.MCPAY_API_KEY = resp.apiKey as string;
        }
      }
    } catch (_) {
      // Fallback to generated client key if API call fails
    }
    setEnvValues(preparedEnv);
    setEnvCopied(Object.fromEntries(requiredEnvKeys.map((k) => [k, false])) as Record<string, boolean>);
    // Reset steps
    setSteps([
      { key: 'prepare', label: 'Prepare codebase', status: 'active' },
      { key: 'create_repo', label: 'Create GitHub repository', status: 'pending' },
      { key: 'commit_files', label: 'Commit project files', status: 'pending' },
      { key: 'create_vercel_link', label: 'Create Vercel import link', status: 'pending' },
      { key: 'redirect', label: 'Open Vercel (after copying envs)', status: 'pending' },
    ]);

    try {
      if (!codebase) {
        throw new Error('No codebase to deploy yet.');
      }
      // Prepare step done
      setStepStatus('prepare', 'success');
      setStepStatus('create_repo', 'active');

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codebase,
          repoName: 'mcpay-app',
          isPrivate: true,
          // Always include MCPAY essentials in the env list sent to the deploy system
          env: Array.from(new Set([...requiredEnvKeys, 'MCPAY_API_KEY', 'MCPAY_API_URL'])),
          projectName: 'mcpay-app',
          redirectPath: '/build?deployed=1'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start deploy');

      // Repo creation + commits assumed complete on successful response
      setStepStatus('create_repo', 'success');
      setStepStatus('commit_files', 'success');
      setStepStatus('create_vercel_link', 'active');

      if (data?.repositoryUrl) setRepoUrl(data.repositoryUrl as string);
      if (data?.vercelDeployUrl) setVercelUrl(data.vercelDeployUrl as string);

      setStepStatus('create_vercel_link', 'success');
      // Wait for user to copy envs before enabling the Vercel button
      setStepStatus('redirect', 'active');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Deployment failed';
      setDeployError(message);
      // Mark the first active step as error
      setSteps(prev => {
        const idx = prev.findIndex(s => s.status === 'active');
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status: 'error' };
          return copy;
        }
        return prev;
      });
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0">
        {/* Chat pane */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatBody
            chatId={id}
            status={status}
            messages={messages}
            isReadonly={isReadonly}
            onSendMessage={onSendMessage}
            onStop={onStop}
          />
        </div>

        {/* Preview/Code pane */}
        <div className="hidden md:flex flex-col w-2/3 border-l border-gray-200 bg-background">
          {/* Navbar: Tabs and Deploy button */}
          <div className="flex items-center justify-between p-2 border-b border-muted-background">
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className={`px-2 cursor-pointer rounded-sm transition-opacity ${
                  activeTab === 'preview' ? 'opacity-100 bg-accent' : 'opacity-50'
                }`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`px-2 cursor-pointer rounded-sm transition-opacity ${
                  activeTab === 'code' ? 'opacity-100 bg-accent' : 'opacity-50'
                }`}
                onClick={() => setActiveTab('code')}
              >
                Code
              </Button>
            </div>
            <Button
              variant="default"
              className="cursor-pointer rounded-sm"
              size="sm"
              onClick={handleDeploy}
            >
              Deploy
            </Button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'preview' ? (
              previewUrl ? (
                <McpPreview url={previewUrl} userWalletAddress={userWalletAddress} />
              ) : (
                <div className="p-4 text-center text-muted-foreground/80">
                  No preview available. Try creating an MCP Server.
                </div>
              )
            ) : codebase ? (
              <CodebasePreview sessionData={codebase} />
            ) : (
              <div className="p-4 text-center text-muted-foreground/80">
                No code available.
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog open={isDeployOpen} onOpenChange={setIsDeployOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploying your project</DialogTitle>
            <DialogDescription>
              We’ll create a GitHub repository, commit your code, and send you to Vercel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Progress value={progressValue} />
            <ul className="space-y-2">
              {steps.map((step) => (
                <li key={step.key} className="flex items-center gap-2">
                  {step.status === 'success' && <CheckCircle2 className="text-green-600" />}
                  {step.status === 'active' && <Loader2 className="animate-spin text-primary" />}
                  {step.status === 'error' && <XCircle className="text-red-600" />}
                  {step.status === 'pending' && <div className="size-4 rounded-full border border-muted-foreground/40" />}
                  <span className="text-sm">{step.label}</span>
                </li>
              ))}
            </ul>
            {/* Env values section */}
            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium">Add these Environment Variables in Vercel</div>
              <div className="space-y-2">
                {requiredEnvKeys.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-48 text-xs text-muted-foreground">{key}</div>
                    <div className="flex-1">
                      <div className="text-xs break-all rounded bg-muted px-2 py-1">
                        {envValues[key] || ''}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={envCopied[key] ? 'secondary' : 'default'}
                      className="h-7"
                      onClick={() => copyEnvValue(key)}
                    >
                      {envCopied[key] ? (
                        <span className="inline-flex items-center gap-1"><Check className="size-3" /> Copied</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Copy className="size-3" /> Copy</span>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            {repoUrl && (
              <div className="text-sm">
                Repository: <a href={repoUrl} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">Open <ExternalLink className="size-3" /></a>
              </div>
            )}
            {deployError && (
              <div className="text-sm text-red-600">{deployError}</div>
            )}
          </div>
          <DialogFooter>
            {vercelUrl ? (
              <Button disabled={!allEnvCopied} onClick={() => window.open(vercelUrl as string, '_blank', 'noopener,noreferrer')}>
                Continue to Vercel
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setIsDeployOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}