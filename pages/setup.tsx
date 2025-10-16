import { useEffect, useMemo, useState } from "react";

export default function Setup() {
  const [uid, setUid] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [status, setStatus] = useState<"idle"|"ok"|"err">("idle");

  // read ?uid= from URL
  const prefUid = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href).searchParams.get("uid");
    return u ?? "";
  }, []);

  useEffect(() => { if (prefUid) setUid(prefUid); }, [prefUid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const url = `/api/register${uid ? `?uid=${encodeURIComponent(uid)}` : ""}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl }),
    });
    setStatus(r.ok ? "ok" : "err");
  }

  const uidLocked = !!prefUid;

  return (
    <main style={{maxWidth: 560, margin: "48px auto", fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif", padding: "0 24px"}}>
      <img src="/discomi.png" alt="DiscOmi" width={96} height={96} style={{borderRadius: 16}} />
      <h1>DiscOmi Setup</h1>
      <p>Paste your Discord channel webhook. {uidLocked ? "Your UID was detected from Omi." : "If Omi passed your UID, we'll auto-fill it."}</p>

      <form onSubmit={onSubmit} style={{display:"grid", gap:12}}>
        <label>
          Discord Webhook URL
          <input
            required
            placeholder="https://discord.com/api/webhooks/…"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            style={{width:"100%", padding: 8}}
          />
        </label>

        {uidLocked ? (
          <div style={{opacity:.9, fontSize:14, background: "#f0f9ff", padding: 12, borderRadius: 6, border: "1px solid #bae6fd"}}>
            <strong>✓ UID detected from Omi:</strong> <code style={{background: "#e0f2fe", padding: "2px 6px", borderRadius: 4}}>{uid}</code>
          </div>
        ) : (
          <label>
            Your Omi UID
            <input
              required
              placeholder="W7xTE…"
              value={uid}
              onChange={e => setUid(e.target.value)}
              style={{width:"100%", padding: 8}}
            />
          </label>
        )}

        <button type="submit" style={{padding: "8px 14px", cursor: "pointer"}}>Register</button>
      </form>

      {status === "ok"  && <p style={{color:"green"}}>✅ Saved. New conversations will post to Discord.</p>}
      {status === "err" && <p style={{color:"crimson"}}>❌ Save failed. Check UID and webhook URL.</p>}
    </main>
  );
}
