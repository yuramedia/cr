const spreadsheetId = "1YSXp5jxPE4LMAyaPH5sl9xXbZiSjnD_zRRZbZ26Rk44";
const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv`;

function normalizeTitleForSheet(title) {
  if (!title) return '';
  return title.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/season\s*\d+/g, '') // remove "season X"
    .replace(/\bs\d+\b/g, '') // remove "sX"
    .replace(/[^a-z0-9]/g, ''); // remove non-alphanumeric characters
}

async function run() {
  const res = await fetch(url);
  if (!res.ok) return;
  const tsv = await res.text();
  const lines = tsv.split('\n');

  console.log("HEADERS:", lines[0].split('\t').map((h, i) => `${i}: ${h.trim()}`));

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t').map(p => p.trim());
    if (parts[0] && parts[0].toLowerCase().includes("four seasons")) {
      console.log(`MATCHED ROW ${i}:`, parts.map((val, idx) => `${idx}: "${val}"`));
    }
  }
}

run();
