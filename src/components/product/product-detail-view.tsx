import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { ProductThumb, ReviewTypeList } from "@/components/product-bits";
import { StatusBadge } from "@/components/status-badge";
import { CONTACT_ICONS } from "@/components/icons";
import { CONTACT_LABELS, STORE_LABELS } from "@/lib/domain/labels";
import { dateTimeInTz, fullDate, relativeDay } from "@/lib/domain/dates";
import { displayStatus } from "@/lib/domain/status";
import type { ProductEvent, ProductWithProvider } from "@/lib/types";
import { DetailTabs } from "./detail-tabs";
import { PhotoGallery, type GalleryPhoto } from "./photo-gallery";
import { ProductActions } from "./product-actions";
import { statusSuffix } from "./product-card";
import { Timeline } from "./timeline";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[15px] font-medium text-ink">{children}</dd>
    </div>
  );
}

export function ProductDetailView({
  product: p,
  events,
  photos,
  today,
  timezone,
  userId,
  readOnly,
}: {
  product: ProductWithProvider;
  events: ProductEvent[];
  photos: GalleryPhoto[];
  today: string;
  timezone: string;
  userId: string;
  readOnly?: boolean;
}) {
  const s = displayStatus(p, today);
  const ContactIcon = p.contact_channel ? CONTACT_ICONS[p.contact_channel] : null;
  const arrival = photos.filter((x) => x.kind === "arrival");
  const review = photos.filter((x) => x.kind === "review");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <div className="min-w-0">
        <div className="flex items-start gap-4">
          <ProductThumb src={p.image_url} alt={p.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="code-tag text-sm text-neutral">{p.code}</p>
            <h1 className="mt-0.5 text-[22px] leading-snug font-bold text-ink lg:text-[26px]">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={s} suffix={statusSuffix(p, s, today)} />
              {p.deleted_at ? <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-xs font-semibold text-neutral">En papelera</span> : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {p.url ? (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-field)] border border-border bg-surface px-4 text-[15px] font-semibold shadow-xs transition-colors hover:bg-bg-subtle"
            >
              <ExternalLink className="size-4" aria-hidden /> Abrir en {p.store === "other" ? p.store_other : STORE_LABELS[p.store]}
            </a>
          ) : null}
          {!readOnly && !p.deleted_at ? (
            <div className="flex min-w-60 flex-1">
              <ProductActions product={p} status={s} userId={userId} today={today} layout="detail" showEdit />
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <DetailTabs
            tabs={[
              { key: "historial", label: "Historial", count: events.length, content: <Timeline events={events} timezone={timezone} /> },
              {
                key: "fotos",
                label: "Fotos",
                count: photos.length,
                content: (
                  <div className="flex flex-col gap-6">
                    <PhotoGallery
                      photos={arrival}
                      productId={p.id}
                      userId={userId}
                      kind="arrival"
                      title="Al llegar"
                      emptyText="Aún no hay fotos de la llegada."
                      readOnly={readOnly || Boolean(p.deleted_at) || !p.arrived_on}
                    />
                    {p.requires_review ? (
                      <PhotoGallery
                        photos={review}
                        productId={p.id}
                        userId={userId}
                        kind="review"
                        title="Capturas del review"
                        emptyText="Aún no hay capturas del review."
                        readOnly={readOnly || Boolean(p.deleted_at) || p.status !== "completed"}
                      />
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      <aside>
        <dl className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface px-4 shadow-xs">
          <Row label="Proveedor">
            {p.provider ? (
              <Link href={`/proveedores/${p.provider.id}`} className="text-primary hover:underline">
                {p.provider.name}
              </Link>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Tienda">{p.store === "other" ? p.store_other : STORE_LABELS[p.store]}</Row>
          <Row label="Contacto">
            {p.contact_channel && ContactIcon ? (
              <span className="inline-flex items-center gap-1.5">
                <ContactIcon className="size-4 text-muted" aria-hidden /> {CONTACT_LABELS[p.contact_channel]}
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </Row>
          <Row label="Review">
            {p.requires_review ? (
              <div className="flex justify-end">
                <ReviewTypeList types={p.review_types} />
              </div>
            ) : (
              <span className="text-muted">No lleva review</span>
            )}
          </Row>
          {p.requires_review ? <Row label="Plazo">{p.review_days} días desde que llega</Row> : null}
          <Row label="Registrado">
            <span className="tabular">{dateTimeInTz(p.registered_at, timezone)}</span>
          </Row>
          <Row label={p.arrived_on ? "Llegada estimada" : "Llega aprox."}>
            <span className="tabular">{fullDate(p.expected_arrival_date)}</span>
            {!p.arrived_on ? <span className="block text-[13px] font-normal text-muted">{relativeDay(p.expected_arrival_date, today)}</span> : null}
          </Row>
          {p.arrived_on ? (
            <Row label="Llegó">
              <span className="tabular">{fullDate(p.arrived_on)}</span>
            </Row>
          ) : null}
          {p.review_due_date ? (
            <Row label="Review antes del">
              <span className={`tabular ${s === "review_overdue" ? "text-danger" : ""}`}>{fullDate(p.review_due_date)}</span>
            </Row>
          ) : null}
          {p.reviewed_on ? (
            <Row label="Review hecho">
              <span className="tabular">{fullDate(p.reviewed_on)}</span>
            </Row>
          ) : null}
          {p.notes ? (
            <div className="py-3">
              <dt className="text-sm text-muted">Notas</dt>
              <dd className="mt-1 text-[15px] whitespace-pre-wrap text-ink">{p.notes}</dd>
            </div>
          ) : null}
        </dl>
      </aside>
    </div>
  );
}
