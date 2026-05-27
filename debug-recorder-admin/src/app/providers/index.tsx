import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './QueryProvider'
import { ThemeProvider } from './ThemeProvider'
import { type ReactNode } from 'react'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryProvider>
    </ThemeProvider>
  )
}

export { QueryProvider } from './QueryProvider'
export { ThemeProvider } from './ThemeProvider'
