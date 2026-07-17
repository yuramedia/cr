import * as fs from "fs"

const file =
    "C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\8dbd4bc9-703a-4454-866a-53d2a08c3823\\.system_generated\\steps\\2164\\content.md"
if (!fs.existsSync(file)) {
    console.log("File does not exist:", file)
    process.exit(1)
}
const content = fs.readFileSync(file, "utf8")
const lines = content.split("\n")
console.log("TOTAL LINES:", lines.length)
for (const line of lines) {
    if (line.toLowerCase().includes("cloudflare")) {
        console.log("MATCH:", line.trim())
    }
}
