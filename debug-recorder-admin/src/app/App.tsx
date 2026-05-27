import { AppProviders } from './providers'
import { AppRoutes } from './routes'
import '@/styles/global.css'

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  )
}
