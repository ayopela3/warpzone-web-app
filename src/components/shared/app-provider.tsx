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
  userId: string | null
  userRole: string | null
  fiatSymbol: string
  setFiatSymbol: (symbol: string) => void
  addToCart: (item: Omit<CartItem, "quantity">, maxQuantity?: number) => void
  removeFromCart: (id: string) => void
  updateCartQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  requireAuth: () => boolean
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

const cartStorageKey = "warpzone-cart"
const sessionIdKey = "warpzone-session-id"
const userIdKey = "warpzone-user-id"
const userRoleKey = "warpzone-user-role"

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
    return !!window.localStorage.getItem(sessionIdKey)
  })

  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null
    }
    return window.localStorage.getItem(userIdKey)
  })

  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null
    }
    return window.localStorage.getItem(userRoleKey)
  })

  const [fiatSymbol, setFiatSymbol] = useState("$")

  useEffect(() => {
    const fetchFiatSymbol = async () => {
      try {
        const response = await fetch("/api/settings/fiat")
        const data = await response.json()
        if (data.success && data.fiatSymbol) {
          setFiatSymbol(data.fiatSymbol)
        }
      } catch (error) {
        console.error("Failed to fetch fiat symbol:", error)
      }
    }
    fetchFiatSymbol()
  }, [])

  useEffect(() => {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems))
  }, [cartItems])

  const addToCart = useCallback((item: Omit<CartItem, "quantity">, maxQuantity?: number) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((cartItem) => cartItem.id === item.id)

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1
        if (maxQuantity !== undefined && newQuantity > maxQuantity) {
          return currentItems
        }
        return currentItems.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        )
      }

      if (maxQuantity === 0) {
        return currentItems
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

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (data.success) {
        return { success: true }
      }
      return { success: false, error: data.error || "Sign up failed" }
    } catch {
      return { success: false, error: "Network error" }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (data.success) {
        window.localStorage.setItem(sessionIdKey, data.sessionId)
        window.localStorage.setItem(userIdKey, data.userId)
        window.localStorage.setItem(userRoleKey, data.userRole || "regular-user")
        setIsAuthenticated(true)
        setUserId(data.userId)
        setUserRole(data.userRole || "regular-user")
        return { success: true }
      }
      return { success: false, error: data.error || "Sign in failed" }
    } catch {
      return { success: false, error: "Network error" }
    }
  }, [])

  const signOut = useCallback(async () => {
    const sessionId = window.localStorage.getItem(sessionIdKey)
    if (sessionId) {
      try {
        await fetch("/api/auth/signout", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionId}` },
        })
      } catch {
        // Ignore signout errors
      }
    }
    window.localStorage.removeItem(sessionIdKey)
    window.localStorage.removeItem(userIdKey)
    window.localStorage.removeItem(userRoleKey)
    setIsAuthenticated(false)
    setUserId(null)
    setUserRole(null)
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
      userId,
      userRole,
      fiatSymbol,
      setFiatSymbol,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      signUp,
      signIn,
      signOut,
      requireAuth,
    }
  }, [cartItems, isAuthenticated, userId, userRole, fiatSymbol, setFiatSymbol, addToCart, removeFromCart, updateCartQuantity, clearCart, signUp, signIn, signOut, requireAuth])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }

  return context
}
