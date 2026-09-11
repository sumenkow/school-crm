/**
 * Zero-dependency Excel Workbook generator.
 * Produces Microsoft Excel XML 2003 (.xls / .xml) multi-sheet workbooks.
 * Natively supported by Microsoft Excel, Apple Numbers, LibreOffice, and Google Sheets.
 */

function escapeXml(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateExcelWorkbook(tables: Record<string, Array<Record<string, string | number>>>): string {
  let worksheetsXml = '';

  for (const [sheetName, rows] of Object.entries(tables)) {
    if (!rows || rows.length === 0) continue;

    const headers = Object.keys(rows[0]);

    let rowsXml = '';

    // Header row
    rowsXml += '      <Row ss:StyleID="Header">\n';
    for (const h of headers) {
      rowsXml += `        <Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>\n`;
    }
    rowsXml += '      </Row>\n';

    // Data rows
    for (const row of rows) {
      rowsXml += '      <Row>\n';
      for (const h of headers) {
        const val = row[h];
        const isNum = typeof val === 'number' && !isNaN(val);
        const type = isNum ? 'Number' : 'String';
        rowsXml += `        <Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>\n`;
      }
      rowsXml += '      </Row>\n';
    }

    worksheetsXml += `
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>
${rowsXml}    </Table>
  </Worksheet>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#101C2B" ss:Size="11"/>
   <Interior ss:Color="#D3E4FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#90CAF9"/>
   </Borders>
  </Style>
 </Styles>
${worksheetsXml}
</Workbook>`;
}

/**
 * Generate UTF-8 CSV with BOM for Russian Excel compatibility
 */
export function generateCsv(rows: Array<Record<string, string | number>>): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const bom = '\uFEFF';

  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(';');
  const dataLines = rows.map((r) =>
    headers
      .map((h) => {
        const val = r[h] !== null && r[h] !== undefined ? String(r[h]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(';')
  );

  return bom + [headerLine, ...dataLines].join('\r\n');
}
