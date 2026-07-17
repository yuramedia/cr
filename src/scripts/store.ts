// Reactive state management store for Crunchyroll Tracker
import type { Episode, Filters, ViewMode, AppEvent, AppState } from "../types"

// Initial state
const initialState: AppState = {
    episodes: [],
    filters: {
        search: "",
        audio: "all",
        sub: "all"
    },
    viewMode: "feed",
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    error: null,
    lastUpdate: null,
    accessToken: null
}

// Store implementation with subscription pattern
class Store {
    private state: AppState = { ...initialState }
    private listeners: Set<(state: AppState) => void> = new Set()
    private filterCache: Map<string, Episode[]> = new Map()

    // Get current state (immutable copy)
    getState(): Readonly<AppState> {
        return Object.freeze({ ...this.state })
    }

    // Subscribe to state changes
    subscribe(listener: (state: AppState) => void): () => void {
        this.listeners.add(listener)
        // Return unsubscribe function
        return () => this.listeners.delete(listener)
    }

    // Dispatch event to update state
    dispatch(event: AppEvent): void {
        const prevState = this.state
        this.state = this.reducer(this.state, event)

        // Clear filter cache if filters changed
        if (event.type === "SET_FILTERS") {
            this.filterCache.clear()
        }

        // Notify listeners if state changed
        if (this.state !== prevState) {
            this.notify()
        }
    }

    // Reducer function
    private reducer(state: AppState, event: AppEvent): AppState {
        switch (event.type) {
            case "FETCH_START":
                return { ...state, isLoading: true, error: null }

            case "FETCH_SUCCESS":
                return {
                    ...state,
                    isLoading: false,
                    episodes: event.episodes,
                    hasMore: event.hasMore,
                    error: null
                }

            case "FETCH_ERROR":
                return { ...state, isLoading: false, error: event.error }

            case "LOAD_MORE_START":
                return { ...state, isLoadingMore: true }

            case "LOAD_MORE_SUCCESS":
                return {
                    ...state,
                    isLoadingMore: false,
                    episodes: [...state.episodes, ...event.episodes],
                    hasMore: event.hasMore
                }

            case "SET_FILTERS":
                return {
                    ...state,
                    filters: { ...state.filters, ...event.filters }
                }

            case "SET_VIEW_MODE":
                return { ...state, viewMode: event.mode }

            case "SET_ACCESS_TOKEN":
                return { ...state, accessToken: event.token }

            case "UPDATE_EPISODES":
                return { ...state, episodes: event.episodes }

            case "CLEAR_ERROR":
                return { ...state, error: null }

            default:
                return state
        }
    }

    // Notify all listeners
    private notify(): void {
        const state = this.getState()
        this.listeners.forEach(listener => listener(state))
    }

    // Get filtered episodes with caching
    getFilteredEpisodes(): Episode[] {
        const { filters, episodes } = this.state
        const cacheKey = `${filters.search}|${filters.audio}|${filters.sub}`

        if (this.filterCache.has(cacheKey)) {
            return this.filterCache.get(cacheKey)!
        }

        const filtered = episodes.filter(ep => this.episodePassesFilter(ep, filters))
        this.filterCache.set(cacheKey, filtered)
        return filtered
    }

    // Filter logic
    private episodePassesFilter(ep: Episode, filters: Filters): boolean {
        // Search filter
        if (filters.search) {
            const queryTerms = filters.search
                .toLowerCase()
                .split(/\s+/)
                .filter(t => t.length > 0)
            if (queryTerms.length > 0) {
                const searchText = [
                    ep.title,
                    ep.seriesTitle,
                    `episode ${ep.episodeNumber}`,
                    ep.audioLocale,
                    ep.subtitles.join(" ")
                ]
                    .join(" ")
                    .toLowerCase()

                const matchesAll = queryTerms.every(term => searchText.includes(term))
                if (!matchesAll) return false
            }
        }

        // Audio filter
        if (filters.audio !== "all" && ep.audioLocale !== filters.audio) {
            return false
        }

        // Subtitle filter
        if (filters.sub !== "all") {
            const subUpper = filters.sub.toUpperCase()
            const hasSub = ep.subtitles.some(sub => sub.toUpperCase().includes(subUpper))
            if (!hasSub) return false
        }

        return true
    }

    // Batch update for performance
    batchUpdate(updates: Partial<AppState>): void {
        this.state = { ...this.state, ...updates }
        this.filterCache.clear()
        this.notify()
    }

    // Reset to initial state
    reset(): void {
        this.state = { ...initialState }
        this.filterCache.clear()
        this.notify()
    }
}

// Singleton instance
export const store = new Store()

// Convenience hooks for common operations
export const actions = {
    fetchStart: () => store.dispatch({ type: "FETCH_START" }),
    fetchSuccess: (episodes: Episode[], hasMore: boolean) =>
        store.dispatch({ type: "FETCH_SUCCESS", episodes, hasMore }),
    fetchError: (error: string) => store.dispatch({ type: "FETCH_ERROR", error }),
    loadMoreStart: () => store.dispatch({ type: "LOAD_MORE_START" }),
    loadMoreSuccess: (episodes: Episode[], hasMore: boolean) =>
        store.dispatch({ type: "LOAD_MORE_SUCCESS", episodes, hasMore }),
    setFilters: (filters: Partial<Filters>) => store.dispatch({ type: "SET_FILTERS", filters }),
    setViewMode: (mode: ViewMode) => store.dispatch({ type: "SET_VIEW_MODE", mode }),
    setAccessToken: (token: string) => store.dispatch({ type: "SET_ACCESS_TOKEN", token }),
    updateEpisodes: (episodes: Episode[]) => store.dispatch({ type: "UPDATE_EPISODES", episodes }),
    clearError: () => store.dispatch({ type: "CLEAR_ERROR" })
}
