"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown } from "lucide-react"
import PlacesAutocomplete from "@/components/places-autocomplete"
import ResultsPanel from "@/components/results-panel"
import { vehicles } from "@/lib/vehicles"

const SORTED_VEHICLES = [...vehicles].sort((a, b) => a.brand.localeCompare(b.brand))

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""

export default function Home() {
  const [selectedBrand, setSelectedBrand] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [customConsumption, setCustomConsumption] = useState("")
  const [fuelPrice, setFuelPrice] = useState("200")
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [googleScriptReady, setGoogleScriptReady] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,routes`
    script.async = true
    script.defer = true
    script.onload = () => {
      setGoogleScriptReady(true)
    }
    document.head.appendChild(script)
  }, [])

  const handleCalculate = async () => {
    setError("")
    setLoading(true)

    try {
      if (!origin || !destination) {
        setError("Por favor selecciona origen y destino")
        setLoading(false)
        return
      }

      let consumption: number | null = null

      if (customConsumption) {
        consumption = Number.parseFloat(customConsumption)
      } else if (selectedModel && selectedBrand) {
        const brand = SORTED_VEHICLES.find((v) => v.brand === selectedBrand)
        if (brand) {
          const model = brand.models.find((m) => m.name === selectedModel)
          consumption = model?.avgConsumptionLPer100km || null
        }
      }

      if (!consumption || Number.isNaN(consumption) || consumption <= 0) {
        setError("Por favor ingresa un consumo válido del vehículo")
        setLoading(false)
        return
      }

      // Call Routes API v2
      const routeResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
            },
          },
          travelMode: "DRIVE",
          extraComputations: ["TOLLS"],
        }),
      })

      if (!routeResponse.ok) {
        const errorData = await routeResponse.json()
        setError("Error al calcular la ruta. Verifica tu API Key y que tenga las APIs habilitadas.")
        setLoading(false)
        return
      }

      const routeData = await routeResponse.json()

      if (!routeData.routes || routeData.routes.length === 0) {
        setError("No se encontró ruta entre los puntos seleccionados")
        setLoading(false)
        return
      }

      const route = routeData.routes[0]
      const distanceMeters = route.distanceMeters
      const distanceKm = distanceMeters / 1000

      // Extract toll information
      let tollCost = 0
      if (route.travelAdvisory?.tollInfo?.estimatedPrice) {
        const prices = route.travelAdvisory.tollInfo.estimatedPrice
        if (Array.isArray(prices) && prices.length > 0) {
          const priceData = prices[0]
          const units = Number(priceData.units) || 0
          const nanos = Number(priceData.nanos) || 0
          tollCost = units + nanos / 1e9
        }
      }

      // Calculate fuel cost
      const litersNeeded = (distanceKm * consumption) / 100
      const fuelCost = litersNeeded * Number.parseFloat(fuelPrice)
      const totalCost = fuelCost + tollCost

      // Parse duration
      const durationString = route.duration || "0s"
      const durationMatch = durationString.match(/(\d+)s/)
      const durationSeconds = durationMatch ? Number.parseInt(durationMatch[1]) : 0
      const hours = Math.floor(durationSeconds / 3600)
      const minutes = Math.floor((durationSeconds % 3600) / 60)

      setResults({
        distance: distanceKm.toFixed(2),
        duration: `${hours}h ${minutes}m`,
        consumption,
        litersNeeded: litersNeeded.toFixed(2),
        fuelCost: fuelCost.toFixed(2),
        tollCost: tollCost.toFixed(2),
        totalCost: totalCost.toFixed(2),
      })
    } catch (err) {
      console.error("[v0] Calculation error:", err)
      setError("Error al calcular el viaje. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const selectedBrandData = SORTED_VEHICLES.find((v) => v.brand === selectedBrand)
  const models = selectedBrandData?.models || []
  const selectedModelData = models.find((m) => m.name === selectedModel)
  const consumption = selectedModelData?.avgConsumptionLPer100km || null

  return (
    <div className="min-h-screen bg-slate-200">
      <header className="sticky top-0 z-50 border-b border-slate-300 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center">
          <img src="/rutear_logo.png" alt="RuteAR Logo" className="h-32 w-auto drop-shadow-lg" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="font-semibold text-slate-800">¿Cómo usar?</span>
            <ChevronDown
              className={`h-5 w-5 text-slate-600 transition-transform ${showHowItWorks ? "rotate-180" : ""}`}
            />
          </button>

          {showHowItWorks && (
            <div className="mt-2 bg-white border border-slate-200 border-t-0 rounded-b-lg p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-semibold text-sm">
                      1
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Indicar partida y destino</h4>
                    <p className="text-slate-600 text-sm">
                      Busca y selecciona tu punto de partida y destino en los campos de origen y destino.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-semibold text-sm">
                      2
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Seleccionar auto o consumo</h4>
                    <p className="text-slate-600 text-sm">
                      Elige la marca y modelo de tu vehículo para obtener un consumo aproximado, o ingresa el consumo
                      manualmente si lo conoces.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-semibold text-sm">
                      3
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Indicar precio de combustible y calcular</h4>
                    <p className="text-slate-600 text-sm">
                      Ingresa el precio actual del combustible en tu zona y presiona "Calcular" para obtener el costo
                      total de tu viaje.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white shadow-md border border-slate-200">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-blue-600">Calcula tu viaje</CardTitle>
                <CardDescription className="text-slate-600">Ingresa los datos de tu recorrido</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {/* Brand Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Marca de Auto (Opcional)</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value)
                      setSelectedModel("")
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar marca...</option>
                    {SORTED_VEHICLES.map((vehicle) => (
                      <option key={vehicle.brand} value={vehicle.brand}>
                        {vehicle.brand}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Selection */}
                {selectedBrand && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">Modelo de Auto (Opcional)</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar modelo...</option>
                      {models.map((model) => (
                        <option key={model.name} value={model.name}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Origin */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Origen</label>
                  <PlacesAutocomplete
                    placeholder="Ingresa punto de partida..."
                    onLocationSelect={(coords) => setOrigin(coords)}
                    apiKey={API_KEY}
                  />
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Destino</label>
                  <PlacesAutocomplete
                    placeholder="Ingresa punto de llegada..."
                    onLocationSelect={(coords) => setDestination(coords)}
                    apiKey={API_KEY}
                  />
                </div>

                {/* Consumption */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">
                    Consumo del Vehículo (L/100km)
                    {consumption && (
                      <span className="text-xs text-slate-600 ml-2">(Estimado: {consumption.toFixed(1)})</span>
                    )}
                  </label>
                  <Input
                    type="number"
                    placeholder="ej: 7.5"
                    value={customConsumption}
                    onChange={(e) => setCustomConsumption(e.target.value)}
                    className="text-slate-800 border-slate-300 bg-white"
                  />
                </div>

                {/* Fuel Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Precio del Combustible ($/L)</label>
                  <Input
                    type="number"
                    placeholder="ej: 200"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    className="text-slate-800 border-slate-300 bg-white"
                  />
                </div>

                <Button
                  onClick={handleCalculate}
                  disabled={loading || !origin || !destination}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-md transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    "Calcular"
                  )}
                </Button>

                {error && (
                  <div className="text-red-700 text-sm bg-red-50 p-3 rounded-md border border-red-300">{error}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Results only */}
          <div className="lg:col-span-2 space-y-6">{results && <ResultsPanel results={results} />}</div>
        </div>
      </main>
    </div>
  )
}
