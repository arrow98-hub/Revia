import { readFile } from "node:fs/promises";
import path from "node:path";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Novedades" };

interface Release {
  version: string;
  date: string;
  items: string[];
}

function parseChangelog(md: string): Release[] {
  const out: Release[] = [];
  for (const line of md.split("\n")) {
    const h = line.match(/^##\s*\[?([\d.]+)\]?\s*[-–]\s*(\S+)/);
    if (h) out.push({ version: h[1], date: h[2], items: [] });
    else if (line.startsWith("- ") && out.length) out[out.length - 1].items.push(line.slice(2).trim());
  }
  return out;
}

export default async function ChangelogPage() {
  const md = await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8").catch(() => "");
  const releases = parseChangelog(md);
  const current = process.env.NEXT_PUBLIC_APP_VERSION;
  return (
    <div className="max-w-[640px]">
      <PageHeader title="Novedades" subtitle={`Estás usando la versión ${current}.`} back={{ href: "/ajustes", label: "Ajustes" }} />
      <ol className="flex flex-col gap-4">
        {releases.map((r) => (
          <li key={r.version} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-xs">
            <p className="flex items-center gap-2">
              <span className="tabular text-[17px] font-bold">v{r.version}</span>
              {r.version === current ? <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">Actual</span> : null}
              <span className="tabular ml-auto text-sm text-muted">{r.date}</span>
            </p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[15px] text-neutral marker:text-faint">
              {r.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
