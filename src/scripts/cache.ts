// LocalStorage caching wrappers for Crunchyroll Tracker

import { CACHE_KEY, CACHE_TIME_KEY, COVERS_CACHE_KEY, MAX_CACHED_EPISODES } from "./constants";

export function loadEpisodesCache(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    console.error("Failed to load episodes cache:", e);
    return [];
  }
}

export function saveEpisodesCache(episodes: any[]): void {
  if (typeof window === "undefined") return;
  try {
    const toStore = episodes.slice(0, MAX_CACHED_EPISODES);
    localStorage.setItem(CACHE_KEY, JSON.stringify(toStore));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.error("Failed to save episodes cache:", e);
  }
}

export function loadCoversCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(COVERS_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.error("Failed to load covers cache:", e);
    return {};
  }
}

export function saveCoversCache(covers: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COVERS_CACHE_KEY, JSON.stringify(covers));
  } catch (e) {
    console.error("Failed to save covers cache:", e);
  }
}

export function clearCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIME_KEY);
}
