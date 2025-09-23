// app/src/components/custom-ui/messages.tsx
'use client';

import { Greeting } from '@/components/custom-ui/greeting';
import { memo } from 'react';
import { PreviewMessage, ThinkingMessage } from '@/components/custom-ui/message';
import { motion } from 'motion/react';
import { ChatStatus, UIMessage } from 'ai';

interface MessagesProps {
  status: ChatStatus;
  messages: UIMessage[];
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

function PureMessages({ status, messages, scrollContainerRef }: MessagesProps) {
  console.log("📊 Messages component render - status:", status, "message count:", messages.length);
  console.log("📊 Last message parts:", messages[messages.length - 1]?.parts?.length || 0);
  return (
    <div 
      ref={scrollContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative h-full"
    >
      {messages.length === 0 && <Greeting />}

      {messages.map((message, idx) => (
        <PreviewMessage
          key={message.id}
          message={message}
          isLoading={status === 'streaming' && idx === messages.length - 1}
          requiresScrollPadding={false}
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <motion.div className="shrink-0 min-w-[24px] min-h-[24px]" />
    </div>
  );
}

// Temporarily disable memoization to test
export const Messages = PureMessages;

// Keep the memo version commented for now
/*
export const Messages = memo(
  PureMessages,
  (prev, next) => {
    // Always re-render if status changes
    if (prev.status !== next.status) return false;
    
    // Always re-render if message count changes
    if (prev.messages.length !== next.messages.length) return false;
    
    // Check if any message content has changed (deep check for streaming updates)
    for (let i = 0; i < prev.messages.length; i++) {
      const prevMsg = prev.messages[i];
      const nextMsg = next.messages[i];
      
      // Check if message ID changed
      if (prevMsg.id !== nextMsg.id) return false;
      
      // Check if parts count changed
      if (prevMsg.parts.length !== nextMsg.parts.length) return false;
      
      // Check if any part content changed
      for (let j = 0; j < prevMsg.parts.length; j++) {
        const prevPart = prevMsg.parts[j];
        const nextPart = nextMsg.parts[j];
        
        // For text parts, check if text content or state changed
        if (prevPart.type === 'text' && nextPart.type === 'text') {
          if (prevPart.text !== nextPart.text || 
              (prevPart as any).state !== (nextPart as any).state) {
            return false;
          }
        }
        
        // For tool parts, check if state changed
        if (prevPart.type.startsWith('tool-') && nextPart.type.startsWith('tool-')) {
          if ((prevPart as any).state !== (nextPart as any).state) {
            return false;
          }
        }
      }
    }
    
    return true; // No changes detected
  }
);
*/
