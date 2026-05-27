import React from 'react'
import { CONFIG } from '@/shared/constants'

interface RemoteIconProps {
  name: string
  size?: number
  style?: React.CSSProperties
}

export function RemoteIcon({ name, size = 16, style }: RemoteIconProps) {
  if (!CONFIG.ICON_BASE_URL) {
    return null
  }

  const iconUrl = `${CONFIG.ICON_BASE_URL}/${name}.svg`

  return (
    <img
      src={iconUrl}
      alt={name}
      width={size}
      height={size}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  )
}
