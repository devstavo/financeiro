"use client"

import type React from "react"

import { useState, useEffect } from "react"

interface LoadingWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function LoadingWrapper({ children, fallback }: LoadingWrapperProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
