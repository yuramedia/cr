import { getAccessToken } from "../src/scripts/api"

const API_BASE = "https://beta-api.crunchyroll.com"

async function run() {
    const token = await getAccessToken()
    if (!token) return

    const contentId = "GE00378240JAJP"
    const targetUrl = `${API_BASE}/playback/v2/${contentId}/web/chrome/play`
    const url = `https://proxy.corsfix.com/?${targetUrl}`

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Origin: "https://cr.yuramedia.com"
        }
    })
    console.log("STATUS:", res.status, res.statusText)
    if (res.ok) {
        const data = await res.json()
        console.log("SUCCESS! SUBTITLES KEYS:", Object.keys(data.subtitles || {}))
    } else {
        const text = await res.text()
        console.log("ERROR TEXT:", text.substring(0, 1000))
    }
}

run()
