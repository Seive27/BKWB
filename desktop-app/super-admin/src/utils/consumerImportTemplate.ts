import ExcelJS from 'exceljs';
import { downloadFile } from './downloadFile';
import { buildExportFilename, EXPORT_HEADER_FILL } from './exportSpreadsheet';
import { IMPORT_COLUMNS, IMPORT_SHEET_NAME, type ImportColumn } from '../services/dataImportService';

const TEXT_COLUMNS = new Set<ImportColumn>([
  'resident_accounts.account_number',
  'meters.meter_number',
  'resident_accounts.previous_reading_date',
]);

function styleHeader(sheet: ExcelJS.Worksheet): void {
  const header = sheet.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_HEADER_FILL } };
    cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  });
  IMPORT_COLUMNS.forEach((column, index) => {
    const width = Math.min(Math.max(column.length + 2, 18), 42);
    const excelColumn = sheet.getColumn(index + 1);
    excelColumn.width = width;
    if (TEXT_COLUMNS.has(column)) excelColumn.numFmt = '@';
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const lastColumn = sheet.getColumn(IMPORT_COLUMNS.length).letter;
  sheet.autoFilter = { from: 'A1', to: `${lastColumn}1` };
}

/** Blank workbook: one `import` sheet and the Supabase column headers. */
export async function downloadConsumerImportTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BKWB';
  workbook.created = new Date();

  const importSheet = workbook.addWorksheet(IMPORT_SHEET_NAME);
  importSheet.addRow([...IMPORT_COLUMNS]);
  styleHeader(importSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  await downloadFile(blob, buildExportFilename('Consumer_Import_Template', null, 'xlsx'));
}
