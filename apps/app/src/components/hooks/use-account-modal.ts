"use client"

import { useState, useCallback } from 'react'
// Local type to avoid dependency on removed '@/types/ui'
type AccountModalTab = "wallets" | "developer"


interface UseAccountModalReturn {
  isOpen: boolean
  defaultTab: AccountModalTab
  openModal: (tab?: AccountModalTab) => void
  closeModal: () => void
}

export function useAccountModal(): UseAccountModalReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<AccountModalTab>('wallets')

  const openModal = useCallback((tab: AccountModalTab = 'wallets') => {
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