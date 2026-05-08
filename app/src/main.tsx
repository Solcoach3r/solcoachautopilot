import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import {
  ConnectionProvider as _CP,
  WalletProvider as _WP,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider as _WMP } from '@solana/wallet-adapter-react-ui'

const ConnectionProvider = _CP as any
const WalletProvider = _WP as any
const WalletModalProvider = _WMP as any
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import App from './App'

import '@solana/wallet-adapter-react-ui/styles.css'

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com'

const theme = extendTheme({
  fonts: {
    heading: `'Nunito', sans-serif`,
    body: `'Nunito', sans-serif`,
  },
  colors: {
    brand: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    warm: {
      bg: '#FFFBF5',
      cream: '#FEF3E2',
      sand: '#FFF7ED',
    },
    quest: {
      stake: '#8B5CF6',
      swap: '#3B82F6',
      lp: '#EC4899',
      claim: '#14B8A6',
      rebalance: '#F59E0B',
      default: '#f97316',
    },
    streak: {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'warm.bg',
        color: '#292524',
      },
      '*::-webkit-scrollbar': { width: '6px' },
      '*::-webkit-scrollbar-track': { bg: 'transparent' },
      '*::-webkit-scrollbar-thumb': { bg: 'brand.200', borderRadius: '3px' },
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          borderRadius: '20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        },
      },
    },
    Button: {
      baseStyle: {
        fontWeight: 700,
        borderRadius: 'full',
      },
    },
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function Root() {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ChakraProvider theme={theme}>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </QueryClientProvider>
          </ChakraProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
