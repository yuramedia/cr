// Episode formatting and normalization utilities
import type { CrunchyrollEpisode, Episode, CrunchyrollImage } from "../types"

/**
 * Format duration from milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
    const totalSecs = Math.floor(ms / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

/**
 * Select best image from array based on target dimensions
 */
export function selectBestImage(images: CrunchyrollImage[] | undefined, minWidth: number, maxWidth: number): string {
    if (!images || images.length === 0) return ""

    // Sort by resolution (descending)
    const sorted = [...images].sort((a, b) => b.width * b.height - a.width * a.height)

    // Find optimal size
    const optimal = sorted.find(img => img.width >= minWidth && img.width <= maxWidth)
    return optimal?.source || sorted[0]?.source || ""
}

/**
 * Extract thumbnail URL from episode images
 */
export function getThumbnailUrl(episode: CrunchyrollEpisode): string {
    const thumbs = episode.images?.thumbnail?.flat()
    return selectBestImage(thumbs, 480, 800)
}

/**
 * Extract poster URL from episode images
 */
export function getPosterUrl(episode: CrunchyrollEpisode): string {
    const posters = episode.images?.poster_tall?.flat()
    return selectBestImage(posters, 240, 480)
}

/**
 * Format raw Crunchyroll episode to normalized Episode type
 */
export function formatEpisode(ep: CrunchyrollEpisode): Episode {
    const meta = ep.episode_metadata || {}

    // Build series title with season if applicable
    let seriesTitle = meta.series_title || "Unknown Series"
    if (meta.season_title?.startsWith("Season") && !meta.season_title.includes("Season 1")) {
        seriesTitle += ` ${meta.season_title}`
    }

    // Get release date
    const releasedAt =
        meta.premium_available_date || meta.availability_starts || ep.last_public || new Date().toISOString()

    return {
        id: ep.id,
        title: ep.title || `Episode ${meta.episode_number || meta.episode || "-"}`,
        seriesTitle,
        description: ep.description || "No description available.",
        thumbnail: getThumbnailUrl(ep),
        posterTall: getPosterUrl(ep),
        episodeNumber: String(meta.episode || meta.episode_number || "--"),
        duration: meta.duration_ms ? formatDuration(meta.duration_ms) : "0s",
        audioLocale: meta.audio_locale || "",
        subtitles: meta.subtitle_locales || [],
        seriesId: meta.series_id || "Unknown",
        seasonId: meta.season_id || "Unknown",
        episodeId: ep.id,
        releasedAt
    }
}

/**
 * Format date for display
 */
export function formatReleaseDate(dateStr: string): string {
    const date = new Date(dateStr)
    const dateFormatted = date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
    })
    const timeFormatted = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    })
    return `${dateFormatted}, ${timeFormatted}`
}

/**
 * Get date group key for grouping episodes
 */
export function getDateGroupKey(dateStr: string): string {
    const date = new Date(dateStr)
    return date
        .toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })
        .toUpperCase()
}

/**
 * Normalize string for search (remove accents, lowercase)
 */
export function normalizeForSearch(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i]
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                )
            }
        }
    }

    return matrix[b.length][a.length]
}

/**
 * Check if search term fuzzy matches target words
 */
export function isFuzzyMatch(term: string, targetWords: string[]): boolean {
    const normTerm = normalizeForSearch(term)

    // Fast path: direct substring match
    if (targetWords.some(w => w.includes(normTerm))) return true

    // Typo tolerance for longer queries
    const termLen = normTerm.length
    if (termLen < 4) return false

    const maxDist = termLen >= 7 ? 2 : 1

    return targetWords.some(w => {
        if (Math.abs(w.length - termLen) > maxDist) return false
        return levenshteinDistance(normTerm, w) <= maxDist
    })
}
