import { getAccessToken } from "../src/scripts/api"

const API_BASE = "https://beta-api.crunchyroll.com"
const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

function getProxyUrl(url) {
    return `https://proxy.cors.sh/${url}`
}

function getHeaders(accessToken) {
    const headers = {}
    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
    }
    headers["User-Agent"] = USER_AGENT
    headers["x-cors-grants"] = '{"x-cors-button": "allowed"}'
    return headers
}

async function run() {
    const token = await getAccessToken()
    if (!token) return

    const contentId = "GE00378240ENUS"
    const variants = ["web/firefox/play", "tv/android_tv/play", "phone/android/play", "tv/fire_tv/play"]

    for (const variant of variants) {
        const targetUrl = `${API_BASE}/playback/v2/${contentId}/${variant}`
        const url = getProxyUrl(targetUrl)
        const res = await fetch(url, { headers: getHeaders(token) })
        console.log(`VARIANT ${variant} -> STATUS:`, res.status, res.statusText)
    }
}

run()
