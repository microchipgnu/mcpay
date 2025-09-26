'use client';

import { Messages } from '@/components/custom-ui/messages';
import { MultimodalInput } from '@/components/custom-ui/multimodal-input';
import { ChatStatus, UIMessage } from 'ai';
import { useState } from 'react';

export interface ChatBodyProps {
  chatId: string;
  status: ChatStatus;
  messages: UIMessage[];
  isReadonly?: boolean;
  onSendMessage: (text: string) => void;
  onStop?: () => void;
}

export function ChatBody({
  chatId,
  status,
  messages,
  isReadonly = false,
  onSendMessage,
  onStop,
}: ChatBodyProps) {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 bg-background">
      {/* Messages list: grows and scrolls */}
      <div className="flex-1 overflow-auto h-full">
        <Messages status={status} messages={messages} />
      </div>

      {/* Input bar: always visible */}
      <form
        className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isReadonly && input.trim()) {
            onSendMessage(input);
            setInput('');
          }
        }}
      >
        <MultimodalInput
          chatId={chatId}
          messagesCount={messages.length}
          status={status}
          input={input}
          setInput={setInput}
          isReadonly={isReadonly}
          onStop={onStop}
          onSendMessage={onSendMessage}
        />
      </form>
    </div>
  );
}