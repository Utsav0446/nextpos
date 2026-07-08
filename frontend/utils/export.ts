/**
 * Exports JSON data objects to a downloadable CSV spreadsheet.
 * Must be executed in client context.
 */
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (typeof window === 'undefined') return; // Ensure client-side only execution
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((row) =>
    Object.values(row)
      .map((val) => {
        let text = val === null || val === undefined ? '' : String(val);
        // Escape quotes
        text = text.replace(/"/g, '""');
        // Wrap in quotes if it contains separator character, quotes, or newlines
        if (text.includes(',') || text.includes('\n') || text.includes('"')) {
          text = `"${text}"`;
        }
        return text;
      })
      .join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
