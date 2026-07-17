// Constants for the Crunchyroll Tracker application

export const API_BASE = "https://beta-api.crunchyroll.com"
export const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export const CACHE_KEY = "cr_episodes_v3"
export const CACHE_TIME_KEY = "cr_episodes_time_v3"
export const CACHE_LIFETIME = 5 * 60 * 1000 // 5 minutes cache

export const LAST_SEEN_KEY = "cr_last_seen_episode"
export const COVERS_CACHE_KEY = "cr_series_covers_cache_v3"

export const LANG_MAP: Record<string, string> = {
    "en-US": "English",
    "ja-JP": "Japanese",
    "id-ID": "Indonesian",
    "ms-MY": "Malay",
    "ca-ES": "Catalan",
    "de-DE": "German",
    "es-ES": "Spanish",
    "es-419": "Spanish (América Latina)",
    "fr-FR": "French",
    "it-IT": "Italian",
    "pl-PL": "Polish",
    "pt-BR": "Portuguese (Brasil)",
    "pt-PT": "Portuguese (Portugal)",
    "ru-RU": "Russian",
    "tr-TR": "Turkish",
    "vi-VN": "Vietnamese",
    "ar-ME": "Arabic",
    "ar-SA": "Arabic (Saudi Arabia)",
    "hi-IN": "Hindi",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "th-TH": "Thai",
    "zh-CN": "Chinese (zh-CN)",
    "zh-HK": "Chinese (zh-HK)",
    "zh-TW": "Chinese (zh-TW)",
    "ko-KR": "Korean"
}

export const MAX_CACHED_EPISODES = 300
