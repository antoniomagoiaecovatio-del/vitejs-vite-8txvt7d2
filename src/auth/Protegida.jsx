// Envoltorio para herramientas que viven dentro del panel (como el Estimador de obras FV) y necesitan
// usuario, contraseña y permiso. Se carga recién al entrar a la herramienta, así el panel no descarga
// Supabase hasta que hace falta.
//   <Protegida titulo="..." subtitulo="..." herramienta="estimador">{contenido}</Protegida>
import React from 'react'
import RequiereLogin from './RequiereLogin'

export default function Protegida({ titulo, subtitulo, herramienta, children }) {
  return (
    <RequiereLogin titulo={titulo} subtitulo={subtitulo} herramienta={herramienta}>
      {() => children}
    </RequiereLogin>
  )
}
