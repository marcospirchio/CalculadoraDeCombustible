"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"

interface PlacesAutocompleteProps {
  apiKey: string
  onLocationSelect: (location: { lat: number; lng: number }, address: string) => void
  placeholder?: string
  value?: string
  resetKey?: string
}

declare global {
  interface Window {
    google: any
  }
}

export default function PlacesAutocomplete({
  apiKey,
  onLocationSelect,
  placeholder = "Ingresa una dirección...",
  value,
  resetKey,
}: PlacesAutocompleteProps) {
  const [input, setInput] = useState(value || "")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptReady, setIsScriptReady] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<any>(null)
  const placesServiceRef = useRef<any>(null)

  // Sync with external value prop
  useEffect(() => {
    if (value !== undefined) {
      setInput(value)
    }
  }, [value, resetKey])

  useEffect(() => {
    if (!apiKey) return

    const checkGoogleLoaded = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsScriptReady(true)
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
        placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement("div"))
        console.log("[v0] Google Places library ready in PlacesAutocomplete")
      }
    }

    // Si ya está cargado, usar inmediatamente
    if (window.google && window.google.maps) {
      checkGoogleLoaded()
    } else {
      // Esperar a que se cargue (será cargado por page.tsx)
      const interval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          checkGoogleLoaded()
          clearInterval(interval)
        }
      }, 100)

      // Limpiar intervalo después de 10 segundos
      const timeout = setTimeout(() => clearInterval(interval), 10000)

      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [apiKey])

  const handleInputChange = async (value: string) => {
    setInput(value)

    if (!value.trim() || value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (!isScriptReady || !autocompleteServiceRef.current) {
      console.log("[v0] Places service not ready yet")
      return
    }

    setIsLoading(true)
    try {
      const predictions = await autocompleteServiceRef.current.getPlacePredictions({
        input: value,
        language: "es",
        componentRestrictions: { country: "ar" },
      })

      console.log("[v0] Predictions received:", predictions.predictions?.length || 0)

      if (predictions.predictions) {
        setSuggestions(predictions.predictions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
      }
    } catch (err) {
      console.error("[v0] Autocomplete error:", err)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setInput(description)
    setShowSuggestions(false)

    if (!isScriptReady || !placesServiceRef.current) {
      console.error("[v0] Places service not ready")
      return
    }

    try {
      placesServiceRef.current.getDetails(
        {
          placeId: placeId,
          fields: ["geometry", "name", "formatted_address"],
        },
        (place: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place.geometry) {
            console.log("[v0] Place details received:", place.geometry.location)
            const address = place.name || place.formatted_address || description
            onLocationSelect(
              {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
              address
            )
            // Ensure the input shows the selected address
            setInput(address)
          } else {
            console.error("[v0] Failed to get place details:", status)
          }
        },
      )
    } catch (err) {
      console.error("[v0] Error getting place details:", err)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => input && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={!isScriptReady}
          className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full"></div>
            </div>
          </div>
        )}
        {!isScriptReady && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Cargando...</span>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSelectSuggestion(suggestion.place_id, suggestion.description)}
              className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700"
              type="button"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {suggestion.main_text || suggestion.description}
              </p>
              {suggestion.secondary_text && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{suggestion.secondary_text}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
