'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

type ScrollFlag = ScrollBehavior | false;

/**
 * Tracks whether user is scrolled to the bottom of a container (via viewport enter/leave)
 * and provides a method to programmatically scroll to the bottom.
 */
export function useScrollToBottom() {
  // Reference for the scrollable messages container (if needed)
  const containerRef = useRef<HTMLDivElement>(null);
  // Reference for the bottom anchor
  const endRef = useRef<HTMLDivElement>(null);

  // State: is the viewport anchored at the bottom?
  const [isAtBottom, setIsAtBottom] = useState(true);
  // State: scroll flag; when set, triggers scroll into view
  const [scrollFlag, setScrollFlag] = useState<ScrollFlag>(false);

  // When scrollFlag changes, scroll the endRef into view
  useEffect(() => {
    if (scrollFlag && endRef.current) {
      endRef.current.scrollIntoView({ behavior: scrollFlag });
      setScrollFlag(false);
    }
  }, [scrollFlag]);

  // Programmatic scroll function
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      setScrollFlag(behavior);
    },
    []
  );

  // Viewport enter/leave handlers (use on endRef intersection)
  const onViewportEnter = useCallback(() => setIsAtBottom(true), []);
  const onViewportLeave = useCallback(() => setIsAtBottom(false), []);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter,
    onViewportLeave,
  };
}