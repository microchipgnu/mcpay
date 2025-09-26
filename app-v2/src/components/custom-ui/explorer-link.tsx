"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { openExplorer, copyExplorerUrl, getExplorerName, hasExplorer } from "@/lib/client/blockscout"
import { type Network } from "@/types/blockchain"
import { ExternalLink, Copy, Check } from "lucide-react"
import { useState } from "react"

interface ExplorerLinkProps {
  hash: string
  network: Network
  type?: 'address' | 'tx'
  variant?: 'link' | 'button' | 'badge'
  showIcon?: boolean
  showExplorerName?: boolean
  showCopyButton?: boolean
  className?: string
  children?: React.ReactNode
}

export function ExplorerLink({
  hash,
  network,
  type = 'address',
  variant = 'link',
  showIcon = true,
  showExplorerName = false,
  showCopyButton = false,
  className = '',
  children
}: ExplorerLinkProps) {
  const [copied, setCopied] = useState(false)

  // Don't render if network doesn't have an explorer
  if (!hasExplorer(network)) {
    return null
  }

  const explorerName = getExplorerName(network)
  const displayText = children || (type === 'address' ? formatAddress(hash) : formatTxHash(hash))

  const handleClick = () => {
    openExplorer(hash, network, type)
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const success = await copyExplorerUrl(hash, network, type)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const commonContent = (
    <div className="flex items-center gap-1">
      {showIcon && <ExternalLink className="h-3 w-3" />}
      <span className="font-mono text-xs">{displayText}</span>
      {showExplorerName && (
        <Badge variant="outline" className="text-xs ml-1">
          {explorerName}
        </Badge>
      )}
      {showCopyButton && (
        variant === 'button' ? (
          <span
            onClick={handleCopy}
            className="inline-flex items-center justify-center h-5 w-5 p-0 ml-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </span>
        ) : (
          <Button
            onClick={handleCopy}
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 ml-1"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )
      )}
    </div>
  )

  if (variant === 'button') {
    return (
      <Button
        onClick={handleClick}
        variant="outline"
        size="sm"
        className={`${className}`}
      >
        {commonContent}
      </Button>
    )
  }

  if (variant === 'badge') {
    return (
      <Badge
        onClick={handleClick}
        variant="outline"
        className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      >
        {commonContent}
      </Badge>
    )
  }

  // Default link variant
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors ${className}`}
    >
      {commonContent}
    </button>
  )
}

// Utility functions for formatting
function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatTxHash(hash: string): string {
  if (!hash) return ''
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

// Convenience components for common use cases
export function AddressLink({ 
  address, 
  network, 
  ...props 
}: Omit<ExplorerLinkProps, 'hash' | 'type'> & { address: string }) {
  return (
    <ExplorerLink
      hash={address}
      network={network}
      type="address"
      {...props}
    />
  )
}

export function TransactionLink({ 
  txHash, 
  network, 
  ...props 
}: Omit<ExplorerLinkProps, 'hash' | 'type'> & { txHash: string }) {
  return (
    <ExplorerLink
      hash={txHash}
      network={network}
      type="tx"
      {...props}
    />
  )
} 