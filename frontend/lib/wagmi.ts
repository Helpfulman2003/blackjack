'use client';
import { createConfig, http } from 'wagmi';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { Attribution } from "ox/erc8021";

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

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_wb6snu6s"],
});

export const wagmiConfig = createConfig({
  chains: [baseMainnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Blackjack on Base' }),
  ],
  transports: {
    [baseMainnet.id]: http('https://mainnet.base.org'),
  },
  dataSuffix: DATA_SUFFIX,
});
