"use client"

import { useEffect, useState } from "react"

export function CafecitoButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Delay para animación de entrada suave
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
      }`}
    >
      <a
        href="https://cafecito.app/marcospirchio"
        rel="noopener noreferrer"
        target="_blank"
        className="block transition-transform duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95"
        aria-label="Invitame un café en cafecito.app"
      >
        <img
          src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
          srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
          alt="Invitame un café en cafecito.app"
          className="drop-shadow-lg w-auto h-auto max-w-[160px] sm:max-w-[180px]"
          loading="lazy"
        />
      </a>
    </div>
  )
}

