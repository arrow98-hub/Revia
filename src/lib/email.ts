import "server-only";

/** Envía el código de acceso. Es el ÚNICO correo que manda la app. */
export async function sendLoginCodeEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LOGIN_CODE_FROM ?? "Revia <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[Revia · desarrollo] Código de acceso para ${to}: ${code}\n`);
      return;
    }
    throw new Error("Falta RESEND_API_KEY");
  }

  const spaced = code.split("").join(" ");
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:420px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 8px"><div style="font-weight:700;font-size:18px;color:#2563eb">Revia</div></td></tr>
      <tr><td style="padding:8px 28px 0;font-size:16px;line-height:1.5">Tu código para entrar:</td></tr>
      <tr><td style="padding:16px 28px"><div style="font-size:32px;font-weight:700;letter-spacing:6px;color:#0f172a">${spaced}</div></td></tr>
      <tr><td style="padding:0 28px 28px;font-size:14px;line-height:1.5;color:#64748b">Vence en 10 minutos. Si no fuiste tú, ignora este correo; nadie podrá entrar sin tu contraseña.</td></tr>
    </table>
  </td></tr></table></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${code} es tu código de Revia`,
      html,
      text: `Tu código para entrar a Revia: ${code}\nVence en 10 minutos.`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}
