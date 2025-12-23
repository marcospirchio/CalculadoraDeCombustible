"use client"

import { useEffect, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function CafecitoButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Delay para animación de entrada suave
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ease-out ${
          isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        }`}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="block transition-transform duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 cursor-pointer"
          aria-label="Invitame un café en cafecito.app"
        >
          <img
            src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
            srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
            alt="Invitame un café en cafecito.app"
            className="drop-shadow-lg w-auto h-auto max-w-[150px] sm:max-w-[170px]"
            loading="lazy"
          />
        </button>
      </div>

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "transition-opacity duration-300 ease-in-out"
            )}
          />
          <Dialog.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg rounded-xl",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:scale-95 data-[state=open]:scale-100",
              "transition-all duration-300 ease-in-out"
            )}
          >
            <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Dialog.Close>

            <Dialog.Title className="sr-only">
              Invitame un cafecito
            </Dialog.Title>

            <div className="flex flex-col items-center gap-6 py-4">
              <Dialog.Description className="text-center text-base text-slate-700 leading-relaxed">
                Si te gustó el proyecto y querés colaborar para que pueda hacer más herramientas para ustedes, me ayudarías mucho invitandome un cafecito! :)
              </Dialog.Description>

              <a
                href="https://cafecito.app/marcospirchio"
                rel="noopener noreferrer"
                target="_blank"
                className="block transition-transform duration-300 hover:scale-105 active:scale-95"
                aria-label="Invitame un café en cafecito.app"
              >
                <img
                  src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
                  srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
                  alt="Invitame un café en cafecito.app"
                  className="drop-shadow-lg w-auto h-auto max-w-[150px] sm:max-w-[170px]"
                  loading="lazy"
                />
              </a>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

