'use client';
import { createConfig, http } from 'wagmi';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export const baseMainnet = {
  id: 8453,
  name: 'Base mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
  testnet: false,
} as const;

export const wagmiConfig = createConfig({
  chains: [baseMainnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Blackjack on Base' }),
  ],
  transports: {
    [baseMainnet.id]: http('https://mainnet.base.org'),
  },
});
