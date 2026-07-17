// Error boundary and error handling utilities for Crunchyroll Tracker

/**
 * Error types for the application
 */
export enum ErrorType {
    NETWORK = "NETWORK_ERROR",
    API = "API_ERROR",
    AUTH = "AUTH_ERROR",
    CACHE = "CACHE_ERROR",
    RENDER = "RENDER_ERROR",
    UNKNOWN = "UNKNOWN_ERROR"
}

/**
 * Application error class with type and context
 */
export class AppError extends Error {
    type: ErrorType
    context?: Record<string, unknown>
    recoverable: boolean

    constructor(
        message: string,
        type: ErrorType = ErrorType.UNKNOWN,
        options?: {
            cause?: Error
            context?: Record<string, unknown>
            recoverable?: boolean
        }
    ) {
        super(message, { cause: options?.cause })
        this.name = "AppError"
        this.type = type
        this.context = options?.context
        this.recoverable = options?.recoverable ?? true
    }

    /**
     * Create from another error
     */
    static from(error: unknown, type?: ErrorType): AppError {
        if (error instanceof AppError) return error
        if (error instanceof Error) {
            return new AppError(error.message, type ?? ErrorType.UNKNOWN, {
                cause: error,
                recoverable: true
            })
        }
        return new AppError(String(error), type ?? ErrorType.UNKNOWN)
    }
}

/**
 * Error boundary for catching and handling errors in UI
 */
export class ErrorBoundary {
    private container: HTMLElement
    private fallbackRenderer: (error: AppError, retry: () => void) => HTMLElement
    private onCatch?: (error: AppError) => void

    constructor(config: {
        container: HTMLElement
        fallback: (error: AppError, retry: () => void) => HTMLElement
        onCatch?: (error: AppError) => void
    }) {
        this.container = config.container
        this.fallbackRenderer = config.fallback
        this.onCatch = config.onCatch
    }

    /**
     * Execute a function within the error boundary
     */
    async execute<T>(fn: () => Promise<T> | T): Promise<T | null> {
        try {
            return await fn()
        } catch (error) {
            this.handleError(AppError.from(error))
            return null
        }
    }

    /**
     * Handle caught error
     */
    private handleError(error: AppError): void {
        // Log error
        console.error("ErrorBoundary caught:", error)

        // Notify callback
        this.onCatch?.(error)

        // Render fallback UI
        this.renderFallback(error)
    }

    /**
     * Render fallback UI
     */
    private renderFallback(error: AppError): void {
        const fallback = this.fallbackRenderer(error, () => this.clear())
        this.container.innerHTML = ""
        this.container.appendChild(fallback)
    }

    /**
     * Clear error state
     */
    clear(): void {
        this.container.innerHTML = ""
    }

    /**
     * Check if currently showing error
     */
    hasError(): boolean {
        return this.container.querySelector("[data-error-boundary]") !== null
    }
}

/**
 * Create error fallback UI element
 */
export function createErrorFallback(error: AppError, retry?: () => void): HTMLElement {
    const container = document.createElement("div")
    container.setAttribute("data-error-boundary", "true")
    container.className =
        "error-fallback flex flex-col items-center justify-center text-center p-6 sm:p-10 md:p-20 bg-bg-card border border-white/5 rounded-xl min-h-[400px]"
    container.setAttribute("role", "alert")
    container.setAttribute("aria-live", "assertive")

    const icon = document.createElement("div")
    icon.className = "text-5xl mb-4"
    icon.setAttribute("aria-hidden", "true")
    icon.textContent = getErrorIcon(error.type)
    container.appendChild(icon)

    const title = document.createElement("h2")
    title.className = "text-xl font-bold text-white mb-2"
    title.textContent = getErrorTitle(error.type)
    container.appendChild(title)

    const message = document.createElement("p")
    message.className = "text-text-secondary text-base mb-6 max-w-md"
    message.textContent = error.message
    container.appendChild(message)

    if (error.recoverable && retry) {
        const retryBtn = document.createElement("button")
        retryBtn.className =
            "bg-accent-orange hover:bg-accent-orange-hover border-none text-white font-bold text-sm px-8 py-3 rounded-lg cursor-pointer transition-colors duration-200"
        retryBtn.textContent = "Try Again"
        retryBtn.addEventListener("click", retry)
        container.appendChild(retryBtn)
    }

    // Add error details for debugging (collapsed by default)
    if (error.context) {
        const details = document.createElement("details")
        details.className = "mt-4 text-left w-full max-w-md"

        const summary = document.createElement("summary")
        summary.className = "text-text-muted text-sm cursor-pointer"
        summary.textContent = "Error Details"
        details.appendChild(summary)

        const pre = document.createElement("pre")
        pre.className = "text-xs text-text-muted bg-[#0b0b0d] p-3 rounded mt-2 overflow-auto"
        pre.textContent = JSON.stringify(error.context, null, 2)
        details.appendChild(pre)

        container.appendChild(details)
    }

    return container
}

/**
 * Get error icon based on type
 */
function getErrorIcon(type: ErrorType): string {
    switch (type) {
        case ErrorType.NETWORK:
            return "🌐"
        case ErrorType.API:
            return "⚠️"
        case ErrorType.AUTH:
            return "🔐"
        case ErrorType.CACHE:
            return "💾"
        case ErrorType.RENDER:
            return "🖼️"
        default:
            return "❌"
    }
}

/**
 * Get error title based on type
 */
function getErrorTitle(type: ErrorType): string {
    switch (type) {
        case ErrorType.NETWORK:
            return "Connection Error"
        case ErrorType.API:
            return "API Error"
        case ErrorType.AUTH:
            return "Authentication Error"
        case ErrorType.CACHE:
            return "Cache Error"
        case ErrorType.RENDER:
            return "Display Error"
        default:
            return "Something went wrong"
    }
}

/**
 * Global error handler for uncaught errors
 */
export function setupGlobalErrorHandler(): void {
    // Handle uncaught errors
    window.addEventListener("error", event => {
        console.error("Uncaught error:", event.error)
        // Could send to error reporting service here
    })

    // Handle uncaught promise rejections
    window.addEventListener("unhandledrejection", event => {
        console.error("Unhandled rejection:", event.reason)
        event.preventDefault()
    })
}

/**
 * Retry utility with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number
        delay?: number
        backoff?: number
        shouldRetry?: (error: Error, attempt: number) => boolean
    } = {}
): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = 2, shouldRetry = () => true } = options

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))

            if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) {
                throw lastError
            }

            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, attempt - 1)))
        }
    }

    throw lastError
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message = "Operation timed out"
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new AppError(message, ErrorType.NETWORK, { recoverable: true }))
        }, timeoutMs)
    })

    try {
        const result = await Promise.race([promise, timeoutPromise])
        if (timeoutId) clearTimeout(timeoutId)
        return result
    } catch (error) {
        if (timeoutId) clearTimeout(timeoutId)
        throw error
    }
}

/**
 * Circuit breaker for API calls
 */
export class CircuitBreaker {
    private failures = 0
    private lastFailureTime = 0
    private state: "closed" | "open" | "half-open" = "closed"

    constructor(
        private threshold: number = 5,
        private timeout: number = 30000
    ) {}

    /**
     * Execute function through circuit breaker
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === "open") {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = "half-open"
            } else {
                throw new AppError("Service temporarily unavailable. Please try again later.", ErrorType.API, {
                    recoverable: false
                })
            }
        }

        try {
            const result = await fn()
            this.onSuccess()
            return result
        } catch (error) {
            this.onFailure()
            throw error
        }
    }

    private onSuccess(): void {
        this.failures = 0
        this.state = "closed"
    }

    private onFailure(): void {
        this.failures++
        this.lastFailureTime = Date.now()

        if (this.failures >= this.threshold) {
            this.state = "open"
        }
    }

    /**
     * Get current state
     */
    getState(): string {
        return this.state
    }

    /**
     * Reset circuit breaker
     */
    reset(): void {
        this.failures = 0
        this.state = "closed"
        this.lastFailureTime = 0
    }
}

/**
 * Create toast notification for errors
 */
export function showErrorToast(error: AppError, duration = 5000): void {
    const toast = document.createElement("div")
    toast.className =
        "error-toast fixed bottom-4 right-4 bg-red-500/90 border border-red-400 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50"
    toast.setAttribute("role", "alert")
    toast.setAttribute("aria-live", "assertive")

    const icon = document.createElement("span")
    icon.textContent = "⚠️"
    toast.appendChild(icon)

    const message = document.createElement("span")
    message.textContent = error.message
    toast.appendChild(message)

    const closeBtn = document.createElement("button")
    closeBtn.className = "ml-2 text-white/80 hover:text-white"
    closeBtn.innerHTML = "×"
    closeBtn.addEventListener("click", () => {
        toast.remove()
    })
    toast.appendChild(closeBtn)

    document.body.appendChild(toast)

    setTimeout(() => {
        toast.remove()
    }, duration)
}
