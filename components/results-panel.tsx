"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Clock, Droplet, DollarSign, AlertCircle, Users, Copy } from "lucide-react"
import { toast } from "sonner"

declare global {
  interface Window {
    google: any
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: MapOptions)
      setCenter(latlng: LatLng | LatLngLiteral): void
      setZoom(zoom: number): void
      fitBounds(bounds: LatLngBounds): void
    }
    interface MapOptions {
      zoom?: number
      center?: LatLng | LatLngLiteral
      mapTypeId?: MapTypeId
      styles?: MapTypeStyle[]
    }
    enum MapTypeId {
      ROADMAP = "roadmap",
      SATELLITE = "satellite",
      HYBRID = "hybrid",
      TERRAIN = "terrain",
    }
    interface MapTypeStyle {
      featureType?: string
      elementType?: string
      stylers?: Array<{ [key: string]: any }>
    }
    class Marker {
      constructor(options?: MarkerOptions)
      setMap(map: Map | null): void
      setPosition(position: LatLng | LatLngLiteral): void
    }
    interface MarkerOptions {
      position?: LatLng | LatLngLiteral
      map?: Map
      label?: MarkerLabel
      icon?: Icon | string
    }
    interface MarkerLabel {
      text: string
      color?: string
      fontSize?: string
      fontWeight?: string
    }
    interface Icon {
      path?: SymbolPath | string
      scale?: number
      fillColor?: string
      fillOpacity?: number
      strokeColor?: string
      strokeWeight?: number
    }
    enum SymbolPath {
      CIRCLE = 0,
      BACKWARD_CLOSED_ARROW = 1,
      BACKWARD_OPEN_ARROW = 2,
      FORWARD_CLOSED_ARROW = 3,
      FORWARD_OPEN_ARROW = 4,
    }
    class Polyline {
      constructor(options?: PolylineOptions)
      setMap(map: Map | null): void
      setPath(path: LatLng[] | LatLngLiteral[] | MVCArray<LatLng>): void
    }
    interface PolylineOptions {
      path?: LatLng[] | LatLngLiteral[] | MVCArray<LatLng>
      geodesic?: boolean
      strokeColor?: string
      strokeOpacity?: number
      strokeWeight?: number
      map?: Map
    }
    class LatLng {
      constructor(lat: number, lng: number)
      lat(): number
      lng(): number
    }
    interface LatLngLiteral {
      lat: number
      lng: number
    }
    class LatLngBounds {
      extend(point: LatLng | LatLngLiteral): void
      getCenter(): LatLng
      getNorthEast(): LatLng
      getSouthWest(): LatLng
    }
    interface MVCArray<T> {
      getAt(index: number): T
      getLength(): number
    }
    namespace geometry {
      namespace encoding {
        function decodePath(encodedPath: string): LatLng[]
        function encodePath(path: LatLng[] | LatLngLiteral[]): string
      }
    }
  }
}

interface ResultsPanelProps {
  results: {
    distance: string
    duration: string
    consumption: number
    litersNeeded: string
    fuelCost: string
    tollCost: string
    totalCost: string
    hasTelepase?: boolean
  }
  passengers: number
  origin: { lat: number; lng: number } | null
  destination: { lat: number; lng: number } | null
  originAddress?: string
  destinationAddress?: string
  selectedBrand?: string
  selectedModel?: string
  customConsumption?: string
  fuelPrice?: string
  polyline: string | null
  googleScriptReady: boolean
}

export default function ResultsPanel({
  results,
  passengers,
  origin,
  destination,
  originAddress = "",
  destinationAddress = "",
  selectedBrand = "",
  selectedModel = "",
  customConsumption = "",
  fuelPrice = "",
  polyline,
  googleScriptReady,
}: ResultsPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)

  const costPerPerson = (Number.parseFloat(results.totalCost) / passengers).toFixed(2)

  // Format consumption with comma as decimal separator
  const formatConsumption = (value: number | string): string => {
    // Convert to number if it's a string, then format with comma
    const numValue = typeof value === "string" ? Number.parseFloat(value) : value
    if (isNaN(numValue) || numValue === null || numValue === undefined) {
      return String(value || "0")
    }
    // Use toFixed to ensure we have at least one decimal place, then replace ALL . with ,
    const formatted = Number(numValue).toFixed(1)
    // Replace the decimal point with comma - ensure it's a string
    const result = String(formatted).replace(/\./g, ",")
    return result
  }

  // Generate shareable link with trip data
  const generateShareLink = (): string => {
    if (!origin || !destination) return "https://calculadora-de-combustible.vercel.app/"

    const params = new URLSearchParams()
    params.set("origin", `${origin.lat},${origin.lng}`)
    params.set("dest", `${destination.lat},${destination.lng}`)
    if (originAddress) params.set("originAddr", originAddress)
    if (destinationAddress) params.set("destAddr", destinationAddress)
    params.set("distance", results.distance)
    params.set("duration", results.duration)
    params.set("totalCost", results.totalCost)
    params.set("passengers", passengers.toString())
    params.set("isRoundTrip", "false") // You can add this prop later if needed
    if (selectedBrand) params.set("brand", selectedBrand)
    if (selectedModel) params.set("model", selectedModel)
    if (customConsumption) params.set("customConsumption", customConsumption)
    if (fuelPrice) params.set("fuelPrice", fuelPrice)
    // Include the actual consumption used (from results)
    params.set("consumption", results.consumption.toString())

    return `https://calculadora-de-combustible.vercel.app/?${params.toString()}`
  }

  // Generate share message
  const generateShareMessage = (): string => {
    const link = generateShareLink()
    const route =
      originAddress && destinationAddress ? `${originAddress} → ${destinationAddress}` : "mi viaje"

    const totalFormatted = results.totalCost.replace(".", ",")

    let costLine: string
    if (passengers > 1) {
      // Calculamos costo por persona desde el total para asegurar coherencia
      const perPerson = (Number.parseFloat(results.totalCost) / passengers).toFixed(2)
      const perPersonFormatted = perPerson.replace(".", ",")
      costLine = `💰 Costo por persona: $${perPersonFormatted} - (${passengers} pasajeros) – Total: $${totalFormatted}`
    } else {
      costLine = `💰 Costo total: $${totalFormatted}`
    }

    return `🚗 ¡Mira este viaje calculado en RuteAR!\n\n📍 Ruta: ${route}\n${costLine}\n📏 Distancia: ${results.distance} km\n⏱️ Duración: ${results.duration}\n\n${link}`
  }

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const message = generateShareMessage()
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  // Copy message to clipboard
  const handleCopyMessage = async () => {
    try {
      const message = generateShareMessage()
      // Use Clipboard API when available and en contexto seguro (HTTPS o localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message)
      } else {
        // Fallback para contextos no seguros (por ejemplo, IP local en HTTP)
        const textArea = document.createElement("textarea")
        textArea.value = message
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        textArea.style.top = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand("copy")
        } finally {
          document.body.removeChild(textArea)
        }
      }
      toast.success("Mensaje copiado al portapapeles")
    } catch (error) {
      toast.error("Error al copiar el mensaje")
    }
  }

  useEffect(() => {
    if (!googleScriptReady || !mapRef.current) return

    // Initialize map only once
    if (!mapInstanceRef.current) {
      const defaultCenter = origin && destination
        ? { lat: (origin.lat + destination.lat) / 2, lng: (origin.lng + destination.lng) / 2 }
        : { lat: -34.6037, lng: -58.3816 } // Default to Buenos Aires

      const map = new google.maps.Map(mapRef.current, {
        zoom: 7,
        center: defaultCenter,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })
      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current

    // Only update markers and polyline if we have origin and destination
    if (origin && destination) {
      // Clear existing markers
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []

      // Add origin marker
      const originMarker = new google.maps.Marker({
        position: origin,
        map,
        label: {
          text: "Origen",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "bold",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      })
      markersRef.current.push(originMarker)

      // Add destination marker
      const destMarker = new google.maps.Marker({
        position: destination,
        map,
        label: {
          text: "Destino",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "bold",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      })
      markersRef.current.push(destMarker)

      // Draw polyline if available
      if (polyline) {
        // Clear existing polyline
        if (polylineRef.current) {
          polylineRef.current.setMap(null)
        }

        const decodedPath = google.maps.geometry.encoding.decodePath(polyline)
        const routePolyline = new google.maps.Polyline({
          path: decodedPath,
          geodesic: true,
          strokeColor: "#3b82f6",
          strokeOpacity: 0.8,
          strokeWeight: 4,
        })
        routePolyline.setMap(map)
        polylineRef.current = routePolyline

        // Fit bounds to show entire route
        const bounds = new google.maps.LatLngBounds()
        decodedPath.forEach((point) => bounds.extend(point))
        map.fitBounds(bounds)
      } else {
        // If no polyline, just fit bounds to markers
        const bounds = new google.maps.LatLngBounds()
        bounds.extend(origin)
        bounds.extend(destination)
        map.fitBounds(bounds)
      }
    }
  }, [googleScriptReady, origin, destination, polyline])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Resumen del Viaje</h2>

      {/* Map - MUST BE FIRST after title */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
        <div ref={mapRef} className="w-full h-[300px] rounded-lg overflow-hidden relative bg-slate-50">
          {!origin || !destination ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-sm text-slate-500">Selecciona origen y destino para ver la ruta</p>
            </div>
          ) : !googleScriptReady ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-sm text-slate-600">Cargando mapa...</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Distance */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="p-1.5 bg-blue-500/10 rounded-full">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl font-bold text-slate-900">
                  {results.distance.replace(".", ",")}
                </p>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">km</p>
              </div>
              <p className="text-xs text-slate-500 font-medium">Distancia</p>
            </div>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="p-1.5 bg-indigo-500/10 rounded-full">
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl font-bold text-slate-900">{results.duration}</p>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Tiempo</p>
              </div>
              <p className="text-xs text-slate-500 font-medium">Duración</p>
            </div>
          </CardContent>
        </Card>

        {/* Consumption */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="p-1.5 bg-amber-500/10 rounded-full">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl font-bold text-slate-900">
                  {formatConsumption(results.consumption)}
                </p>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">L/100km</p>
              </div>
              <p className="text-xs text-slate-500 font-medium">Consumo</p>
            </div>
          </CardContent>
        </Card>

        {/* Liters */}
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border border-cyan-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="p-1.5 bg-cyan-500/10 rounded-full">
                <Droplet className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl font-bold text-slate-900">
                  {results.litersNeeded.replace(".", ",")}
                </p>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Litros</p>
              </div>
              <p className="text-xs text-slate-500 font-medium">Combustible</p>
            </div>
          </CardContent>
        </Card>

        {/* Total - spans 1 column on desktop, rectangular on smaller screens */}
        <Card className="bg-gradient-to-br from-green-100 to-green-200/50 border-2 border-green-400 shadow-md hover:shadow-lg transition-shadow col-span-2 md:col-span-2 lg:col-span-1">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="p-1.5 bg-green-500/20 rounded-full">
                <DollarSign className="w-4 h-4 text-green-700" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl font-bold text-green-700">$ {results.totalCost.replace(".", ",")}</p>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total del Viaje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost per Person */}
        {passengers > 1 && (
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-3 lg:col-span-5">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-1.5">
                <div className="p-1.5 bg-purple-500/10 rounded-full">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-purple-700">$ {costPerPerson.replace(".", ",")}</p>
                  <p className="text-xs font-medium text-purple-600">por persona ({passengers} pasajeros)</p>
                </div>
                <p className="text-xs text-slate-500 font-medium">Costo por Persona</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cost Breakdown */}
      <Card className="bg-white border border-slate-200 shadow-md">
        <CardHeader className="pb-0 pt-0">
          <CardTitle className="text-slate-800 text-base">Desglose de Costos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-700">Costo de Combustible</span>
              <span className="font-semibold text-sm text-slate-800">$ {results.fuelCost}</span>
            </div>

            {results.tollCost && (
              <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-900">Costo de Peajes</span>
                  {results.hasTelepase && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      (-30% aplicado)
                    </span>
                  )}
                </div>
                <span className="font-semibold text-sm text-amber-900">$ {results.tollCost}</span>
              </div>
            )}

            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border-2 border-green-300">
              <span className="font-semibold text-sm text-green-900">Total del Viaje</span>
              <span className="font-bold text-green-600 text-base">$ {results.totalCost}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Buttons */}
      <div className="flex gap-2 mt-4 pb-16 md:pb-0">
        <Button
          onClick={handleShareWhatsApp}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-md transition-all shadow-md hover:shadow-lg"
        >
          <span className="flex items-center justify-center">
            <img
              src="https://img.icons8.com/ios/50/FFFFFF/whatsapp--v1.png"
              alt="Compartir por WhatsApp"
              className="w-5 h-5 mr-2"
            />
            Compartir por WhatsApp
          </span>
        </Button>
        <Button
          onClick={handleCopyMessage}
          variant="outline"
          className="flex-1 py-2.5 px-3 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-all shadow-md hover:shadow-lg"
          title="Copiar mensaje"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copiar Mensaje
        </Button>
      </div>
    </div>
  )
}
