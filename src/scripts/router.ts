// Client-side router for Crunchyroll Tracker
// Handles navigation between feed, episode details, and series details

type RouteHandler = (params: Record<string, string>) => Promise<void> | void

interface Route {
    pattern: RegExp
    handler: RouteHandler
    paramNames: string[]
}

class Router {
    private routes: Route[] = []
    private currentPath: string = ""
    private onNavigate: ((path: string) => void) | null = null

    /**
     * Register a route
     */
    on(pattern: string, handler: RouteHandler): void {
        const paramNames: string[] = []
        const regexPattern = pattern
            .replace(/:([^/]+)/g, (_, name) => {
                paramNames.push(name)
                return "([^/]+)"
            })
            .replace(/\//g, "\\/")

        this.routes.push({
            pattern: new RegExp(`^${regexPattern}$`),
            handler,
            paramNames
        })
    }

    /**
     * Set navigation callback
     */
    setOnNavigate(callback: (path: string) => void): void {
        this.onNavigate = callback
    }

    /**
     * Navigate to a path
     */
    navigate(path: string, replace: boolean = false): void {
        if (path.startsWith("/")) {
            if (replace) {
                window.history.replaceState({}, "", path)
            } else {
                window.history.pushState({}, "", path)
            }
        }
        this.currentPath = path
        this.handleRoute()
        this.onNavigate?.(path)
    }

    /**
     * Replace current history entry
     */
    replace(path: string): void {
        this.navigate(path, true)
    }

    /**
     * Handle current route
     */
    handleRoute(): void {
        const path = window.location.pathname || "/"

        for (const route of this.routes) {
            const match = path.match(route.pattern)
            if (match) {
                const params: Record<string, string> = {}
                route.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1]
                })
                route.handler(params)
                return
            }
        }

        // No match - go to home
        const homeRoute = this.routes.find(r => r.pattern.test("/"))
        if (homeRoute) {
            homeRoute.handler({})
        }
    }

    /**
     * Get current path
     */
    getPath(): string {
        return this.currentPath || window.location.pathname || "/"
    }

    /**
     * Initialize router listeners
     */
    init(): void {
        // Handle popstate (back/forward button)
        window.addEventListener("popstate", () => {
            this.handleRoute()
        })

        // Handle initial route
        this.handleRoute()
    }

    /**
     * Create a link handler for SPA navigation
     */
    handleLinkClick(e: MouseEvent): void {
        const target = e.target as HTMLElement
        const link = target.closest('a[href^="/"]') as HTMLAnchorElement

        if (link && !link.hasAttribute("target") && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            this.navigate(link.getAttribute("href") || "/")
        }
    }
}

// Singleton router instance
export const router = new Router()

// Helper functions for creating links
export function episodeUrl(id: string): string {
    return `/eps/${id}`
}

export function seriesUrl(id: string): string {
    return `/series/${id}`
}

export function watchUrl(id: string): string {
    return `https://www.crunchyroll.com/watch/${id}`
}

// Link click delegation setup
export function setupLinkDelegation(container: HTMLElement): void {
    container.addEventListener("click", (e: MouseEvent) => {
        router.handleLinkClick(e)
    })
}
