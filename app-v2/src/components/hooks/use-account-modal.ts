"use client"

import { useState, useCallback } from 'react'
import { AccountModalTab } from '@/types/ui'


interface UseAccountModalReturn {
  isOpen: boolean
  defaultTab: AccountModalTab
  openModal: (tab?: AccountModalTab) => void
  closeModal: () => void
}

export function useAccountModal(): UseAccountModalReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<AccountModalTab>('funds')

  const openModal = useCallback((tab: AccountModalTab = 'funds') => {
    setDefaultTab(tab)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    defaultTab,
    openModal,
    closeModal
  }
} 