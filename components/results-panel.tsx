"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Clock, Droplet, DollarSign, AlertCircle, Users } from "lucide-react"

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
  polyline: string | null
  googleScriptReady: boolean
}

export default function ResultsPanel({
  results,
  passengers,
  origin,
  destination,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Distance */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600">Distancia</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <p className="text-xl font-bold text-slate-800">
              {results.distance}
              <span className="text-xs font-normal ml-1">km</span>
            </p>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600">Duración</CardTitle>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <p className="text-xl font-bold text-slate-800">{results.duration}</p>
          </CardContent>
        </Card>

        {/* Consumption */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600">Consumo</CardTitle>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <p className="text-xl font-bold text-slate-800">
              <span>{formatConsumption(results.consumption)}</span>
              <span className="text-xs font-normal ml-1">L/100km</span>
            </p>
          </CardContent>
        </Card>

        {/* Liters */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-600">Litros</CardTitle>
              <Droplet className="w-4 h-4 text-cyan-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <p className="text-xl font-bold text-slate-800">
              {results.litersNeeded}
              <span className="text-xs font-normal ml-1">L</span>
            </p>
          </CardContent>
        </Card>

        {/* Total - spans 1 column on desktop */}
        <Card className="bg-green-50 border border-green-300 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-green-700">Total</CardTitle>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <p className="text-xl font-bold text-green-600">$ {results.totalCost}</p>
          </CardContent>
        </Card>

        {/* Cost per Person */}
        {passengers > 1 && (
          <Card className="bg-purple-50 border border-purple-300 shadow-sm">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-purple-700">Costo por Persona</CardTitle>
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <p className="text-xl font-bold text-purple-600">$ {costPerPerson}</p>
              <p className="text-xs text-purple-600 mt-0.5">({passengers} pasajeros)</p>
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

            {Number.parseFloat(results.tollCost) > 0 && (
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
    </div>
  )
}
