"use client"

import { useCallback, useEffect, useState, useRef } from "react"

// Container-based scroll hook for chat components
export function useChatScroll(threshold: number = 100) {
  const [isAtBottom, setIsAtBottom] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

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

// Window-based scroll hook for pages
export function useWindowScroll(threshold: number = 100) {
  const [isAtBottom, setIsAtBottom] = useState(false)

  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      const distanceFromBottom = documentHeight - (scrollTop + windowHeight)
      
      setIsAtBottom(distanceFromBottom <= threshold)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    
    // Check initial state
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [threshold])

  return { isAtBottom, scrollToBottom }
}
