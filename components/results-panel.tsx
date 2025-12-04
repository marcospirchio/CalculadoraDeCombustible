"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Clock, Droplet, DollarSign, AlertCircle } from "lucide-react"

interface ResultsPanelProps {
  results: {
    distance: string
    duration: string
    consumption: number
    litersNeeded: string
    fuelCost: string
    tollCost: string
    totalCost: string
  }
}

export default function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Resumen del Viaje</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Distance */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Distancia</CardTitle>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-800">
              {results.distance}
              <span className="text-sm font-normal ml-2">km</span>
            </p>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Duración</CardTitle>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-800">{results.duration}</p>
          </CardContent>
        </Card>

        {/* Consumption */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Consumo</CardTitle>
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-800">
              {results.consumption}
              <span className="text-sm font-normal ml-2">L/100km</span>
            </p>
          </CardContent>
        </Card>

        {/* Liters */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Litros</CardTitle>
              <Droplet className="w-5 h-5 text-cyan-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-800">
              {results.litersNeeded}
              <span className="text-sm font-normal ml-2">L</span>
            </p>
          </CardContent>
        </Card>

        {/* Total - spans 1 column on desktop */}
        <Card className="bg-green-50 border border-green-300 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-700">Total</CardTitle>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">$ {results.totalCost}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border border-slate-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-slate-800">Desglose de Costos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-700">Costo de Combustible</span>
              <span className="font-semibold text-slate-800">$ {results.fuelCost}</span>
            </div>

            {Number.parseFloat(results.tollCost) > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-amber-900">Costo de Peajes</span>
                <span className="font-semibold text-amber-900">$ {results.tollCost}</span>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-300">
              <span className="font-semibold text-green-900">Total del Viaje</span>
              <span className="font-bold text-green-600 text-lg">$ {results.totalCost}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
