"use client"

import React from "react"
import { getTokenInfo } from "@/lib/commons"
import type { Network } from "@/types/blockchain"

export function TokenIcon({
  currencyOrAddress,
  network,
  size = 16,
  className = "",
}: {
  currencyOrAddress?: string
  network?: string
  size?: number
  className?: string
}) {
  try {
    if (currencyOrAddress && network) {
      const info = getTokenInfo(currencyOrAddress, network as Network)
      if (info?.logoUri) {
        return (
          // Use native img to avoid Next remote image config for arbitrary hosts
          <img
            src={info.logoUri}
            alt={info.symbol}
            width={size}
            height={size}
            className={`inline-block rounded-full object-cover ${className}`}
          />
        )
      }
      // Fallback: known local assets
      if (currencyOrAddress.toUpperCase() === 'USDC') {
        return (
          <img
            src="/tokens/usdc.svg"
            alt="USDC"
            width={size}
            height={size}
            className={`inline-block rounded-full object-cover ${className}`}
          />
        )
      }
    }
  } catch {
    // ignore and fall through to generic fallback
  }

  // Generic fallback: plain circle
  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-block rounded-full bg-muted ${className}`}
    />
  )
}


