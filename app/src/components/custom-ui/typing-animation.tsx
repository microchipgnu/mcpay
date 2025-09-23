"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"

interface TypingAnimationProps {
  text: string
  trigger: boolean
  className?: string
  speed?: number
}

export default function TypingAnimation({ 
  text, 
  trigger, 
  className = "", 
  speed = 30 
}: TypingAnimationProps) {
  const [displayText, setDisplayText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    if (trigger && !hasStarted) {
      setHasStarted(true)
      setCurrentIndex(0)
      setDisplayText("")
    }
  }, [trigger, hasStarted])

  useEffect(() => {
    if (hasStarted && currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    }
  }, [currentIndex, hasStarted, text, speed])

  return (
    <motion.div 
      className={`font-mono tracking-wide text-center ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: hasStarted ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="text-[13px] text-muted-foreground tracking-wider font-medium uppercase">
        {displayText}
      </span>
    </motion.div>
  )
}
