import { getAccessToken } from "../src/scripts/api"

const API_BASE = "https://beta-api.crunchyroll.com"

async function run() {
    const token = await getAccessToken()
    if (!token) return

    const contentId = "GE00378240JAJP"
    const targetUrl = `${API_BASE}/playback/v2/${contentId}/web/chrome/play`
    const url = `https://corsproxy.org/?${encodeURIComponent(targetUrl)}`

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    console.log("STATUS:", res.status, res.statusText)
    const text = await res.text()
    console.log("RAW TEXT RESPONSE:", text.substring(0, 1000))
}

run()
