/**
 * Utility function to convert JSON data to CSV and trigger browser download
 */
export function exportToCsv<T extends object>(
  filename: string,
  data: T[],
  columnHeaders?: Partial<Record<keyof T | string, string>>
) {
  if (!data || data.length === 0) {
    alert('No data available to export');
    return;
  }

  const keys = columnHeaders ? Object.keys(columnHeaders) : Object.keys(data[0]);
  const headers = columnHeaders ? Object.values(columnHeaders) : keys;

  const csvRows: string[] = [];

  // 1. Add headers row
  csvRows.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // 2. Add data rows
  data.forEach((row) => {
    const values = keys.map((key) => {
      const val = (row as Record<string, unknown>)[key];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'number') return val.toString();
      if (typeof val === 'boolean') return val ? '"True"' : '"False"';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
