"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Loader2, ChevronDown, CalendarIcon, Clock, ArrowUpDown, Bookmark, Menu, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "sonner"
import PlacesAutocomplete from "@/components/places-autocomplete"
import ResultsPanel from "@/components/results-panel"
import { vehicles } from "@/lib/vehicles"

const SORTED_VEHICLES = [...vehicles].sort((a, b) => a.brand.localeCompare(b.brand))

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""

export default function Home() {
  const [selectedBrand, setSelectedBrand] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [customConsumption, setCustomConsumption] = useState("")
  const [fuelPrice, setFuelPrice] = useState("1700")
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null)
  const [originAddress, setOriginAddress] = useState("")
  const [destinationAddress, setDestinationAddress] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [googleScriptReady, setGoogleScriptReady] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [hasTelepase, setHasTelepase] = useState(false)
  const [passengers, setPassengers] = useState(1)
  const [passengersInput, setPassengersInput] = useState("1")
  const [routePolyline, setRoutePolyline] = useState<string | null>(null)
  const [baseRouteData, setBaseRouteData] = useState<{
    distanceKm: number
    tollCost: number
    durationSeconds: number
    consumption: number
    fuelPrice: number
  } | null>(null)
  const [timeType, setTimeType] = useState<"now" | "departure" | "arrival">("now")
  const [selectedDateTime, setSelectedDateTime] = useState<Date | undefined>(undefined)
  const [savedTrips, setSavedTrips] = useState<Array<{
    id: string
    origin: { lat: number; lng: number }
    destination: { lat: number; lng: number }
    originAddress: string
    destinationAddress: string
    selectedBrand: string
    selectedModel: string
    customConsumption: string
    fuelPrice: string
    passengers: number
    isRoundTrip: boolean
    hasTelepase: boolean
    timeType: "now" | "departure" | "arrival"
    selectedDateTime?: string
    savedAt: string
  }>>([])
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`
    script.async = true
    script.defer = true
    script.onload = () => {
      setGoogleScriptReady(true)
    }
    document.head.appendChild(script)
  }, [])

  // Load saved trips from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rutear_history")
      if (stored) {
        try {
          const trips = JSON.parse(stored)
          setSavedTrips(trips)
        } catch (error) {
          console.error("Error loading saved trips:", error)
        }
      }
    }
  }, [])

  const handleCalculate = async (customOrigin?: { lat: number; lng: number } | null, customDestination?: { lat: number; lng: number } | null) => {
    setError("")
    setLoading(true)

    try {
      const originToUse = customOrigin !== undefined ? customOrigin : origin
      const destinationToUse = customDestination !== undefined ? customDestination : destination

      if (!originToUse || !destinationToUse) {
        setError("Por favor selecciona origen y destino")
        setLoading(false)
        return
      }

      let consumption: number | null = null

      if (customConsumption) {
        // Convert comma to dot for parsing (allow both formats)
        const normalizedConsumption = customConsumption.replace(",", ".")
        consumption = Number.parseFloat(normalizedConsumption)
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

      // Validate time selection
      if ((timeType === "departure" || timeType === "arrival") && !selectedDateTime) {
        setError("Por favor selecciona una fecha y hora para el viaje")
        setLoading(false)
        return
      }

      // Prepare request body
      const requestBody: any = {
        origin: {
          location: {
            latLng: {
              latitude: originToUse.lat,
              longitude: originToUse.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destinationToUse.lat,
              longitude: destinationToUse.lng,
            },
          },
        },
        travelMode: "DRIVE",
        extraComputations: ["TOLLS"],
      }

      // Add time preference based on selection
      // Google Routes API v2 expects RFC3339 format (ISO 8601)
      // TRAFFIC_AWARE only works with departureTime, not arrivalTime
      // Note: API requires departureTime to be at least a few seconds in the future
      if (timeType === "now") {
        // Add 1 minute to current time to ensure it's in the future
        const futureTime = new Date()
        futureTime.setMinutes(futureTime.getMinutes() + 1)
        requestBody.departureTime = futureTime.toISOString()
        requestBody.routingPreference = "TRAFFIC_AWARE"
      } else if (timeType === "departure" && selectedDateTime) {
        requestBody.departureTime = selectedDateTime.toISOString()
        requestBody.routingPreference = "TRAFFIC_AWARE"
      } else if (timeType === "arrival" && selectedDateTime) {
        requestBody.arrivalTime = selectedDateTime.toISOString()
        // Note: TRAFFIC_AWARE doesn't work with arrivalTime, so we don't include it
      }

      // Call Routes API v2
      const routeResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.polyline",
        },
        body: JSON.stringify(requestBody),
      })

      if (!routeResponse.ok) {
        let errorMessage = "Error al calcular la ruta. Verifica tu API Key y que tenga las APIs habilitadas."
        try {
          const errorData = await routeResponse.json()
          console.error("API Error:", errorData)
          // Show more specific error if available
          if (errorData.error?.message) {
            errorMessage = `Error: ${errorData.error.message}`
          } else if (errorData.message) {
            errorMessage = `Error: ${errorData.message}`
          }
        } catch (e) {
          console.error("Error parsing response:", e)
        }
        setError(errorMessage)
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
      const baseDistanceKm = distanceMeters / 1000

      // Extract polyline for map
      const polyline = route.polyline?.encodedPolyline || null
      setRoutePolyline(polyline)

      // Extract toll information (base, without round trip)
      let baseTollCost = 0
      if (route.travelAdvisory?.tollInfo?.estimatedPrice) {
        const prices = route.travelAdvisory.tollInfo.estimatedPrice
        console.log("Precios encontrados:", prices)
        if (Array.isArray(prices) && prices.length > 0) {
          // Calculate total cost for each price option and select the lowest
          const priceCosts = prices.map((priceData) => {
            const units = Number(priceData.units) || 0
            const nanos = Number(priceData.nanos) || 0
            return units + nanos / 1e9
          })
          // Select the minimum price (e.g., Telepase instead of Cash)
          baseTollCost = Math.min(...priceCosts)
        }
      }

      // Parse duration (base, without round trip)
      const durationString = route.duration || "0s"
      const durationMatch = durationString.match(/(\d+)s/)
      const baseDurationSeconds = durationMatch ? Number.parseInt(durationMatch[1]) : 0

      // Save base route data for recalculation
      const currentFuelPrice = Number.parseFloat(fuelPrice)
      setBaseRouteData({
        distanceKm: baseDistanceKm,
        tollCost: baseTollCost,
        durationSeconds: baseDurationSeconds,
        consumption,
        fuelPrice: currentFuelPrice,
      })

      // Calculate results with current round trip state
      calculateResultsFromBase(
        baseDistanceKm,
        baseTollCost,
        baseDurationSeconds,
        consumption,
        currentFuelPrice,
        isRoundTrip,
        hasTelepase
      )
    } catch (err) {
      console.error("[v0] Calculation error:", err)
      setError("Error al calcular el viaje. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const calculateResultsFromBase = (
    baseDistanceKm: number,
    baseTollCost: number,
    baseDurationSeconds: number,
    consumption: number,
    fuelPrice: number,
    roundTrip: boolean,
    telepase: boolean
  ) => {
    // Apply round trip multiplier
    const distanceKm = roundTrip ? baseDistanceKm * 2 : baseDistanceKm
    let tollCost = roundTrip ? baseTollCost * 2 : baseTollCost
    
    // Apply Telepase discount (30% off = multiply by 0.70)
    if (telepase) {
      tollCost = tollCost * 0.70
    }
    
    const durationSeconds = roundTrip ? baseDurationSeconds * 2 : baseDurationSeconds

    // Calculate fuel cost
    const litersNeeded = (distanceKm * consumption) / 100
    const fuelCost = litersNeeded * fuelPrice
    const totalCost = fuelCost + tollCost

    // Format duration
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
      hasTelepase: telepase,
    })
  }

  // Save trip to localStorage
  const handleSaveTrip = () => {
    if (!origin || !destination) {
      toast.error("Por favor selecciona origen y destino antes de guardar")
      return
    }

    const trip = {
      id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      origin,
      destination,
      originAddress,
      destinationAddress,
      selectedBrand,
      selectedModel,
      customConsumption,
      fuelPrice,
      passengers,
      isRoundTrip,
      hasTelepase,
      timeType,
      selectedDateTime: selectedDateTime?.toISOString(),
      savedAt: new Date().toISOString(),
    }

    const updatedTrips = [trip, ...savedTrips]
    setSavedTrips(updatedTrips)
    localStorage.setItem("rutear_history", JSON.stringify(updatedTrips))
    toast.success("Viaje guardado")
  }

  // Load trip from saved trips
  const handleLoadTrip = async (trip: typeof savedTrips[0]) => {
    // Set all form states first
    setOrigin(trip.origin)
    setDestination(trip.destination)
    setOriginAddress(trip.originAddress)
    setDestinationAddress(trip.destinationAddress)
    setSelectedBrand(trip.selectedBrand)
    setSelectedModel(trip.selectedModel)
    setCustomConsumption(trip.customConsumption)
    setFuelPrice(trip.fuelPrice)
    setPassengers(trip.passengers)
    setPassengersInput(String(trip.passengers))
    setIsRoundTrip(trip.isRoundTrip)
    setHasTelepase(trip.hasTelepase)
    setTimeType(trip.timeType)
    if (trip.selectedDateTime) {
      setSelectedDateTime(new Date(trip.selectedDateTime))
    } else {
      setSelectedDateTime(undefined)
    }
    
    setSheetOpen(false)
    toast.success("Viaje cargado")
    
    // Calculate using trip data directly (don't wait for state updates)
    // We need to calculate consumption from trip data
    let consumption: number | null = null
    
    if (trip.customConsumption) {
      const normalizedConsumption = trip.customConsumption.replace(",", ".")
      consumption = Number.parseFloat(normalizedConsumption)
    } else if (trip.selectedModel && trip.selectedBrand) {
      const brand = SORTED_VEHICLES.find((v) => v.brand === trip.selectedBrand)
      if (brand) {
        const model = brand.models.find((m) => m.name === trip.selectedModel)
        consumption = model?.avgConsumptionLPer100km || null
      }
    }
    
    if (!consumption || Number.isNaN(consumption) || consumption <= 0) {
      toast.error("Error: consumo inválido en el viaje guardado")
      return
    }
    
    // Use a small delay to ensure states are set, then calculate
    setTimeout(async () => {
      await handleCalculateWithData(
        trip.origin,
        trip.destination,
        consumption,
        Number.parseFloat(trip.fuelPrice),
        trip.timeType,
        trip.selectedDateTime ? new Date(trip.selectedDateTime) : undefined,
        trip.isRoundTrip,
        trip.hasTelepase
      )
    }, 150)
  }
  
  // Helper function to calculate with explicit data (for loading saved trips)
  const handleCalculateWithData = async (
    originData: { lat: number; lng: number },
    destinationData: { lat: number; lng: number },
    consumptionData: number,
    fuelPriceData: number,
    timeTypeData: "now" | "departure" | "arrival",
    selectedDateTimeData?: Date,
    roundTripData?: boolean,
    telepaseData?: boolean
  ) => {
    setError("")
    setLoading(true)

    try {
      if (!originData || !destinationData) {
        setError("Por favor selecciona origen y destino")
        setLoading(false)
        return
      }

      if (!consumptionData || Number.isNaN(consumptionData) || consumptionData <= 0) {
        setError("Por favor ingresa un consumo válido del vehículo")
        setLoading(false)
        return
      }

      if ((timeTypeData === "departure" || timeTypeData === "arrival") && !selectedDateTimeData) {
        setError("Por favor selecciona una fecha y hora para el viaje")
        setLoading(false)
        return
      }

      const requestBody: any = {
        origin: {
          location: {
            latLng: {
              latitude: originData.lat,
              longitude: originData.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destinationData.lat,
              longitude: destinationData.lng,
            },
          },
        },
        travelMode: "DRIVE",
        extraComputations: ["TOLLS"],
      }

      if (timeTypeData === "now") {
        const futureTime = new Date()
        futureTime.setMinutes(futureTime.getMinutes() + 1)
        requestBody.departureTime = futureTime.toISOString()
        requestBody.routingPreference = "TRAFFIC_AWARE"
      } else if (timeTypeData === "departure" && selectedDateTimeData) {
        requestBody.departureTime = selectedDateTimeData.toISOString()
        requestBody.routingPreference = "TRAFFIC_AWARE"
      } else if (timeTypeData === "arrival" && selectedDateTimeData) {
        requestBody.arrivalTime = selectedDateTimeData.toISOString()
      }

      const routeResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.polyline",
        },
        body: JSON.stringify(requestBody),
      })

      if (!routeResponse.ok) {
        let errorMessage = "Error al calcular la ruta. Verifica tu API Key y que tenga las APIs habilitadas."
        try {
          const errorData = await routeResponse.json()
          console.error("API Error:", errorData)
          if (errorData.error?.message) {
            errorMessage = `Error: ${errorData.error.message}`
          } else if (errorData.message) {
            errorMessage = `Error: ${errorData.message}`
          }
        } catch (e) {
          console.error("Error parsing response:", e)
        }
        setError(errorMessage)
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
      const baseDistanceKm = distanceMeters / 1000
      const polyline = route.polyline?.encodedPolyline || null
      setRoutePolyline(polyline)

      let baseTollCost = 0
      if (route.travelAdvisory?.tollInfo?.estimatedPrice) {
        const prices = route.travelAdvisory.tollInfo.estimatedPrice
        console.log("Precios encontrados:", prices)
        if (Array.isArray(prices) && prices.length > 0) {
          const priceCosts = prices.map((priceData) => {
            const units = Number(priceData.units) || 0
            const nanos = Number(priceData.nanos) || 0
            return units + nanos / 1e9
          })
          baseTollCost = Math.min(...priceCosts)
        }
      }

      const durationString = route.duration || "0s"
      const durationMatch = durationString.match(/(\d+)s/)
      const baseDurationSeconds = durationMatch ? Number.parseInt(durationMatch[1]) : 0

      setBaseRouteData({
        distanceKm: baseDistanceKm,
        tollCost: baseTollCost,
        durationSeconds: baseDurationSeconds,
        consumption: consumptionData,
        fuelPrice: fuelPriceData,
      })

      calculateResultsFromBase(
        baseDistanceKm,
        baseTollCost,
        baseDurationSeconds,
        consumptionData,
        fuelPriceData,
        roundTripData || false,
        telepaseData || false
      )
    } catch (err) {
      console.error("[v0] Calculation error:", err)
      setError("Error al calcular el viaje. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  // Delete trip from saved trips
  const handleDeleteTrip = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updatedTrips = savedTrips.filter((trip) => trip.id !== tripId)
    setSavedTrips(updatedTrips)
    localStorage.setItem("rutear_history", JSON.stringify(updatedTrips))
    toast.success("Viaje eliminado")
  }

  // Recalculate results when round trip toggle or telepase changes
  useEffect(() => {
    if (baseRouteData) {
      // Apply round trip multiplier
      const distanceKm = isRoundTrip ? baseRouteData.distanceKm * 2 : baseRouteData.distanceKm
      let tollCost = isRoundTrip ? baseRouteData.tollCost * 2 : baseRouteData.tollCost
      
      // Apply Telepase discount (30% off = multiply by 0.70)
      if (hasTelepase) {
        tollCost = tollCost * 0.70
      }
      
      const durationSeconds = isRoundTrip ? baseRouteData.durationSeconds * 2 : baseRouteData.durationSeconds

      // Calculate fuel cost
      const litersNeeded = (distanceKm * baseRouteData.consumption) / 100
      const fuelCost = litersNeeded * baseRouteData.fuelPrice
      const totalCost = fuelCost + tollCost

      // Format duration
      const hours = Math.floor(durationSeconds / 3600)
      const minutes = Math.floor((durationSeconds % 3600) / 60)

      setResults({
        distance: distanceKm.toFixed(2),
        duration: `${hours}h ${minutes}m`,
        consumption: baseRouteData.consumption,
        litersNeeded: litersNeeded.toFixed(2),
        fuelCost: fuelCost.toFixed(2),
        tollCost: tollCost.toFixed(2),
        totalCost: totalCost.toFixed(2),
        hasTelepase: hasTelepase,
      })
    }
  }, [isRoundTrip, hasTelepase, baseRouteData])

  const selectedBrandData = SORTED_VEHICLES.find((v) => v.brand === selectedBrand)
  const models = selectedBrandData?.models || []
  const selectedModelData = models.find((m) => m.name === selectedModel)
  const consumption = selectedModelData?.avgConsumptionLPer100km || null

  return (
    <div className="min-h-screen bg-slate-200">
      <header className="sticky top-0 z-50 border-b border-slate-300 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 flex items-center justify-between">
          <img src="/rutear_logo.png" alt="RuteAR Logo" className="h-16 w-auto drop-shadow-lg" />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Mis Viajes</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Mis Viajes Guardados</SheetTitle>
                <SheetDescription>
                  Selecciona un viaje para cargar sus datos o elimínalo si ya no lo necesitas.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-3 max-h-[calc(100vh-150px)] overflow-y-auto">
                {savedTrips.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No tienes viajes guardados aún.</p>
                    <p className="text-sm mt-2">Guarda un viaje usando el botón de marcador.</p>
                  </div>
                ) : (
                  savedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      onClick={() => handleLoadTrip(trip)}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <p className="text-sm font-medium text-slate-900 truncate">{trip.originAddress}</p>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <p className="text-sm font-medium text-slate-900 truncate">{trip.destinationAddress}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            {format(new Date(trip.savedAt), "PPP 'a las' HH:mm", { locale: es })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteTrip(trip.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="mb-4">
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
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white shadow-md border border-slate-200">
              <CardHeader className="border-b border-slate-200 pb-2 pt-0 px-6">
                <CardTitle className="text-blue-600 text-lg">Calcula tu viaje</CardTitle>
                <CardDescription className="text-slate-600 text-sm">Ingresa los datos de tu recorrido</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Brand Selection */}
                <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
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

                {/* Origin and Destination with Swap Button */}
                <div className="relative flex gap-2">
                  <div className="flex-1 max-w-[calc(100%-3rem)] space-y-3">
                    {/* Origin */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-800">Origen</label>
                      <PlacesAutocomplete
                        key={`origin-${originAddress}`}
                        placeholder="Ingresa punto de partida..."
                        onLocationSelect={(coords, address) => {
                          setOrigin(coords)
                          setOriginAddress(address)
                        }}
                        value={originAddress}
                        resetKey={originAddress}
                        apiKey={API_KEY}
                      />
                    </div>
                    
                    {/* Destination */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-800">Destino</label>
                      <PlacesAutocomplete
                        key={`destination-${destinationAddress}`}
                        placeholder="Ingresa punto de llegada..."
                        onLocationSelect={(coords, address) => {
                          setDestination(coords)
                          setDestinationAddress(address)
                        }}
                        value={destinationAddress}
                        resetKey={destinationAddress}
                        apiKey={API_KEY}
                      />
                    </div>
                  </div>
                  
                  {/* Swap Origin and Destination Button - Centered vertically between both inputs */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center" style={{ marginTop: '0.5rem' }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async (e) => {
                        e.preventDefault()
                        const tempOrigin = origin
                        const tempOriginAddress = originAddress
                        const tempDestination = destination
                        const tempDestinationAddress = destinationAddress
                        
                        // Swap the values in state first
                        setOrigin(tempDestination)
                        setOriginAddress(tempDestinationAddress)
                        setDestination(tempOrigin)
                        setDestinationAddress(tempOriginAddress)
                        
                        // If we have results and both origin and destination are set, recalculate with swapped values
                        if (results && tempOrigin && tempDestination) {
                          // Calculate with swapped values immediately (before state updates)
                          await handleCalculate(tempDestination, tempOrigin)
                        }
                      }}
                      className="h-8 w-8 rounded-full border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                      disabled={!origin && !destination}
                    >
                      <ArrowUpDown className="h-4 w-4 text-slate-600" />
                    </Button>
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-800">Horario del Viaje</Label>
                  <Select
                    value={timeType}
                    onValueChange={(value) => {
                      setTimeType(value as "now" | "departure" | "arrival")
                      if (value === "now") {
                        setSelectedDateTime(undefined)
                      } else if (!selectedDateTime) {
                        // Initialize with current date/time if not set
                        const now = new Date()
                        now.setMinutes(0, 0, 0) // Round to nearest hour
                        setSelectedDateTime(now)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full text-slate-800 border-slate-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Salir ahora</SelectItem>
                      <SelectItem value="departure">Salir a las...</SelectItem>
                      <SelectItem value="arrival">Llegar a las...</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Date Time Picker */}
                  {(timeType === "departure" || timeType === "arrival") && (
                    <div className="space-y-1.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal text-slate-800 border-slate-300 bg-white hover:bg-slate-50"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDateTime ? (
                              format(selectedDateTime, "PPP 'a las' HH:mm", { locale: es })
                            ) : (
                              <span>Selecciona fecha y hora</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-3 space-y-3">
                            <Calendar
                              mode="single"
                              selected={selectedDateTime}
                              onSelect={(date) => {
                                if (date) {
                                  // Preserve time if already set, otherwise use current time
                                  if (selectedDateTime) {
                                    const newDate = new Date(date)
                                    newDate.setHours(
                                      selectedDateTime.getHours(),
                                      selectedDateTime.getMinutes(),
                                      0,
                                      0
                                    )
                                    setSelectedDateTime(newDate)
                                  } else {
                                    const newDate = new Date(date)
                                    const now = new Date()
                                    newDate.setHours(now.getHours(), now.getMinutes(), 0, 0)
                                    setSelectedDateTime(newDate)
                                  }
                                } else {
                                  setSelectedDateTime(undefined)
                                }
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                            <div className="flex items-center gap-2 border-t pt-3">
                              <Clock className="h-4 w-4 text-slate-600" />
                              <Input
                                type="time"
                                value={
                                  selectedDateTime
                                    ? `${String(selectedDateTime.getHours()).padStart(2, "0")}:${String(selectedDateTime.getMinutes()).padStart(2, "0")}`
                                    : ""
                                }
                                onChange={(e) => {
                                  const [hours, minutes] = e.target.value.split(":").map(Number)
                                  if (!isNaN(hours) && !isNaN(minutes)) {
                                    if (selectedDateTime) {
                                      const newDate = new Date(selectedDateTime)
                                      newDate.setHours(hours, minutes, 0, 0)
                                      setSelectedDateTime(newDate)
                                    } else {
                                      const newDate = new Date()
                                      newDate.setHours(hours, minutes, 0, 0)
                                      // If time is in the past, set for tomorrow
                                      if (newDate < new Date()) {
                                        newDate.setDate(newDate.getDate() + 1)
                                      }
                                      setSelectedDateTime(newDate)
                                    }
                                  }
                                }}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>

                {/* Consumption */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-800">
                    Consumo del Vehículo (L/100km)
                    {consumption && (
                      <span className="text-xs text-slate-600 ml-2">(Estimado: {consumption.toFixed(1).replace(".", ",")})</span>
                    )}
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="ej: 7,5"
                    value={customConsumption}
                    onChange={(e) => {
                      let value = e.target.value
                      // Block dots completely - remove them if user tries to type them
                      value = value.replace(/\./g, "")
                      // Allow only numbers, comma, and one decimal separator
                      if (value === "" || /^[0-9]+([,][0-9]*)?$/.test(value)) {
                        setCustomConsumption(value)
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent dot key from being entered
                      if (e.key === "." || e.key === "Period") {
                        e.preventDefault()
                      }
                    }}
                    className="text-slate-800 border-slate-300 bg-white"
                  />
                </div>

                {/* Fuel Price */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-800">Precio del Combustible ($/L)</label>
                  <Input
                    type="number"
                    placeholder="ej: 1700"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    className="text-slate-800 border-slate-300 bg-white"
                  />
                </div>

                {/* Passengers */}
                <div className="space-y-1.5">
                  <Label htmlFor="passengers" className="text-sm font-medium text-slate-800">
                    Cantidad de Pasajeros
                  </Label>
                  <Input
                    id="passengers"
                    type="number"
                    min="1"
                    placeholder=""
                    value={passengersInput}
                    onChange={(e) => {
                      const inputValue = e.target.value
                      // Allow empty input and any numeric input while typing
                      setPassengersInput(inputValue)
                      // Update the actual passengers value if it's a valid number >= 1
                      const numValue = Number.parseInt(inputValue, 10)
                      if (inputValue !== "" && !isNaN(numValue) && numValue >= 1) {
                        setPassengers(numValue)
                      }
                    }}
                    onBlur={(e) => {
                      // Validate and set minimum value of 1 when field loses focus
                      const numValue = Number.parseInt(passengersInput, 10)
                      if (passengersInput === "" || isNaN(numValue) || numValue < 1) {
                        setPassengersInput("1")
                        setPassengers(1)
                      } else {
                        setPassengersInput(String(numValue))
                        setPassengers(numValue)
                      }
                    }}
                    className="text-slate-800 border-slate-300 bg-white"
                  />
                </div>

                {/* Round Trip Toggle */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <Label htmlFor="round-trip" className="text-sm font-medium text-slate-800 cursor-pointer">
                    Ida y Vuelta
                  </Label>
                  <Switch id="round-trip" checked={isRoundTrip} onCheckedChange={setIsRoundTrip} />
                </div>

                {/* Telepase Toggle */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex flex-col">
                    <Label htmlFor="telepase" className="text-sm font-medium text-slate-800 cursor-pointer">
                      Telepase 
                    </Label>
                    <span className="text-xs text-slate-500 mt-0.5">
                      * Puede tener una mínima variación del precio real
                    </span>
                  </div>
                  <Switch id="telepase" checked={hasTelepase} onCheckedChange={setHasTelepase} />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCalculate()}
                    disabled={loading || !origin || !destination}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-md transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <Button
                    onClick={handleSaveTrip}
                    disabled={!origin || !destination}
                    variant="outline"
                    className="py-2.5 px-4 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-all shadow-md hover:shadow-lg"
                    title="Guardar viaje"
                  >
                    <Bookmark className="h-5 w-5 text-slate-600" />
                  </Button>
                </div>

                {error && (
                  <div className="text-red-700 text-sm bg-red-50 p-3 rounded-md border border-red-300">{error}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Results only */}
          <div className="lg:col-span-2 space-y-6">
            {results && (
              <ResultsPanel
                results={results}
                passengers={passengers}
                origin={origin}
                destination={destination}
                polyline={routePolyline}
                googleScriptReady={googleScriptReady}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
