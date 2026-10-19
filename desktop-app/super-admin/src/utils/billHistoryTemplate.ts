import ExcelJS from 'exceljs';
import {
  BILL_HISTORY_ROW_LIMIT,
  BILL_IMPORT_COLUMNS,
  BILL_IMPORT_SHEET_NAME,
  type BillHistoryAccount,
  type BillImportColumn,
} from '../services/dataImportService';
import { downloadFile } from './downloadFile';
import { buildExportFilename, EXPORT_HEADER_FILL } from './exportSpreadsheet';

const TEXT_COLUMNS = new Set<BillImportColumn>([
  'resident_accounts.account_number',
  'bills.billing_period',
]);

function styleHeader(sheet: ExcelJS.Worksheet, rowCount: number): void {
  const header = sheet.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_HEADER_FILL } };
    cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  });

  BILL_IMPORT_COLUMNS.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1);
    excelColumn.width = Math.min(Math.max(column.length + 2, 16), 36);
    if (TEXT_COLUMNS.has(column)) excelColumn.numFmt = '@';
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const lastColumn = sheet.getColumn(BILL_IMPORT_COLUMNS.length).letter;
  const lastRow = Math.max(rowCount + 1, 2);
  sheet.autoFilter = { from: 'A1', to: `${lastColumn}${lastRow}` };
}

export interface BillHistoryDownload {
  accounts: BillHistoryAccount[];
  sitioLabel: string;
  period: string;
  /** 1-based slice when more than 100 accounts still need the month. */
  part: number;
}

/**
 * One sitio and one billing period. Name, account number, and period are filled.
 * At most 100 accounts. Readings and amounts stay blank.
 */
export async function downloadBillHistoryTemplate(input: BillHistoryDownload): Promise<void> {
  const start = (input.part - 1) * BILL_HISTORY_ROW_LIMIT;
  const page = input.accounts.slice(start, start + BILL_HISTORY_ROW_LIMIT);
  if (page.length === 0) {
    throw new Error('That part has no accounts left to migrate.');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BKWB';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(BILL_IMPORT_SHEET_NAME);
  sheet.addRow([...BILL_IMPORT_COLUMNS]);

  const lastNameColumn = BILL_IMPORT_COLUMNS.indexOf('profiles.last_name') + 1;
  const firstNameColumn = BILL_IMPORT_COLUMNS.indexOf('profiles.first_name') + 1;
  const accountColumn = BILL_IMPORT_COLUMNS.indexOf('resident_accounts.account_number') + 1;
  const periodColumn = BILL_IMPORT_COLUMNS.indexOf('bills.billing_period') + 1;

  page.forEach((account, index) => {
    const row = sheet.getRow(index + 2);
    row.getCell(lastNameColumn).value = account.lastName;
    row.getCell(firstNameColumn).value = account.firstName;
    const accountCell = row.getCell(accountColumn);
    accountCell.value = account.accountNumber;
    accountCell.numFmt = '@';
    const periodCell = row.getCell(periodColumn);
    periodCell.value = input.period;
    periodCell.numFmt = '@';
    row.commit();
  });

  styleHeader(sheet, page.length);

  const totalParts = Math.ceil(input.accounts.length / BILL_HISTORY_ROW_LIMIT);
  const scope = totalParts > 1 ? `${input.sitioLabel}_${input.period}_${input.part}` : `${input.sitioLabel}_${input.period}`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  await downloadFile(blob, buildExportFilename('Bill_History', scope, 'xlsx'));
}
