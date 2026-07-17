async function run() {
    const url = "https://cors-proxy.htmldriven.com/"
    try {
        const res = await fetch(url)
        const text = await res.text()
        // Print lines containing usage examples or form actions
        const lines = text.split("\n")
        for (const line of lines) {
            if (
                line.includes("usage") ||
                line.includes("example") ||
                line.includes("action") ||
                line.includes("method") ||
                line.includes("cors-proxy")
            ) {
                console.log("LINE:", line.trim())
            }
        }
    } catch (e) {
        console.error("Fetch failed:", e)
    }
}

run()
