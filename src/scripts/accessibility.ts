// Accessibility utilities for Crunchyroll Tracker
// Provides ARIA support and keyboard navigation

/**
 * Focus management utilities
 */
export class FocusManager {
    private focusableSelector = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])'
    ].join(", ")

    private focusStack: HTMLElement[] = []

    /**
     * Get all focusable elements within a container
     */
    getFocusableElements(container: HTMLElement): HTMLElement[] {
        return Array.from(container.querySelectorAll(this.focusableSelector)).filter(el => {
            const element = el as HTMLElement
            return (
                element.offsetParent !== null && // Visible
                !element.hasAttribute("aria-hidden")
            )
        }) as HTMLElement[]
    }

    /**
     * Trap focus within a container (for modals, dialogs)
     */
    trapFocus(container: HTMLElement): () => void {
        const focusableElements = this.getFocusableElements(container)
        const firstFocusable = focusableElements[0]
        const lastFocusable = focusableElements[focusableElements.length - 1]

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    e.preventDefault()
                    lastFocusable?.focus()
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusable) {
                    e.preventDefault()
                    firstFocusable?.focus()
                }
            }
        }

        container.addEventListener("keydown", handleKeyDown)

        // Focus first element
        firstFocusable?.focus()

        // Return cleanup function
        return () => {
            container.removeEventListener("keydown", handleKeyDown)
        }
    }

    /**
     * Save current focus to restore later
     */
    saveFocus(): void {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement) {
            this.focusStack.push(activeElement)
        }
    }

    /**
     * Restore previously saved focus
     */
    restoreFocus(): void {
        const element = this.focusStack.pop()
        if (element && document.body.contains(element)) {
            element.focus()
        }
    }

    /**
     * Move focus to element with announcement
     */
    moveTo(element: HTMLElement, announcement?: string): void {
        element.focus()
        if (announcement) {
            this.announce(announcement)
        }
    }

    /**
     * Announce message to screen readers
     */
    announce(message: string, priority: "polite" | "assertive" = "polite"): void {
        const announcer = document.createElement("div")
        announcer.setAttribute("aria-live", priority)
        announcer.setAttribute("aria-atomic", "true")
        announcer.className = "sr-only"
        announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `
        document.body.appendChild(announcer)

        // Delay to ensure screen reader catches the change
        setTimeout(() => {
            announcer.textContent = message
        }, 100)

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(announcer)
        }, 1000)
    }
}

/**
 * Keyboard navigation handler for lists and grids
 */
export class KeyboardNavigator {
    private container: HTMLElement
    private itemSelector: string
    private orientation: "horizontal" | "vertical" | "grid"
    private columns?: number
    private onActivate?: (element: HTMLElement) => void

    constructor(config: {
        container: HTMLElement
        itemSelector: string
        orientation: "horizontal" | "vertical" | "grid"
        columns?: number
        onActivate?: (element: HTMLElement) => void
    }) {
        this.container = config.container
        this.itemSelector = config.itemSelector
        this.orientation = config.orientation
        this.columns = config.columns
        this.onActivate = config.onActivate

        this.container.addEventListener("keydown", e => this.handleKeyDown(e))
    }

    /**
     * Handle keyboard navigation
     */
    private handleKeyDown(e: KeyboardEvent): void {
        const items = Array.from(this.container.querySelectorAll(this.itemSelector)) as HTMLElement[]
        const currentIndex = items.findIndex(item => item === document.activeElement)

        if (currentIndex === -1) return

        let nextIndex = currentIndex

        switch (e.key) {
            case "ArrowDown":
                if (this.orientation === "vertical" || this.orientation === "grid") {
                    e.preventDefault()
                    nextIndex =
                        this.orientation === "grid"
                            ? Math.min(currentIndex + (this.columns || 1), items.length - 1)
                            : Math.min(currentIndex + 1, items.length - 1)
                }
                break

            case "ArrowUp":
                if (this.orientation === "vertical" || this.orientation === "grid") {
                    e.preventDefault()
                    nextIndex =
                        this.orientation === "grid"
                            ? Math.max(currentIndex - (this.columns || 1), 0)
                            : Math.max(currentIndex - 1, 0)
                }
                break

            case "ArrowRight":
                if (this.orientation === "horizontal" || this.orientation === "grid") {
                    e.preventDefault()
                    nextIndex = Math.min(currentIndex + 1, items.length - 1)
                }
                break

            case "ArrowLeft":
                if (this.orientation === "horizontal" || this.orientation === "grid") {
                    e.preventDefault()
                    nextIndex = Math.max(currentIndex - 1, 0)
                }
                break

            case "Home":
                e.preventDefault()
                nextIndex = 0
                break

            case "End":
                e.preventDefault()
                nextIndex = items.length - 1
                break

            case "Enter":
            case " ":
                e.preventDefault()
                this.onActivate?.(items[currentIndex])
                return
        }

        if (nextIndex !== currentIndex && items[nextIndex]) {
            items[nextIndex].focus()
        }
    }

    /**
     * Set current focus to item at index
     */
    focusItem(index: number): void {
        const items = this.container.querySelectorAll(this.itemSelector)
        const item = items[index] as HTMLElement
        if (item) {
            item.focus()
        }
    }
}

/**
 * Skip link component for keyboard users
 */
export function createSkipLink(targetId: string, label: string): HTMLElement {
    const skipLink = document.createElement("a")
    skipLink.href = `#${targetId}`
    skipLink.className = "skip-link"
    skipLink.textContent = label
    skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--color-accent-orange);
    color: white;
    padding: 8px 16px;
    z-index: 10000;
    text-decoration: none;
    font-weight: bold;
    border-radius: 0 0 4px 0;
    transition: top 0.2s;
  `

    skipLink.addEventListener("focus", () => {
        skipLink.style.top = "0"
    })

    skipLink.addEventListener("blur", () => {
        skipLink.style.top = "-40px"
    })

    return skipLink
}

/**
 * Add ARIA attributes to episode card
 */
export function enhanceCardAccessibility(
    card: HTMLElement,
    episodeData: {
        title: string
        seriesTitle: string
        episodeNumber: string
    }
): void {
    card.setAttribute("role", "article")
    card.setAttribute(
        "aria-label",
        `${episodeData.seriesTitle} - Episode ${episodeData.episodeNumber}: ${episodeData.title}`
    )

    // Make card clickable via keyboard
    card.setAttribute("tabindex", "0")

    // Add keyboard activation
    card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            const link = card.querySelector("a[href]") as HTMLAnchorElement
            if (link) {
                link.click()
            }
        }
    })
}

/**
 * Add ARIA attributes to filter controls
 */
export function enhanceFilterAccessibility(): void {
    // Search input
    const searchInput = document.getElementById("search-input")
    if (searchInput) {
        searchInput.setAttribute("aria-label", "Search episodes by title, series, or language")
        searchInput.setAttribute("aria-describedby", "search-hint")
    }

    // Audio filter
    const audioFilter = document.getElementById("audio-filter")
    if (audioFilter) {
        audioFilter.setAttribute("aria-label", "Filter by audio language")
    }

    // Subtitle filter
    const subFilter = document.getElementById("sub-filter")
    if (subFilter) {
        subFilter.setAttribute("aria-label", "Filter by subtitle language")
    }

    // View selector
    const viewSelector = document.getElementById("view-selector")
    if (viewSelector) {
        viewSelector.setAttribute("aria-label", "Select view mode")
    }

    // Refresh button
    const refreshBtn = document.getElementById("refresh-api-btn")
    if (refreshBtn) {
        refreshBtn.setAttribute("aria-label", "Refresh episode data from Crunchyroll API")
    }
}

/**
 * Setup live region for dynamic content announcements
 */
export function setupLiveRegion(): HTMLElement {
    let liveRegion = document.getElementById("aria-live-region")

    if (!liveRegion) {
        liveRegion = document.createElement("div")
        liveRegion.id = "aria-live-region"
        liveRegion.setAttribute("aria-live", "polite")
        liveRegion.setAttribute("aria-atomic", "true")
        liveRegion.className = "sr-only"
        liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `
        document.body.appendChild(liveRegion)
    }

    return liveRegion
}

/**
 * Announce page changes to screen readers
 */
export function announcePageChange(pageName: string): void {
    const liveRegion = setupLiveRegion()
    liveRegion.textContent = `Navigated to ${pageName}`
}

/**
 * Announce loading state
 */
export function announceLoading(isLoading: boolean): void {
    const liveRegion = setupLiveRegion()
    liveRegion.textContent = isLoading ? "Loading content, please wait" : "Content loaded"
}

/**
 * Announce error
 */
export function announceError(message: string): void {
    const liveRegion = setupLiveRegion()
    liveRegion.setAttribute("aria-live", "assertive")
    liveRegion.textContent = `Error: ${message}`

    setTimeout(() => {
        liveRegion.setAttribute("aria-live", "polite")
    }, 100)
}

// Singleton focus manager
export const focusManager = new FocusManager()
