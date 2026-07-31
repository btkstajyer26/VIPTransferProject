import { FileDown, Sheet } from "lucide-react";
import { exportAdminExcel, exportAdminPdf } from "@/utils/adminExport";

function ExportButtons({ title, columns, rows = [] }) {
  const disabled = rows.length === 0;
  const commonClass = "inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={() => exportAdminExcel({ title, columns, rows })} className={`${commonClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
        <Sheet size={16} /> Excel
      </button>
      <button type="button" disabled={disabled} onClick={() => exportAdminPdf({ title, columns, rows })} className={`${commonClass} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}>
        <FileDown size={16} /> PDF
      </button>
    </div>
  );
}

export default ExportButtons;
