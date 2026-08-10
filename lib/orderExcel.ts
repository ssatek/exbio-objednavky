import ExcelJS from "exceljs";

export type OrderExcelItem = {
  sku: string;
  name: string;
  quantity: number;
  brand: string;
};

// Brandy vyráběné/skladované v hlavním skladu 1LA. Cokoli jiného v objednávce
// (i jedna položka) posílá celou objednávku na sklad 4TR.
const CORE_BRANDS = new Set(["LAHOFER", "HANZEL", "WALDBERG"]);

export async function buildOrderExcel(items: OrderExcelItem[]): Promise<Buffer> {
  const iduStore = items.every((item) => CORE_BRANDS.has(item.brand)) ? "1LA - HV" : "4TR - HV";

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Objednávka");

  sheet.columns = [
    { width: 12 },
    { width: 14 },
    { width: 24 },
    { width: 45 },
    { width: 24 },
    { width: 12 },
  ];

  sheet.addRow(["", "Cislo", "Katalogove cislo vyrobce", "Nazev", "Mnozstvi (ve vychozi jednotce)", "Sklad"]);
  const headerRow = sheet.addRow(["SARŽE", "NUM", "KCI", "ITEM_NAME", "QUANT_COM", "IDU_STORE"]);
  headerRow.font = { bold: true };
  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 6 } };

  for (const item of items) {
    sheet.addRow(["", item.sku, "", item.name, item.quantity, iduStore]);
  }

  sheet.getColumn(5).numFmt = "0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
