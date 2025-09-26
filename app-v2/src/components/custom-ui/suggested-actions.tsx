'use client';

import { motion } from "motion/react";
import { Button } from '@/components/ui/button';
import { memo } from 'react';

interface SuggestedActionsProps {
  chatId: string;
  sendMessage: (text: string) => void;
}

const suggestedActions = [
  {
    title: 'General Structure',
    label: 'Create the base structure of an MCP server',
    action: `Create the base structure of an MCP server project with one simple example tool. Include the required files, folders, and metadata so it's ready to preview, deploy, and extend.`,
  },
  {
    title: 'OpenAPI to MCP Converter',
    label: 'Auto-generate from API specs',
    action: 'Analyze the provided OpenAPI/Swagger specification and create an MCP server with individual tools for each endpoint. Each tool should wrap the corresponding API endpoint with proper parameter validation, request/response handling, and error management based on the spec definitions.',
  },
  {
    title: 'What can you do?',
    label: 'Explain your capabilities',
    action: 'What can you do?',
  },
];

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  return (
    <div
      data-testid="suggested-actions" 
      className="max-w-[480px] sm:max-w-[520px] overflow-x-auto scrollbar-hide"
    >
      <div className="flex gap-2 pb-2">
        {suggestedActions.map((item, idx) => (
          <motion.div
            key={`suggested-action-${idx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.05 * idx }}
            className="flex-shrink-0"
          >
            <Button
              variant="ghost"
              onClick={() => sendMessage(item.action)}
              className="text-left border rounded-xl px-4 py-3.5 text-sm h-auto flex flex-col gap-1 justify-start items-start w-[280px] sm:w-[320px]"
            >
              <span className="font-medium truncate w-full">{item.title}</span>
              <span className="text-muted-foreground text-xs leading-relaxed line-clamp-2 w-full text-left">
                {item.label}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prev, next) => prev.chatId === next.chatId
);
