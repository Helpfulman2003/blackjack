import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
    title: 'Blackjack on Base',
    description: 'Onchain Blackjack leaderboard on Base Mainnet',
    other: {
        'base:app_id': '6a0ffd3b60f48127e9029abd',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="base:app_id" content="6a0ffd3b60f48127e9029abd" />
            </head>
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
