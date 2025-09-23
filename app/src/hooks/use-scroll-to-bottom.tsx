"use client"

import { useEffect, useState } from "react"

export function useScrollToBottom(threshold: number = 100) {
  const [hasReachedBottom, setHasReachedBottom] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      const distanceFromBottom = documentHeight - (scrollTop + windowHeight)
      
      if (distanceFromBottom <= threshold && !hasReachedBottom) {
        setHasReachedBottom(true)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    
    // Check initial state
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [threshold, hasReachedBottom])

  return hasReachedBottom
}