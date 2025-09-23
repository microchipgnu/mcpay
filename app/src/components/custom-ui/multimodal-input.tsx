'use client';

import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SuggestedActions } from '@/components/custom-ui/suggested-actions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { StopIcon } from './icons';
import { toast } from 'sonner';
import { ChatStatus } from 'ai';
import Link from 'next/link';

interface MultimodalInputProps {
  chatId: string;
  messagesCount: number;
  status: ChatStatus;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  isReadonly?: boolean;
  onStop?: () => void;
  onSendMessage: (text: string) => void;
  isAtBottom?: boolean;
  scrollToBottom?: () => void;
}

export function MultimodalInput({
  chatId,
  messagesCount,
  status,
  input,
  setInput,
  isReadonly = false,
  onStop,
  onSendMessage,
  isAtBottom = true,
  scrollToBottom,
}: MultimodalInputProps) {
  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput('');
  }, [input, onSendMessage, setInput]);

  // Scroll to bottom when a message is submitted
  useEffect(() => {
    if (status === 'submitted' && scrollToBottom) {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  return (
    <div className="relative w-full flex flex-col gap-4">
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute left-1/2 bottom-20 -translate-x-1/2 z-50"
          >
            <Button
              size="icon"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                scrollToBottom?.();
              }}
            >
              <ArrowDown size={16} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {messagesCount === 0 && (
        <SuggestedActions chatId={chatId} sendMessage={onSendMessage} />
      )}

      <div className="flex w-full items-end gap-2">
        <Textarea
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();

              if (status !== 'ready') {
                toast.error(
                  'Please wait for the response before sending a new message.'
                );
              } else {
                handleSubmit();
              }
            }
          }}
          className="flex-1 resize-none rounded-xl !text-base bg-muted pb-10 dark:border-zinc-700 max-h-[25vh] overflow-y-auto"
          rows={2}
        />

        {status === 'submitted' ? (
          <Button variant="secondary" onClick={onStop} title="Stop generation">
            <StopIcon size={16} />
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={!input.trim()}
            title="Send message"
            className="rounded-md h-fit border dark:border-zinc-600"
          >
            <ArrowUp size={16} />
          </Button>
        )}
      </div>

      {/* Footer text */}
      <div className="text-xs text-center uppercase font-mono text-muted-foreground mt-1 leading-tight">
        <p>
          Powered by the{' '}
          <a
            href="https://sei.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted text-primary hover:text-teal-600 transition-colors"
          >
            Fastest Layer 1 EVM Blockchain: Sei
          </a>
        </p>
        <p>
          Run the{' '}
          <Link
            href="/servers/23e2ab26-7808-4984-855c-ec6a7dc97c3a"
            className="underline decoration-dotted text-primary hover:text-teal-600 transition-colors"
          >
            MCPay Build Server
          </Link>
        </p>
      </div>

    </div>
  );
}