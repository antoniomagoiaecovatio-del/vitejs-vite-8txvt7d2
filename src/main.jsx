import React, { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"

import "./globals.css"

// Si el panel se actualizó mientras la pestaña estaba abierta, los archivos cargados bajo demanda
// (herramientas, PDF) cambian de nombre y la versión vieja no los encuentra: se recarga una sola vez.
window.addEventListener("vite:preloadError", (e) => {
  try {
    if (sessionStorage.getItem("recarga-por-version") === "1") return
    sessionStorage.setItem("recarga-por-version", "1")
  } catch {
    /* ignorar */
  }
  e.preventDefault()
  window.location.reload()
})

const rootElement = document.getElementById("root")
const root = createRoot(rootElement)

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
