import Papa from "papaparse";

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows, { header: true });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseCsvRecords(
  file: File
): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
      complete: (res) => {
        const rows = (res.data || [])
          .map((row) => {
            const o: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) {
              o[k] = v == null ? "" : String(v).trim();
            }
            return o;
          })
          .filter((r) => Object.values(r).some((v) => v !== ""));
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

function normKey(k: string) {
  return k.toLowerCase().replace(/\s+/g, "_");
}

/** Read a cell using flexible header aliases (case- and space-insensitive). */
export function getCell(row: Record<string, string>, ...aliases: string[]): string {
  const map = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [normKey(k), v])
  );
  for (const a of aliases) {
    const v = map[normKey(a)];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}
