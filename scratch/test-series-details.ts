import { getAccessToken } from "../src/scripts/api"

async function run() {
    const token = await getAccessToken()
    if (!token) return

    const seriesId = "GT00365624" // Polar Opposites
    const targetUrl = `https://beta-api.crunchyroll.com/content/v2/cms/series/${seriesId}`

    const response = await fetch(targetUrl, {
        headers: { Authorization: `Bearer ${token}` }
    })
    if (response.ok) {
        const data = await response.json()
        const series = data.data?.[0]
        if (series) {
            console.log("SERIES KEYS:", Object.keys(series))
            console.log("SERIES TITLE:", series.title)
            console.log("SERIES IMAGES KEYS:", Object.keys(series.images || {}))
            console.log(
                "SERIES IMAGES POSTER_WIDE:",
                JSON.stringify(series.images?.poster_wide?.[0]?.slice(0, 2), null, 2)
            )
        }
    }
}

run()
