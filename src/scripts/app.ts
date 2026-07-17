// Main application orchestration for Crunchyroll Tracker
import type { Episode, LanguageMap, ViewMode, Filters } from "../types"
import { store, actions } from "./store"
import { formatEpisode } from "./formatters"
import { getAccessToken, fetchCrunchyrollEpisodes, fetchLanguagesConfig, searchSeries } from "./api"
import { loadEpisodesCache, saveEpisodesCache, loadCoversCache, clearCache, isCacheExpired } from "./cache"
import {
    initTemplates,
    createEpisodeCard,
    createCompactRow,
    createDateSection,
    groupEpisodesByDate,
    groupEpisodesBySeries,
    toggleElement,
    showToast
} from "./renderer"
import { loadSpreadsheetData, populatePipelineForCard } from "./sheet"
import { LANG_MAP, CACHE_LIFETIME, LAST_SEEN_KEY } from "./constants"

/**
 * Main application class
 */
export class CrunchyrollTracker {
    private langMap: LanguageMap = { ...LANG_MAP }
    private seriesCovers: Record<string, string> = {}
    private posterQueue: Array<{ seriesId: string; accessToken: string; resolve: (url: string | null) => void }> = []
    private posterInflight = new Map<string, Promise<string | null>>()
    private posterActiveCount = 0
    private readonly POSTER_CONCURRENCY = 4
    private pollingInterval: ReturnType<typeof setInterval> | null = null
    private searchTimeout: ReturnType<typeof setTimeout> | null = null
    private suggestionsTimeout: ReturnType<typeof setTimeout> | null = null
    private pendingEpisodes: Episode[] | null = null
    private renderedEpisodeIds = new Set<string>()
    private lastRenderedView: ViewMode = "feed"
    private lastRenderedFilterKey = ""

    // DOM element references
    private elements = {
        loadingState: null as HTMLElement | null,
        errorState: null as HTMLElement | null,
        errorMessage: null as HTMLElement | null,
        emptyState: null as HTMLElement | null,
        episodesContainer: null as HTMLElement | null,
        sentinel: null as HTMLElement | null,
        searchInput: null as HTMLInputElement | null,
        searchClearBtn: null as HTMLElement | null,
        audioFilter: null as HTMLSelectElement | null,
        subFilter: null as HTMLSelectElement | null,
        viewSelector: null as HTMLSelectElement | null,
        refreshApiBtn: null as HTMLElement | null,
        lastUpdateTimeSpan: null as HTMLElement | null,
        filtersPanel: null as HTMLElement | null,
        headerFiltersBtn: null as HTMLElement | null,
        filtersArrow: null as HTMLElement | null,
        searchSuggestions: null as HTMLElement | null,
        useProxyCheckbox: null as HTMLInputElement | null,
        customProxyInput: null as HTMLInputElement | null,
        newEpisodesToast: null as HTMLElement | null,
        detailContainer: null as HTMLElement | null,
        detailLoader: null as HTMLElement | null,
        detailContent: null as HTMLElement | null
    }

    /**
     * Initialize the application
     */
    async init(): Promise<void> {
        // Cache DOM elements
        this.cacheElements()

        // Initialize templates
        initTemplates()

        // Load cached data
        this.seriesCovers = loadCoversCache()

        // Fetch languages
        await this.fetchLanguages()

        // Setup event listeners
        this.setupEventListeners()
        this.setupFeedDelegation()
        this.setupInfiniteScroll()

        // Load cached episodes
        this.loadCachedData()

        // Load spreadsheet data
        loadSpreadsheetData()

        // Handle initial route
        await this.handleRoute()

        // Start auto-polling
        this.startAutoPolling()

        // Setup visibility change handler
        this.setupVisibilityHandler()

        // Refresh if cache is expired
        if (isCacheExpired(CACHE_LIFETIME)) {
            this.refreshData(false)
        }
    }

    /**
     * Cache DOM element references
     */
    private cacheElements(): void {
        this.elements.loadingState = document.getElementById("loading-state")
        this.elements.errorState = document.getElementById("error-state")
        this.elements.errorMessage = document.getElementById("error-message")
        this.elements.emptyState = document.getElementById("empty-state")
        this.elements.episodesContainer = document.getElementById("episodes-container")
        this.elements.sentinel = document.getElementById("infinite-scroll-sentinel")
        this.elements.searchInput = document.getElementById("search-input") as HTMLInputElement
        this.elements.searchClearBtn = document.getElementById("search-clear-btn")
        this.elements.audioFilter = document.getElementById("audio-filter") as HTMLSelectElement
        this.elements.subFilter = document.getElementById("sub-filter") as HTMLSelectElement
        this.elements.viewSelector = document.getElementById("view-selector") as HTMLSelectElement
        this.elements.refreshApiBtn = document.getElementById("refresh-api-btn")
        this.elements.lastUpdateTimeSpan = document.getElementById("last-update-time")
        this.elements.filtersPanel = document.getElementById("filters-panel")
        this.elements.headerFiltersBtn = document.getElementById("toggle-filters-btn")
        this.elements.filtersArrow = document.getElementById("filters-arrow")
        this.elements.searchSuggestions = document.getElementById("search-suggestions")
        this.elements.useProxyCheckbox = document.getElementById("use-proxy-checkbox") as HTMLInputElement
        this.elements.customProxyInput = document.getElementById("custom-proxy-input") as HTMLInputElement
        this.elements.newEpisodesToast = document.getElementById("new-episodes-toast")
        this.elements.detailContainer = document.getElementById("detail-container")
        this.elements.detailLoader = document.getElementById("detail-loader")
        this.elements.detailContent = document.getElementById("detail-content")
    }

    /**
     * Fetch and merge language configurations
     */
    private async fetchLanguages(): Promise<void> {
        try {
            const config = await fetchLanguagesConfig()
            if (!config) return

            const merged = { ...this.langMap }
            if (config.timedText) {
                Object.entries(config.timedText).forEach(([code, name]) => {
                    merged[code] = name
                })
            }
            if (config.audio) {
                Object.entries(config.audio).forEach(([code, name]) => {
                    merged[code] = name
                })
            }
            this.langMap = merged
        } catch (err) {
            console.warn("Failed to fetch language configs:", err)
        }
    }

    /**
     * Setup all event listeners
     */
    private setupEventListeners(): void {
        const { elements } = this

        // Toggle filters panel
        elements.headerFiltersBtn?.addEventListener("click", () => {
            elements.filtersPanel?.classList.toggle("hidden")
            const isHidden = elements.filtersPanel?.classList.contains("hidden")
            if (elements.filtersArrow) {
                elements.filtersArrow.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)"
            }
        })

        // Refresh button
        elements.refreshApiBtn?.addEventListener("click", () => {
            const state = store.getState()
            if (!state.isLoading && !state.isLoadingMore) {
                this.refreshData(true)
            }
        })

        // Retry button
        document.getElementById("retry-btn")?.addEventListener("click", () => {
            this.refreshData(true)
        })

        // Search input
        elements.searchInput?.addEventListener("input", e => {
            const val = (e.target as HTMLInputElement).value
            if (elements.searchClearBtn) {
                elements.searchClearBtn.style.display = val.trim() ? "block" : "none"
            }

            // Debounced search
            if (this.searchTimeout) clearTimeout(this.searchTimeout)
            this.searchTimeout = setTimeout(() => {
                actions.setFilters({ search: val.toLowerCase().trim() })
                this.renderFeed()
            }, 150)

            // Suggestions fetch
            if (this.suggestionsTimeout) clearTimeout(this.suggestionsTimeout)
            this.suggestionsTimeout = setTimeout(() => this.fetchSuggestions(val), 250)
        })

        // Search clear
        elements.searchClearBtn?.addEventListener("click", () => {
            if (elements.searchInput) elements.searchInput.value = ""
            actions.setFilters({ search: "" })
            if (elements.searchClearBtn) elements.searchClearBtn.style.display = "none"
            if (elements.searchSuggestions) {
                elements.searchSuggestions.innerHTML = ""
                elements.searchSuggestions.classList.add("hidden")
            }
            this.renderFeed()
        })

        // Click outside to close suggestions
        document.addEventListener("click", e => {
            if (
                elements.searchSuggestions &&
                !elements.searchSuggestions.contains(e.target as Node) &&
                e.target !== elements.searchInput
            ) {
                elements.searchSuggestions.classList.add("hidden")
            }
        })

        // View selector
        elements.viewSelector?.addEventListener("change", e => {
            const mode = (e.target as HTMLSelectElement).value as ViewMode
            actions.setViewMode(mode)
            this.renderFeed()
        })

        // Audio filter
        elements.audioFilter?.addEventListener("change", e => {
            actions.setFilters({ audio: (e.target as HTMLSelectElement).value })
            this.renderFeed()
        })

        // Subtitle filter
        elements.subFilter?.addEventListener("change", e => {
            actions.setFilters({ sub: (e.target as HTMLSelectElement).value })
            this.renderFeed()
        })

        // Reset filters
        document.getElementById("reset-filters-btn")?.addEventListener("click", () => {
            if (elements.searchInput) elements.searchInput.value = ""
            if (elements.audioFilter) elements.audioFilter.value = "all"
            if (elements.subFilter) elements.subFilter.value = "all"
            if (elements.searchClearBtn) elements.searchClearBtn.style.display = "none"
            actions.setFilters({ search: "", audio: "all", sub: "all" })
            this.renderFeed()
        })

        // Proxy checkbox
        elements.useProxyCheckbox?.addEventListener("change", e => {
            localStorage.setItem("cr_use_cors_proxy", String((e.target as HTMLInputElement).checked))
            clearCache()
            if (store.getState().accessToken) {
                actions.setAccessToken("")
            }
            this.fetchLanguages().then(() => this.refreshData(true))
        })

        // Custom proxy input
        elements.customProxyInput?.addEventListener("change", e => {
            localStorage.setItem("cr_custom_cors_proxy", (e.target as HTMLInputElement).value.trim())
            clearCache()
            if (store.getState().accessToken) {
                actions.setAccessToken("")
            }
            this.fetchLanguages().then(() => this.refreshData(true))
        })

        // New episodes toast click
        elements.newEpisodesToast?.addEventListener("click", () => {
            if (this.pendingEpisodes) {
                actions.updateEpisodes(this.pendingEpisodes)
                saveEpisodesCache(this.pendingEpisodes)
                this.updateTimestamp(new Date())
                this.pendingEpisodes = null
                this.hideNewEpisodesToast()
                this.renderFeed()
                window.scrollTo({ top: 0, behavior: "smooth" })
            }
        })

        // Scroll to top auto-commit
        window.addEventListener("scroll", () => {
            if (window.scrollY < 100 && this.pendingEpisodes) {
                actions.updateEpisodes(this.pendingEpisodes)
                saveEpisodesCache(this.pendingEpisodes)
                this.updateTimestamp(new Date())
                this.pendingEpisodes = null
                this.hideNewEpisodesToast()
                this.renderFeed()
            }
        })

        // Hash change routing - no longer used, using popstate instead
        // window.addEventListener('hashchange', () => this.handleRoute());

        // Popstate for back/forward navigation
        window.addEventListener("popstate", () => this.handleRoute())

        // Detail back button
        document.getElementById("detail-back-btn")?.addEventListener("click", () => {
            window.history.pushState({}, "", "/")
            this.handleRoute()
        })
    }

    /**
     * Setup feed event delegation
     */
    private setupFeedDelegation(): void {
        this.elements.episodesContainer?.addEventListener("click", e => {
            const target = e.target as HTMLElement

            // Copy ID button
            const copyBtn = target.closest(".id-box") as HTMLElement | null
            if (copyBtn?.textContent) {
                e.stopPropagation()
                this.copyToClipboard(copyBtn.textContent.trim())
                return
            }

            // Watch link
            const watchLink = target.closest("[data-watch-id]") as HTMLElement | null
            if (watchLink) {
                const episodeId = watchLink.dataset.watchId
                if (episodeId) this.handleWatchedToggle(episodeId)
            }
        })
    }

    /**
     * Setup infinite scroll observer
     */
    private setupInfiniteScroll(): void {
        if (!this.elements.sentinel) return

        const observer = new IntersectionObserver(
            async entries => {
                const state = store.getState()
                if (entries[0].isIntersecting && !state.isLoading && !state.isLoadingMore && state.hasMore) {
                    await this.loadNextPage()
                }
            },
            { rootMargin: "300px" }
        )

        observer.observe(this.elements.sentinel)
    }

    /**
     * Setup visibility change handler for polling
     */
    private setupVisibilityHandler(): void {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                if (isCacheExpired(CACHE_LIFETIME)) {
                    this.refreshData(false)
                }
                this.startAutoPolling()
            } else {
                this.stopAutoPolling()
            }
        })
    }

    /**
     * Start auto-polling
     */
    private startAutoPolling(): void {
        if (this.pollingInterval) clearInterval(this.pollingInterval)

        this.pollingInterval = setInterval(async () => {
            const state = store.getState()
            if (document.visibilityState === "visible" && !state.isLoading && !state.isLoadingMore) {
                console.log("Auto-polling triggered background refresh...")
                await this.refreshData(false)
            }
        }, 60 * 1000) // 1 minute
    }

    /**
     * Stop auto-polling
     */
    private stopAutoPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null
        }
    }

    /**
     * Load cached data on startup
     */
    private loadCachedData(): void {
        try {
            const cached = loadEpisodesCache()
            if (cached.length > 0) {
                actions.updateEpisodes(cached)

                const cacheTime = localStorage.getItem("cr_episodes_time_v3")
                if (cacheTime) {
                    this.updateTimestamp(new Date(parseInt(cacheTime, 10)))
                }

                toggleElement(this.elements.loadingState, false)
                this.renderFeed()
            }
        } catch (e) {
            console.error("Error loading cached data:", e)
        }
    }

    /**
     * Refresh data from API
     */
    private async refreshData(isManual: boolean): Promise<void> {
        const state = store.getState()
        if (state.isLoading || state.isLoadingMore) return

        actions.fetchStart()
        this.toggleLoadingUI(true)

        try {
            if (isManual) {
                actions.setAccessToken("") // Force token refresh
            }

            // Get access token
            let token = state.accessToken
            if (!token) {
                token = await getAccessToken()
                if (!token) {
                    const useProxy = localStorage.getItem("cr_use_cors_proxy") !== "false"
                    throw new Error(
                        useProxy
                            ? "Could not acquire Crunchyroll token. Please check your internet connection or CORS proxy status."
                            : "Could not acquire Crunchyroll token. Since CORS Proxy is disabled, please ensure your browser CORS extension is active."
                    )
                }
                actions.setAccessToken(token)
            }

            // Fetch episodes
            const episodes = await fetchCrunchyrollEpisodes(token, 0)
            if (!episodes || episodes.length === 0) {
                throw new Error("No episodes returned from Crunchyroll.")
            }

            const formatted = episodes.map(ep => formatEpisode(ep))

            // Check for new content
            const hasNewContent =
                state.episodes.length === 0 || (formatted.length > 0 && formatted[0].id !== state.episodes[0].id)

            if (hasNewContent) {
                if (!isManual && window.scrollY >= 100) {
                    // User is scrolled down - show notification
                    this.pendingEpisodes = formatted
                    this.showNewEpisodesToast()
                } else {
                    // Normal update
                    actions.fetchSuccess(formatted, episodes.length >= 60)
                    saveEpisodesCache(formatted)
                    this.updateTimestamp(new Date())
                    toggleElement(this.elements.errorState, false)
                    toggleElement(this.elements.loadingState, false)
                    this.hideNewEpisodesToast()
                    this.pendingEpisodes = null
                    this.renderFeed()
                }
            } else {
                // No new content - just update timestamp
                const now = Date.now()
                localStorage.setItem("cr_episodes_time_v3", now.toString())
                this.updateTimestamp(new Date(now))
                toggleElement(this.elements.errorState, false)
                toggleElement(this.elements.loadingState, false)
            }
        } catch (err) {
            console.error("Refresh API failed:", err)
            const state = store.getState()

            if (state.episodes.length === 0) {
                if (this.elements.errorMessage) {
                    this.elements.errorMessage.textContent =
                        (err as Error).message || "Failed to load Crunchyroll data."
                }
                toggleElement(this.elements.errorState, true)
                toggleElement(this.elements.loadingState, false)
                toggleElement(this.elements.episodesContainer, false)
            } else {
                showToast("Error updating releases. Showing cached data.")
            }
            actions.fetchError((err as Error).message)
        } finally {
            this.toggleLoadingUI(false)
        }
    }

    /**
     * Load next page of episodes
     */
    private async loadNextPage(): Promise<void> {
        const state = store.getState()
        if (state.isLoading || state.isLoadingMore || !state.hasMore) return

        actions.loadMoreStart()
        toggleElement(this.elements.sentinel, true)

        try {
            const token = state.accessToken || (await getAccessToken())
            if (!token) throw new Error("Could not acquire token.")

            const offset = state.episodes.length
            const episodes = await fetchCrunchyrollEpisodes(token, offset)

            if (!episodes || episodes.length === 0) {
                actions.loadMoreSuccess([], false)
                toggleElement(this.elements.sentinel, false)
                return
            }

            const formatted = episodes.map(ep => formatEpisode(ep))
            const allEpisodes = [...state.episodes, ...formatted]

            actions.loadMoreSuccess(formatted, episodes.length >= 60)
            saveEpisodesCache(allEpisodes)
            this.renderFeed({ appendOnly: true, newEpisodes: formatted })
        } catch (err) {
            console.error("Failed to load older episodes:", err)
            showToast("Failed to load older episodes.")
        }
    }

    /**
     * Main render function
     */
    private renderFeed(options: { appendOnly?: boolean; newEpisodes?: Episode[] } = {}): void {
        const state = store.getState()
        const filtered = store.getFilteredEpisodes()
        const filterKey = `${state.filters.search}|${state.filters.audio}|${state.filters.sub}`

        if (!this.elements.episodesContainer) return

        // Handle append-only case
        if (
            options.appendOnly &&
            filterKey === this.lastRenderedFilterKey &&
            state.viewMode === this.lastRenderedView
        ) {
            const newEps = (options.newEpisodes || []).filter(ep => this.episodePassesFilter(ep, state.filters))
            if (newEps.length > 0) {
                if (state.viewMode === "feed") {
                    this.appendFeedCards(newEps)
                } else if (state.viewMode === "compact") {
                    this.appendCompactRows(newEps)
                }
                return
            }
        }

        // Full render
        this.renderFullFeed(filtered)
    }

    /**
     * Render full feed
     */
    private renderFullFeed(episodes: Episode[]): void {
        const state = store.getState()

        // Handle empty state
        if (episodes.length === 0) {
            toggleElement(this.elements.emptyState, true)
            toggleElement(this.elements.episodesContainer, false)
            toggleElement(this.elements.sentinel, false)
            this.renderedEpisodeIds.clear()
            return
        }

        toggleElement(this.elements.emptyState, false)
        toggleElement(this.elements.episodesContainer, true)
        toggleElement(this.elements.sentinel, state.hasMore)

        this.renderedEpisodeIds.clear()
        this.lastRenderedView = state.viewMode
        this.lastRenderedFilterKey = `${state.filters.search}|${state.filters.audio}|${state.filters.sub}`

        switch (state.viewMode) {
            case "feed":
                this.renderFeedCardView(episodes)
                break
            case "compact":
                this.renderCompactView(episodes)
                break
            case "series":
                this.renderSeriesView(episodes)
                break
            case "schedule":
                this.renderScheduleView(episodes)
                break
        }
    }

    /**
     * Render card feed view
     */
    private renderFeedCardView(episodes: Episode[]): void {
        const watchedId = localStorage.getItem(LAST_SEEN_KEY)
        const groups = groupEpisodesByDate(episodes)

        this.elements.episodesContainer!.innerHTML = ""
        const fragment = document.createDocumentFragment()

        groups.forEach((eps, dateStr) => {
            const section = createDateSection(dateStr)
            const grid = section.querySelector(".feed-grid") as HTMLElement

            eps.forEach(ep => {
                this.renderedEpisodeIds.add(ep.id)
                const card = createEpisodeCard(ep, this.langMap, watchedId, id => this.handleWatchedToggle(id))
                populatePipelineForCard(card, ep.seriesTitle, ep.episodeNumber)
                grid.appendChild(card)
            })

            fragment.appendChild(section)
        })

        this.elements.episodesContainer!.appendChild(fragment)
    }

    /**
     * Render compact list view
     */
    private renderCompactView(episodes: Episode[]): void {
        const watchedId = localStorage.getItem(LAST_SEEN_KEY)

        const listWrapper = document.createElement("div")
        listWrapper.className = "compact-list flex flex-col gap-3 w-full"

        const fragment = document.createDocumentFragment()
        episodes.forEach(ep => {
            this.renderedEpisodeIds.add(ep.id)
            fragment.appendChild(createCompactRow(ep, this.langMap, watchedId))
        })

        listWrapper.appendChild(fragment)
        this.elements.episodesContainer!.innerHTML = ""
        this.elements.episodesContainer!.appendChild(listWrapper)
    }

    /**
     * Render series grouped view
     */
    private renderSeriesView(episodes: Episode[]): void {
        const watchedId = localStorage.getItem(LAST_SEEN_KEY)
        const groups = groupEpisodesBySeries(episodes)
        const state = store.getState()

        const grid = document.createElement("div")
        grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

        groups.forEach(group => {
            const card = this.createSeriesCard(group, watchedId, state.accessToken)
            grid.appendChild(card)
        })

        this.elements.episodesContainer!.innerHTML = ""
        this.elements.episodesContainer!.appendChild(grid)
    }

    /**
     * Render weekly schedule view
     */
    private renderScheduleView(episodes: Episode[]): void {
        const watchedId = localStorage.getItem(LAST_SEEN_KEY)
        const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

        const scheduleGroups: Record<string, Episode[]> = {
            MONDAY: [],
            TUESDAY: [],
            WEDNESDAY: [],
            THURSDAY: [],
            FRIDAY: [],
            SATURDAY: [],
            SUNDAY: []
        }

        episodes.forEach(ep => {
            const date = new Date(ep.releasedAt)
            const dayName = days[date.getDay()]
            scheduleGroups[dayName].push(ep)
        })

        const scheduleGrid = document.createElement("div")
        scheduleGrid.className = "grid grid-cols-1 md:grid-cols-7 gap-4 items-start w-full"

        Object.entries(scheduleGroups).forEach(([day, eps]) => {
            const col = this.createScheduleColumn(day, eps, watchedId)
            scheduleGrid.appendChild(col)
        })

        this.elements.episodesContainer!.innerHTML = ""
        this.elements.episodesContainer!.appendChild(scheduleGrid)
    }

    // Additional helper methods would continue here...
    // (truncated for brevity - full implementation would include all view renderers)

    /**
     * Filter episode
     */
    private episodePassesFilter(ep: Episode, filters: Filters): boolean {
        if (filters.search) {
            const queryTerms = filters.search.split(/\s+/).filter(t => t.length > 0)
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
                if (!queryTerms.every(term => searchText.includes(term))) return false
            }
        }
        if (filters.audio !== "all" && ep.audioLocale !== filters.audio) return false
        if (filters.sub !== "all") {
            const subUpper = filters.sub.toUpperCase()
            if (!ep.subtitles.some(sub => sub.toUpperCase().includes(subUpper))) return false
        }
        return true
    }

    /**
     * Append feed cards
     */
    private appendFeedCards(newEpisodes: Episode[]): void {
        const _watchedId = localStorage.getItem(LAST_SEEN_KEY)
        newEpisodes.forEach(ep => {
            if (this.renderedEpisodeIds.has(ep.id)) return
            this.renderedEpisodeIds.add(ep.id)
            // Implementation would add to existing grid
        })
    }

    /**
     * Append compact rows
     */
    private appendCompactRows(newEpisodes: Episode[]): void {
        const watchedId = localStorage.getItem(LAST_SEEN_KEY)
        const listWrapper = this.elements.episodesContainer?.querySelector(".compact-list")
        if (!listWrapper) return

        newEpisodes.forEach(ep => {
            if (this.renderedEpisodeIds.has(ep.id)) return
            this.renderedEpisodeIds.add(ep.id)
            listWrapper.appendChild(createCompactRow(ep, this.langMap, watchedId))
        })
    }

    /**
     * Handle watched toggle
     */
    private handleWatchedToggle(episodeId: string): void {
        const currentWatched = localStorage.getItem(LAST_SEEN_KEY)
        if (currentWatched === episodeId) {
            localStorage.removeItem(LAST_SEEN_KEY)
        } else {
            localStorage.setItem(LAST_SEEN_KEY, episodeId)
        }
        // Update UI would happen here
    }

    /**
     * Copy to clipboard
     */
    private copyToClipboard(text: string): void {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(`Copied ID: ${text}`)
            })
        } else {
            // Fallback
            const textArea = document.createElement("textarea")
            textArea.value = text
            textArea.style.position = "fixed"
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand("copy")
            document.body.removeChild(textArea)
            showToast(`Copied ID: ${text}`)
        }
    }

    /**
     * Toggle loading UI
     */
    private toggleLoadingUI(isLoading: boolean): void {
        if (this.elements.refreshApiBtn) {
            ;(this.elements.refreshApiBtn as HTMLButtonElement).disabled = isLoading
            this.elements.refreshApiBtn.textContent = isLoading ? "Refreshing..." : "Refresh API"
        }
    }

    /**
     * Update timestamp display
     */
    private updateTimestamp(date: Date): void {
        if (this.elements.lastUpdateTimeSpan) {
            this.elements.lastUpdateTimeSpan.textContent = date.toTimeString().split(" ")[0]
        }
    }

    /**
     * Show new episodes toast
     */
    private showNewEpisodesToast(): void {
        this.elements.newEpisodesToast?.classList.remove("opacity-0", "pointer-events-none", "-translate-y-4")
        this.elements.newEpisodesToast?.classList.add("opacity-100", "translate-y-0")
    }

    /**
     * Hide new episodes toast
     */
    private hideNewEpisodesToast(): void {
        this.elements.newEpisodesToast?.classList.remove("opacity-100", "translate-y-0")
        this.elements.newEpisodesToast?.classList.add("opacity-0", "pointer-events-none", "-translate-y-4")
    }

    /**
     * Handle routing based on pathname
     */
    private async handleRoute(): Promise<void> {
        const pathname = window.location.pathname

        // Home route
        if (pathname === "/" || pathname === "") {
            toggleElement(this.elements.detailContainer, true)
            toggleElement(this.elements.episodesContainer, false)
            this.renderFeed()
            return
        }

        // Episode detail route: /eps/:id
        const episodeMatch = pathname.match(/^\/eps\/([a-zA-Z0-9]+)$/)
        if (episodeMatch) {
            const episodeId = episodeMatch[1]
            await this.renderEpisodeDetail(episodeId)
            return
        }

        // Series detail route: /series/:id
        const seriesMatch = pathname.match(/^\/series\/([a-zA-Z0-9]+)$/)
        if (seriesMatch) {
            const seriesId = seriesMatch[1]
            await this.renderSeriesDetail(seriesId)
            return
        }

        // Season detail route: /season/:id
        const seasonMatch = pathname.match(/^\/season\/([a-zA-Z0-9]+)$/)
        if (seasonMatch) {
            const seasonId = seasonMatch[1]
            await this.renderSeasonDetail(seasonId)
            return
        }

        // Unknown route - redirect to home
        window.history.replaceState({}, "", "/")
        this.renderFeed()
    }

    /**
     * Render episode detail page
     */
    private async renderEpisodeDetail(_episodeId: string): Promise<void> {
        // Hide feed elements
        toggleElement(this.elements.episodesContainer, true)
        toggleElement(this.elements.sentinel, true)
        toggleElement(this.elements.loadingState, true)
        toggleElement(this.elements.errorState, true)
        toggleElement(this.elements.emptyState, true)
        toggleElement(this.elements.filtersPanel, true)

        // Show detail container
        toggleElement(this.elements.detailContainer, false)
        toggleElement(this.elements.detailLoader, false)
        toggleElement(this.elements.detailContent, true)

        // Implementation continues...
    }

    /**
     * Render series detail page
     */
    private async renderSeriesDetail(_seriesId: string): Promise<void> {
        // Hide feed elements
        toggleElement(this.elements.episodesContainer, true)
        toggleElement(this.elements.sentinel, true)
        toggleElement(this.elements.loadingState, true)
        toggleElement(this.elements.errorState, true)
        toggleElement(this.elements.emptyState, true)
        toggleElement(this.elements.filtersPanel, true)

        // Show detail container
        toggleElement(this.elements.detailContainer, false)
        toggleElement(this.elements.detailLoader, false)
        toggleElement(this.elements.detailContent, true)

        // Implementation continues...
    }

    /**
     * Render season detail page
     */
    private async renderSeasonDetail(_seasonId: string): Promise<void> {
        // Hide feed elements
        toggleElement(this.elements.episodesContainer, true)
        toggleElement(this.elements.sentinel, true)
        toggleElement(this.elements.loadingState, true)
        toggleElement(this.elements.errorState, true)
        toggleElement(this.elements.emptyState, true)
        toggleElement(this.elements.filtersPanel, true)

        // Show detail container
        toggleElement(this.elements.detailContainer, false)
        toggleElement(this.elements.detailLoader, false)
        toggleElement(this.elements.detailContent, true)

        // Implementation continues...
    }

    /**
     * Fetch search suggestions
     */
    private async fetchSuggestions(query: string): Promise<void> {
        if (!this.elements.searchSuggestions) return

        if (query.length < 2) {
            this.elements.searchSuggestions.innerHTML = ""
            this.elements.searchSuggestions.classList.add("hidden")
            return
        }

        const token = store.getState().accessToken
        if (!token) return

        const _items = await searchSeries(query, token)
        // Render suggestions...
    }

    /**
     * Create series card (stub - full implementation in actual file)
     */
    private createSeriesCard(_group: any, _watchedId: string | null, _token: string | null): HTMLElement {
        const card = document.createElement("article")
        card.className =
            "series-card bg-bg-card border border-white/5 rounded-xl overflow-hidden flex flex-col p-4 gap-4 relative"
        // Full implementation would continue...
        return card
    }

    /**
     * Create schedule column (stub - full implementation in actual file)
     */
    private createScheduleColumn(_day: string, _episodes: Episode[], _watchedId: string | null): HTMLElement {
        const col = document.createElement("div")
        col.className =
            "schedule-col flex flex-col gap-3 bg-bg-card border border-white/5 p-3.5 rounded-xl min-h-[150px] w-full"
        // Full implementation would continue...
        return col
    }
}

// Initialize app on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    const app = new CrunchyrollTracker()
    app.init()
})
