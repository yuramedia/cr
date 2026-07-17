async function run() {
    const url = "https://cors-proxy.htmldriven.com/?url=https://www.htmldriven.com/sample.json"
    try {
        const res = await fetch(url)
        console.log("STATUS:", res.status, res.statusText)
        const text = await res.text()
        console.log("RESPONSE:", text)
    } catch (e) {
        console.error("Fetch failed:", e)
    }
}

run()
