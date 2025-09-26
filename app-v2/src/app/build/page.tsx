'use client';

import ChatWithPreview from '@/components/custom-ui/chat-with-preview';
import { useChat } from '@ai-sdk/react';
import { Suspense, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { MonitorSmartphone } from 'lucide-react';

export default function BuildPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mcpUrl, setMcpUrl] = useState<string | null>(null);
  const [codebase, setCodebase] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getSessionData = useCallback(() => ({
    sessionId,
    mcpUrl,
  }), [sessionId, mcpUrl]);

  const { sendMessage, messages, stop, status } = useChat({
    onToolCall: (toolCall) => {
      console.log('Tool call:', toolCall);
    },
    onData: (data) => {
      console.log('📦 onData received:', data.type, data);
      if (data.type === 'data-payment' && data.data) {
        const paymentData = data.data as { paid?: boolean };
        if (paymentData.paid) {
          toast.success('Payment successful');
        }
      }
      if (data.type === 'data-session' && data.data) {
        const sessionData = data.data as { sessionId?: string };
        if (sessionData.sessionId) setSessionId(sessionData.sessionId);
      }
      if (data.type === 'data-preview' && data.data) {
        const previewData = data.data as { url?: string };
        if (previewData.url) setMcpUrl(`${previewData.url}/mcp`);
      }
      if (data.type === 'data-codebase' && data.data) {
        const codebaseData = data.data as { codebase?: string };
        if (codebaseData.codebase) setCodebase(codebaseData.codebase);
      }
    },
    onFinish: (message) => {
      console.log('Chat finished:', { message });
    },
  });

  const _sendMessage = (text: string) => {
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: text }]
    }, {
      body: {
        sessionId: sessionId,
      }
    });
  }

  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-full text-center p-4">
        <div className="space-y-4 text-muted-foreground flex flex-col items-center">
          <MonitorSmartphone className="w-8 h-8 text-muted-foreground/60 mb-6" />
          <p className="text-lg font-semibold text-foreground font-mono uppercase mb-1">
            Desktop only [for now]
          </p>
          <p className="text-md text-muted-foreground font-mono">
            Please open this page on a larger screen. Mobile support is coming soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <ChatWithPreview
        id="main-chat"
        codebase={codebase || ''}
        messages={messages}
        previewUrl={mcpUrl}
        status={status}
        isReadonly={false}
        onSendMessage={(text) => {
          console.log('sendMessage with session:', getSessionData());
          _sendMessage(text);
        }}
        onStop={stop}
      />
    </Suspense>
  );
}
