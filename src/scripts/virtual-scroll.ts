// Virtual scrolling implementation for large lists
// Provides efficient rendering by only rendering visible items

interface VirtualScrollConfig {
    container: HTMLElement
    itemHeight: number
    overscan?: number
    onRender: (startIndex: number, endIndex: number, visibleItems: unknown[]) => void
    getTotalItems: () => number
    getItem: (index: number) => unknown
}

interface VirtualScrollState {
    scrollTop: number
    visibleStart: number
    visibleEnd: number
}

/**
 * Virtual Scroller for efficient rendering of large lists
 */
export class VirtualScroller {
    private container: HTMLElement
    private itemHeight: number
    private overscan: number
    private onRender: (startIndex: number, endIndex: number, visibleItems: unknown[]) => void
    private getTotalItems: () => number
    private getItem: (index: number) => unknown

    private state: VirtualScrollState = {
        scrollTop: 0,
        visibleStart: 0,
        visibleEnd: 0
    }

    private scrollListener: () => void
    private resizeObserver: ResizeObserver
    private rafId: number | null = null

    constructor(config: VirtualScrollConfig) {
        this.container = config.container
        this.itemHeight = config.itemHeight
        this.overscan = config.overscan ?? 5
        this.onRender = config.onRender
        this.getTotalItems = config.getTotalItems
        this.getItem = config.getItem

        // Bind scroll listener
        this.scrollListener = () => this.handleScroll()
        this.container.addEventListener("scroll", this.scrollListener, { passive: true })

        // Setup resize observer
        this.resizeObserver = new ResizeObserver(() => this.update())
        this.resizeObserver.observe(this.container)

        // Initial render
        this.update()
    }

    /**
     * Handle scroll events with RAF throttling
     */
    private handleScroll(): void {
        if (this.rafId !== null) return

        this.rafId = requestAnimationFrame(() => {
            this.rafId = null
            this.update()
        })
    }

    /**
     * Update visible range and trigger render
     */
    private update(): void {
        const scrollTop = this.container.scrollTop
        const containerHeight = this.container.clientHeight
        const totalItems = this.getTotalItems()

        // Calculate visible range
        const visibleStart = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan)
        const visibleEnd = Math.min(
            totalItems,
            Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.overscan
        )

        // Only update if range changed
        if (visibleStart !== this.state.visibleStart || visibleEnd !== this.state.visibleEnd) {
            this.state = { scrollTop, visibleStart, visibleEnd }

            // Get visible items
            const visibleItems: unknown[] = []
            for (let i = visibleStart; i < visibleEnd; i++) {
                visibleItems.push(this.getItem(i))
            }

            // Trigger render callback
            this.onRender(visibleStart, visibleEnd, visibleItems)
        }
    }

    /**
     * Scroll to a specific index
     */
    scrollToIndex(index: number, behavior: ScrollBehavior = "smooth"): void {
        const top = index * this.itemHeight
        this.container.scrollTo({ top, behavior })
    }

    /**
     * Scroll to top
     */
    scrollToTop(behavior: ScrollBehavior = "smooth"): void {
        this.container.scrollTo({ top: 0, behavior })
    }

    /**
     * Get current visible range
     */
    getVisibleRange(): { start: number; end: number } {
        return { start: this.state.visibleStart, end: this.state.visibleEnd }
    }

    /**
     * Update item height and re-render
     */
    setItemHeight(height: number): void {
        this.itemHeight = height
        this.update()
    }

    /**
     * Force re-render (call after data changes)
     */
    refresh(): void {
        this.update()
    }

    /**
     * Cleanup listeners
     */
    destroy(): void {
        this.container.removeEventListener("scroll", this.scrollListener)
        this.resizeObserver.disconnect()
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId)
        }
    }
}

/**
 * Simple virtual list for episode cards
 */
export class VirtualEpisodeList {
    private scroller: VirtualScroller
    private container: HTMLElement
    private items: unknown[] = []
    private renderItem: (item: unknown, index: number) => HTMLElement
    private itemHeight: number
    private contentElement: HTMLElement | null = null

    constructor(container: HTMLElement, itemHeight: number, renderItem: (item: unknown, index: number) => HTMLElement) {
        this.container = container
        this.itemHeight = itemHeight
        this.renderItem = renderItem

        // Create content wrapper
        this.setupDOM()

        // Initialize virtual scroller
        this.scroller = new VirtualScroller({
            container: this.container,
            itemHeight: this.itemHeight,
            overscan: 10,
            onRender: (start, end, items) => this.renderVisible(start, end, items),
            getTotalItems: () => this.items.length,
            getItem: index => this.items[index]
        })
    }

    /**
     * Setup DOM structure for virtual scrolling
     */
    private setupDOM(): void {
        // Make container scrollable
        this.container.style.overflowY = "auto"
        this.container.style.overflowX = "hidden"
        this.container.style.position = "relative"
    }

    /**
     * Render visible items
     */
    private renderVisible(start: number, end: number, _items: unknown[]): void {
        if (!this.contentElement) return

        // Set total height for scrollbar
        const totalHeight = this.items.length * this.itemHeight
        this.contentElement.style.height = `${totalHeight}px`

        // Clear and render visible items
        this.contentElement.innerHTML = ""

        // Create padding for items above viewport
        const paddingTop = start * this.itemHeight
        this.contentElement.style.paddingTop = `${paddingTop}px`

        // Render visible items
        const fragment = document.createDocumentFragment()
        for (let i = start; i < end && i < this.items.length; i++) {
            const element = this.renderItem(this.items[i], i)
            element.style.position = "relative"
            fragment.appendChild(element)
        }
        this.contentElement.appendChild(fragment)
    }

    /**
     * Set items data
     */
    setItems(items: unknown[]): void {
        this.items = items
        this.scroller.refresh()
    }

    /**
     * Append items
     */
    appendItems(items: unknown[]): void {
        this.items = [...this.items, ...items]
        this.scroller.refresh()
    }

    /**
     * Scroll to index
     */
    scrollToIndex(index: number): void {
        this.scroller.scrollToIndex(index)
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.scroller.destroy()
    }
}

/**
 * Intersection Observer based lazy renderer
 * More efficient for grid layouts where items have variable heights
 */
export class LazyGridRenderer {
    private observer: IntersectionObserver
    private renderedElements = new Map<string, HTMLElement>()
    private pendingQueue: Array<{ id: string; element: HTMLElement; render: () => void }> = []
    private isProcessing = false

    constructor(rootMargin: string = "200px") {
        this.observer = new IntersectionObserver(entries => this.handleIntersection(entries), {
            rootMargin,
            threshold: 0.01
        })
    }

    /**
     * Handle intersection events
     */
    private handleIntersection(entries: IntersectionObserverEntry[]): void {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target as HTMLElement
                const id = element.dataset.lazyId

                if (id && this.renderedElements.has(id)) {
                    // Element is in view, trigger render
                    const renderFn = element.dataset.lazyRender
                    if (renderFn) {
                        // Execute render function stored as data attribute
                        element.innerHTML = renderFn
                        delete element.dataset.lazyRender
                    }
                }
            }
        })
    }

    /**
     * Observe an element for lazy rendering
     */
    observe(id: string, element: HTMLElement, renderContent: () => string): void {
        element.dataset.lazyId = id
        element.dataset.lazyRender = renderContent.toString()
        this.renderedElements.set(id, element)
        this.observer.observe(element)
    }

    /**
     * Unobserve an element
     */
    unobserve(id: string): void {
        const element = this.renderedElements.get(id)
        if (element) {
            this.observer.unobserve(element)
            this.renderedElements.delete(id)
        }
    }

    /**
     * Clear all observed elements
     */
    clear(): void {
        this.renderedElements.forEach(element => {
            this.observer.unobserve(element)
        })
        this.renderedElements.clear()
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.clear()
        this.observer.disconnect()
    }
}
