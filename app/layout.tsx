import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RuteAR - Calculadora de Gasto de Gasolina",
  description: "Calcula el gasto de gasolina entre dos puntos con Google Maps y peajes",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head></head>
      <body className={`font-sans antialiased`}>{children}</body>
    </html>
  )
}
