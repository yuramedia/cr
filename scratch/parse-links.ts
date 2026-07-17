import * as fs from "fs"

const file =
    "C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\8dbd4bc9-703a-4454-866a-53d2a08c3823\\.system_generated\\steps\\2170\\content.md"
const content = fs.readFileSync(file, "utf8")
const lines = content.split("\n")
for (const line of lines) {
    if (line.includes("cloudflare-cors-anywhere") || line.includes("x2u") || line.includes("thebugging")) {
        console.log(line)
    }
}
