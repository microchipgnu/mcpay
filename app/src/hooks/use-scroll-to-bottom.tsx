"use client"

import { useCallback, useEffect, useState } from "react"

export function useScrollToBottom(threshold: number = 100) {
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