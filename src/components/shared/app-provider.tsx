"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type CartItem = {
  id: string
  name: string
  price: number
  category: string
  quantity: number
}

type AppContextValue = {
  cartItems: CartItem[]
  cartCount: number
  cartTotal: number
  isAuthenticated: boolean
  addToCart: (item: Omit<CartItem, "quantity">) => void
  removeFromCart: (id: string) => void
  updateCartQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  signIn: () => void
  signOut: () => void
  requireAuth: () => boolean
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

const cartStorageKey = "warpzone-cart"
const authStorageKey = "warpzone-authenticated"

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return []
    }

    const savedCart = window.localStorage.getItem(cartStorageKey)
    return savedCart ? JSON.parse(savedCart) as CartItem[] : []
  })

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }

    return window.localStorage.getItem(authStorageKey) === "true"
  })

  useEffect(() => {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    window.localStorage.setItem(authStorageKey, String(isAuthenticated))
  }, [isAuthenticated])

  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((cartItem) => cartItem.id === item.id)

      if (existingItem) {
        return currentItems.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      }

      return [...currentItems, { ...item, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== id))
  }, [])

  const updateCartQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id)
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const signIn = useCallback(() => {
    setIsAuthenticated(true)
  }, [])

  const signOut = useCallback(() => {
    setIsAuthenticated(false)
  }, [])

  const requireAuth = useCallback(() => {
    if (isAuthenticated) {
      return true
    }

    window.alert("Please sign in before continuing.")
    return false
  }, [isAuthenticated])

  const value = useMemo<AppContextValue>(() => {
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)
    const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)

    return {
      cartItems,
      cartCount,
      cartTotal,
      isAuthenticated,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      signIn,
      signOut,
      requireAuth,
    }
  }, [cartItems, isAuthenticated, addToCart, removeFromCart, updateCartQuantity, clearCart, signIn, signOut, requireAuth])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }

  return context
}
