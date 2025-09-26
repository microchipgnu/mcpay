'use client';

import type { Literal } from 'mdast';
import type { ReactNode } from 'react';

type CodeBlockNode = Literal & {
  // mdast Literal nodes have a `value: string` which is your code text
  value: string;
};

interface CodeBlockProps {
  node: CodeBlockNode;
  inline: boolean;
  className?: string;
  children: ReactNode;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose flex flex-col">
        <pre
          {...props}
          className={
            `text-sm w-full font-mono overflow-x-auto
             bg-zinc-50 dark:bg-zinc-900 p-4
             border border-zinc-200 dark:border-zinc-700
             rounded-sm dark:text-zinc-50 text-zinc-900`
          }
        >
          <code className="whitespace-pre-wrap break-words">
            {children}
          </code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        className={
          `${className ?? ''} text-sm
           bg-zinc-100 dark:bg-zinc-800
           py-0.5 px-1 rounded-md`
        }
        {...props}
      >
        {children}
      </code>
    );
  }
}