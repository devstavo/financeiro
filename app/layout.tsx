import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Financeiro Farinea',
  description: 'Financeiro Farinea - Controle Financeiro',
  generator: 'Financeiro Farinea',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
