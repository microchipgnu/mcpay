'use client';

import { cn } from '@/lib/utils';
import { UIMessage } from 'ai';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { Markdown } from './markdown';
import { ToolCall } from './tool-call-streaming';

interface PreviewMessageProps {
  message: UIMessage;
  isLoading: boolean;
  requiresScrollPadding?: boolean;
}

function PurePreviewMessage({
  message,
  isLoading,
  requiresScrollPadding = false,
}: PreviewMessageProps) {
  console.log("💬 PreviewMessage render - message ID:", message.id, "parts:", message.parts.length, "isLoading:", isLoading);
  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex items-start gap-4 w-full',
            message.role === 'user'
              ? 'ml-auto max-w-2xl w-fit'  // right‑align & shrink‑to‑fit
              : undefined
          )}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden ring-1 ring-border bg-background">
              <Image
                src="/MCPay-build-symbol.svg"
                alt="MCPay logo"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
          )}

          <div
            className={cn('flex flex-col gap-4', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
              'items-end': message.role === 'user',
            })}
          >
            <div
              data-testid="message-content"
              className={cn('flex flex-col gap-4', {
                'bg-muted text-primary px-3 py-2 rounded-lg':
                  message.role === 'user',
              })}
            >
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  const isStreaming = (part as { state?: string }).state === 'streaming';
                  console.log("📝 Rendering text part:", i, "text length:", part.text?.length || 0, "isStreaming:", isStreaming);
                  return (
                    <div key={i} className="relative">
                      <Markdown>{part.text}</Markdown>
                      {isStreaming && (
                        <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />
                      )}
                    </div>
                  );
                }
                if (part.type.startsWith('tool-')) {
                  console.log("🛠️ Rendering tool part:", i, "type:", part.type, "state:", (part as { state?: string }).state);
                  // render our streaming step component
                  return <ToolCall key={i} step={part as Parameters<typeof ToolCall>[0]['step']} />;
                }
                return null;
              })}
            </div>

            {isLoading && message.role === 'assistant' && (
              <div className="text-sm text-muted-foreground">Working on it…</div>
            )}
          </div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}

// Temporarily disable memoization to test
export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => (
  <motion.div
    data-testid="message-assistant-loading"
    className="w-full mx-auto max-w-3xl px-4 group/message min-h-96"
    initial={{ y: 5, opacity: 0 }}
    animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
    data-role="assistant"
  >
    <div className="flex items-center gap-4 px-3 py-2 rounded-xl bg-muted">
      <div className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden ring-1 ring-border bg-background">
        <Image
          src="/MCPay-build-symbol.svg"
          alt="MCPay logo"
          width={32}
          height={32}
          className="object-cover"
        />
      </div>
      <div className="flex-1 text-muted-foreground">Hmm…</div>
    </div>
  </motion.div>
);
