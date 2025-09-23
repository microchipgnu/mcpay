"use client"

import { useCallback, useEffect, useState, useRef } from "react"

export function useChatScroll(threshold: number = 100) {
  const [isAtBottom, setIsAtBottom] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      
      setIsAtBottom(distanceFromBottom <= threshold)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    
    // Check initial state
    handleScroll()

    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [threshold])

  return { isAtBottom, scrollToBottom, scrollContainerRef }
}
