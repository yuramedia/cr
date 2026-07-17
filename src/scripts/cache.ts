// LocalStorage caching wrappers for Crunchyroll Tracker
import type { Episode } from "../types"
import { CACHE_KEY, CACHE_TIME_KEY, COVERS_CACHE_KEY, MAX_CACHED_EPISODES } from "./constants"

/**
 * Load episodes from localStorage cache
 */
export function loadEpisodesCache(): Episode[] {
    if (typeof window === "undefined") return []
    try {
        const cached = localStorage.getItem(CACHE_KEY)
        return cached ? JSON.parse(cached) : []
    } catch (e) {
        console.error("Failed to load episodes cache:", e)
        return []
    }
}

/**
 * Save episodes to localStorage cache
 */
export function saveEpisodesCache(episodes: Episode[]): void {
    if (typeof window === "undefined") return
    try {
        const toStore = episodes.slice(0, MAX_CACHED_EPISODES)
        localStorage.setItem(CACHE_KEY, JSON.stringify(toStore))
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString())
    } catch (e) {
        console.error("Failed to save episodes cache:", e)
    }
}

/**
 * Load series covers cache
 */
export function loadCoversCache(): Record<string, string> {
    if (typeof window === "undefined") return {}
    try {
        const cached = localStorage.getItem(COVERS_CACHE_KEY)
        return cached ? JSON.parse(cached) : {}
    } catch (e) {
        console.error("Failed to load covers cache:", e)
        return {}
    }
}

/**
 * Save series covers cache
 */
export function saveCoversCache(covers: Record<string, string>): void {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(COVERS_CACHE_KEY, JSON.stringify(covers))
    } catch (e) {
        console.error("Failed to save covers cache:", e)
    }
}

/**
 * Get cache timestamp
 */
export function getCacheTime(): number | null {
    if (typeof window === "undefined") return null
    const time = localStorage.getItem(CACHE_TIME_KEY)
    return time ? parseInt(time, 10) : null
}

/**
 * Check if cache is expired
 */
export function isCacheExpired(lifetime: number): boolean {
    const cacheTime = getCacheTime()
    if (!cacheTime) return true
    return Date.now() - cacheTime > lifetime
}

/**
 * Clear all cache
 */
export function clearCache(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_TIME_KEY)
}

/**
 * Clear covers cache
 */
export function clearCoversCache(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(COVERS_CACHE_KEY)
}
