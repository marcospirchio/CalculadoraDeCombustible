import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { CafecitoButton } from "@/components/common/cafecito-button"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://calculadora-de-combustible.vercel.app"

export const metadata: Metadata = {
  title: "RuteAR | Calculadora de Nafta y Peajes Argentina 2025",
  description: "Calculá el costo exacto de tu viaje en auto. Incluye consumo de combustible por modelo, tarifas de peajes actualizadas y descuentos por Telepase. ¡Planificá tu ruta hoy!",
  keywords: ["calculadora de viaje", "calcular nafta y peajes", "costo peajes argentina", "consumo combustible auto", "dividir gastos viaje", "telepase ahorro", "rutas argentinas", "precio nafta hoy,","cuanto sale ir a capital federal","cuanto sale ir a capital","cuanto sale ir a buenos aires","cuanto cuesta ir a capital federal","cuanto cuesta ir a capital","cuanto cuesta ir a buenos aires"],
  authors: [{ name: "RuteAR Team" }],
  creator: "RuteAR",
  openGraph: {
    title: "🚗 ¿Cuánto cuesta tu viaje? Calculalo con RuteAR",
    description: "Evitá sorpresas. Calculá nafta, peajes y dividí gastos con amigos.",
    url: siteUrl,
    siteName: "RuteAR",
    locale: "es_AR",
    type: "website",
    images: [{ url: `${siteUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Interfaz de RuteAR" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RuteAR | Calculadora de Costos de Viaje",
    description: "Calculá nafta y peajes en segundos. Ahorrá con Telepase.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  icons: {
    icon: "/favicon.ico",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RuteAR",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  description: "Calculadora de costos de viaje en auto para Argentina. Calcula consumo de combustible, peajes y divide gastos entre pasajeros.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "ARS",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
  url: siteUrl,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head></head>
      <body className={`font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster />
        <CafecitoButton />
      </body>
    </html>
  )
}
