const spreadsheetId = "1YSXp5jxPE4LMAyaPH5sl9xXbZiSjnD_zRRZbZ26Rk44";
const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv`;

async function run() {
  const res = await fetch(url);
  if (!res.ok) return;
  const tsv = await res.text();
  const lines = tsv.split('\n');

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t').map(p => p.trim());
    if (parts[0] && parts[0].toLowerCase().includes("polar opposites")) {
      console.log(`ROW ${i}: Title="${parts[0]}", Ep="${parts[1]}", Notes="${parts[20] || ''}"`);
    }
  }
}

run();
