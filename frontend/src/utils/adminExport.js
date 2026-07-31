const safeFileName = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const pdfSafe = (value) =>
  String(value ?? "-")
    .replaceAll("Ğ", "G").replaceAll("ğ", "g")
    .replaceAll("Ü", "U").replaceAll("ü", "u")
    .replaceAll("Ş", "S").replaceAll("ş", "s")
    .replaceAll("İ", "I").replaceAll("ı", "i")
    .replaceAll("Ö", "O").replaceAll("ö", "o")
    .replaceAll("Ç", "C").replaceAll("ç", "c");

export async function exportAdminExcel({ title, columns, rows }) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const header = columns.map((column) => ({
    value: column.label,
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "#155EEF",
  }));
  const data = rows.map((row) =>
    columns.map((column) => ({ value: String(column.value(row) ?? "-") })),
  );

  await writeXlsxFile([header, ...data], {
    columns: columns.map((column) => ({ width: Math.min(column.width || 20, 45) })),
    fileName: `${safeFileName(title)}-${dateStamp()}.xlsx`,
    sheet: title.slice(0, 31),
  });
}

export async function exportAdminPdf({ title, columns, rows }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const orientation = columns.length > 6 ? "landscape" : "portrait";
  const document = new jsPDF({ orientation, unit: "mm", format: "a4" });
  document.setFillColor(7, 26, 50);
  document.rect(0, 0, document.internal.pageSize.getWidth(), 28, "F");
  document.setTextColor(255, 255, 255);
  document.setFontSize(17);
  document.text(pdfSafe(title), 14, 17);
  document.setFontSize(8);
  document.text(`VIP Transfer - ${new Date().toLocaleString("tr-TR")}`, 14, 23);

  autoTable(document, {
    startY: 35,
    head: [columns.map((column) => pdfSafe(column.label))],
    body: rows.map((row) => columns.map((column) => pdfSafe(column.value(row)))),
    styles: { fontSize: 7.5, cellPadding: 2.2, overflow: "linebreak" },
    headStyles: { fillColor: [21, 94, 239], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 247, 251] },
    margin: { left: 10, right: 10 },
  });
  document.save(`${safeFileName(title)}-${dateStamp()}.pdf`);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
