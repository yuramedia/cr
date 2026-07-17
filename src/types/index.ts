// Core type definitions for Crunchyroll Tracker

// Episode metadata from Crunchyroll API
export interface CrunchyrollEpisode {
    id: string
    title: string
    description: string
    images: {
        thumbnail?: CrunchyrollImage[][]
        poster_tall?: CrunchyrollImage[][]
    }
    episode_metadata: {
        series_id: string
        series_title: string
        season_id: string
        season_title?: string
        episode_number?: number
        episode?: string
        audio_locale?: string
        subtitle_locales: string[]
        duration_ms?: number
        premium_available_date?: string
        availability_starts?: string
    }
    season_metadata?: {
        season_number: number
        title: string
        series_id: string
    }
    last_public?: string
    premium_available_date?: string
    availability_starts?: string
    // Allow direct access to episode_metadata properties for convenience
    series_title?: string
    season_title?: string
    episode_number?: number
    episode?: string
    series_id?: string
    season_id?: string
    audio_locale?: string
    subtitle_locales?: string[]
    duration_ms?: number
    available_date?: string
}

// Image object from Crunchyroll API
export interface CrunchyrollImage {
    source: string
    width: number
    height: number
    type?: string
}

// Normalized episode format for internal use
export interface Episode {
    id: string
    title: string
    seriesTitle: string
    description: string
    thumbnail: string
    posterTall: string
    episodeNumber: string
    duration: string
    audioLocale: string
    subtitles: string[]
    seriesId: string
    seasonId: string
    episodeId: string
    releasedAt: string
}

// Filter state
export interface Filters {
    search: string
    audio: string
    sub: string
}

// View modes
export type ViewMode = "feed" | "compact" | "series" | "schedule"

// Application state
export interface AppState {
    episodes: Episode[]
    filters: Filters
    viewMode: ViewMode
    isLoading: boolean
    isLoadingMore: boolean
    hasMore: boolean
    error: string | null
    lastUpdate: Date | null
    accessToken: string | null
}

// Series group for grouped view
export interface SeriesGroup {
    seriesTitle: string
    seriesId: string
    thumbnail: string
    posterTall: string
    description: string
    episodes: Episode[]
}

// Schedule group for weekly view
export interface ScheduleGroup {
    [day: string]: Episode[]
}

// Sheet data row
export interface SheetDataRow {
    seriesName: string
    episodeNumber: string
    [key: number]: string
}

// Language mapping
export interface LanguageMap {
    [code: string]: string
}

// Poster queue job
export interface PosterQueueJob {
    seriesId: string
    accessToken: string
    resolve: (url: string | null) => void
}

// API response types
export interface CrunchyrollBrowseResponse {
    data: CrunchyrollEpisode[]
    total?: number
}

export interface CrunchyrollSeriesResponse {
    data: {
        id: string
        title: string
        description?: string
        images?: {
            poster_tall?: CrunchyrollImage[][]
            poster_wide?: CrunchyrollImage[][]
        }
        series_metadata?: {
            series_launch_year?: number
        }
    }[]
}

export interface CrunchyrollSeasonsResponse {
    data: {
        id: string
        title: string
        season_number: number
        series_id: string
    }[]
}

export interface CrunchyrollEpisodesResponse {
    data: CrunchyrollEpisode[]
}

// Event types for state management
export type AppEvent =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; episodes: Episode[]; hasMore: boolean }
    | { type: "FETCH_ERROR"; error: string }
    | { type: "LOAD_MORE_START" }
    | { type: "LOAD_MORE_SUCCESS"; episodes: Episode[]; hasMore: boolean }
    | { type: "SET_FILTERS"; filters: Partial<Filters> }
    | { type: "SET_VIEW_MODE"; mode: ViewMode }
    | { type: "SET_ACCESS_TOKEN"; token: string }
    | { type: "UPDATE_EPISODES"; episodes: Episode[] }
    | { type: "CLEAR_ERROR" }

// Render options
export interface RenderOptions {
    appendOnly?: boolean
    newEpisodes?: Episode[]
}
