import ConfigProvider from 'antd/es/config-provider'
import koKR from 'antd/es/locale/ko_KR'
import theme from 'antd/es/theme'
import { type ReactNode } from 'react'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ConfigProvider
      locale={koKR}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  )
}
