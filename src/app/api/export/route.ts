import ExcelJS from "exceljs";
import { requireSession } from "@/lib/dal";
import { listProducts, listProviders } from "@/lib/data";
import { CONTACT_LABELS, EVENT_LABELS, REVIEW_TYPE_LABELS, STATUS_LABELS, STORE_LABELS } from "@/lib/domain/labels";
import { displayStatus } from "@/lib/domain/status";
import { dateTimeInTz } from "@/lib/domain/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const { supabase, user, profile, today } = await requireSession();
  const url = new URL(req.url);
  const format = url.searchParams.get("formato") === "csv" ? "csv" : "xlsx";
  const withTrash = url.searchParams.get("papelera") === "1";

  const [active, trashed, providers] = await Promise.all([
    listProducts(supabase, user.id),
    withTrash ? listProducts(supabase, user.id, { trashed: true }) : Promise.resolve([]),
    listProviders(supabase, user.id),
  ]);
  const products = [...active, ...trashed];
  const tz = profile.timezone;

  const header = [
    "Código", "Producto", "Proveedor", "Contacto", "Tienda", "Link", "Lleva review", "Tipo de review", "Días para review",
    "Estado", "Registrado", "Llegada estimada", "Llegó", "Review antes del", "Review hecho", "Notas", "En papelera",
  ];
  const rows = products.map((p) => [
    p.code,
    p.name,
    p.provider?.name ?? "",
    p.contact_channel ? CONTACT_LABELS[p.contact_channel] : "",
    p.store === "other" ? p.store_other ?? "Otra" : STORE_LABELS[p.store],
    p.url ?? "",
    p.requires_review ? "Sí" : "No",
    p.review_types.map((t) => REVIEW_TYPE_LABELS[t]).join(", "),
    p.review_days ?? "",
    STATUS_LABELS[displayStatus(p, today)],
    dateTimeInTz(p.registered_at, tz),
    p.expected_arrival_date,
    p.arrived_on ?? "",
    p.review_due_date ?? "",
    p.reviewed_on ?? "",
    p.notes ?? "",
    p.deleted_at ? "Sí" : "No",
  ]);
  const stamp = today;

  if (format === "csv") {
    const body = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="revia-productos-${stamp}.csv"`,
      },
    });
  }

  const ids = products.map((p) => p.id);
  const { data: events } = ids.length
    ? await supabase.from("product_events").select("*").in("product_id", ids).order("created_at")
    : { data: [] };
  const codeById = new Map(products.map((p) => [p.id, p.code]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Revia";
  wb.created = new Date();
  const styleHeader = (ws: ExcelJS.Worksheet) => {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: "FF0F172A" } };
    r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  const ws = wb.addWorksheet("Productos");
  ws.addRow(header);
  rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c, i) => (c.width = [14, 36, 22, 12, 14, 40, 12, 26, 10, 22, 22, 16, 14, 16, 14, 40, 12][i] ?? 16));
  styleHeader(ws);

  const wp = wb.addWorksheet("Proveedores");
  wp.addRow(["Proveedor", "Contacto", "Usuario / teléfono", "Productos", "Notas"]);
  providers.forEach((pv) =>
    wp.addRow([
      pv.name,
      pv.contact_channel ? CONTACT_LABELS[pv.contact_channel] : "",
      pv.contact_handle ?? "",
      products.filter((p) => p.provider_id === pv.id).length,
      pv.notes ?? "",
    ]),
  );
  wp.columns.forEach((c, i) => (c.width = [28, 14, 24, 12, 40][i]));
  styleHeader(wp);

  const wh = wb.addWorksheet("Historial");
  wh.addRow(["Código", "Movimiento", "Detalle", "Nota", "Fecha"]);
  (events ?? []).forEach((e) =>
    wh.addRow([
      codeById.get(e.product_id) ?? "",
      EVENT_LABELS[e.type] ?? e.type,
      e.payload?.from && e.payload?.to ? `${e.payload.from} → ${e.payload.to}` : e.payload?.date ?? "",
      e.note ?? "",
      dateTimeInTz(e.created_at, tz),
    ]),
  );
  wh.columns.forEach((c, i) => (c.width = [14, 26, 26, 40, 22][i]));
  styleHeader(wh);

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="revia-${stamp}.xlsx"`,
    },
  });
}
