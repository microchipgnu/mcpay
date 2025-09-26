'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ToolUIPart } from "ai";
import { Loader2, TriangleAlert } from 'lucide-react';
import { CheckCircleIcon } from './icons';
import { motion } from 'motion/react';
import { FC } from 'react';

interface ToolCallProps {
  step: ToolUIPart;
}

export const ToolCall: FC<ToolCallProps> = ({ step }) => {

  const isDone = step.state === "output-available";
  const isError = step.state === "output-error";

  // Turn "tool-create_session" into "Create Session"
  const label = step.type
    .replace(/^tool-/, '')
    .split('_')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <Card className="w-full rounded-sm py-4 border-0">
      <CardContent className="flex items-center gap-2 text-sm font-medium">
        {/* icon */}
        <div className="flex-shrink-0">
          {isDone ? (
            <CheckCircleIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          ) : isError ? (
            <TriangleAlert className="h-4 w-4 text-red-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </div>

        {/* label */}
        <motion.span
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          className={isDone ? 'text-muted-foreground' : 'text-foreground'}
        >
          {label}
          {isError && <span className="ml-2 text-red-500">Error</span>}
        </motion.span>
      </CardContent>
    </Card>
  );
};
