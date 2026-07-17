import { getAccessToken } from "../src/scripts/api"

const API_BASE = "https://beta-api.crunchyroll.com"

async function run() {
    const token = await getAccessToken()
    if (!token) return

    const contentId = "GE00378240JAJP"
    const targetUrl = `${API_BASE}/playback/v2/${contentId}/web/chrome/play`
    const url = `https://api.cors.lol/?url=${encodeURIComponent(targetUrl)}`

    try {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        console.log("STATUS:", res.status, res.statusText)
        console.log("RESPONSE HEADERS:", Object.fromEntries(res.headers.entries()))
        const text = await res.text()
        console.log("RESPONSE TEXT:", text.substring(0, 1000))
    } catch (e) {
        console.error("Fetch failed:", e)
    }
}

run()
