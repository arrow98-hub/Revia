import "server-only";

/**
 * Intenta obtener la imagen principal de un link (og:image / Amazon landingImage).
 * Best-effort: si falla devuelve null en silencio (CLAUDE.md §8.2).
 */
function isSafePublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    // Bloquea IPs literales (evita SSRF hacia redes internas)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":")) return false;
    return h.includes(".");
  } catch {
    return false;
  }
}

export async function fetchPreviewImage(url: string): Promise<string | null> {
  if (!isSafePublicUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es-US,es;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 600_000);
    const candidates = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /id=["']landingImage["'][^>]+data-old-hires=["']([^"']+)["']/i,
      /data-old-hires=["']([^"']+)["']/i,
      /id=["']landingImage["'][^>]+src=["']([^"']+)["']/i,
      /"hiRes":"(https:[^"]+)"/i,
    ];
    for (const re of candidates) {
      const m = html.match(re);
      if (m?.[1]) {
        const img = new URL(m[1].replace(/&amp;/g, "&"), res.url).toString();
        if (img.startsWith("https://")) return img;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
