import { useEffect, useMemo, useState } from "react";
import s from "@/styles/Setup.module.css";

export default function Setup() {
  const [uid, setUid] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState<"idle"|"ok"|"err">("idle");
  const [nameCorrections, setNameCorrections] = useState<string>("");

  const prefUid = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get("uid") ?? "";
  }, []);

  useEffect(() => { if (prefUid) setUid(prefUid); }, [prefUid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    
    // Parse name corrections from textarea (format: "wrong → correct" per line)
    const customEntities: any = {};
    if (nameCorrections.trim()) {
      const names: Record<string, string> = {};
      nameCorrections.split("\n").forEach(line => {
        const match = line.match(/^(.+?)\s*[→\-–>]\s*(.+)$/);
        if (match) {
          const [, incorrect, correct] = match;
          names[incorrect.trim().toLowerCase()] = correct.trim();
        }
      });
      if (Object.keys(names).length > 0) {
        customEntities.names = names;
      }
    }
    
    const url = `/api/register${uid ? `?uid=${encodeURIComponent(uid)}` : ""}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        webhookUrl,
        custom_entities: Object.keys(customEntities).length > 0 ? customEntities : undefined,
      }),
    });
    setStatus(r.ok ? "ok" : "err");
  }

  return (
    <main className={s.container}>
      <section className={s.card}>
        <div className={s.logo}>
          <img
            src="/discomi.png"
            alt="DiscOmi"
            width={120}
            height={120}
            loading="eager"
            decoding="async"
          />
        </div>

        <h1 className={s.title}>DiscOmi Setup</h1>
        <p className={s.lead}>
          Paste your Discord channel webhook. {prefUid ? "Your UID was detected from Omi." : "Enter your Omi UID once."}
        </p>

        <form onSubmit={onSubmit}>
          <div className={s.field}>
            <label>Discord Webhook URL</label>
            <input
              required
              className={s.input}
              placeholder="https://discord.com/api/webhooks/…"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              inputMode="url"
            />
          </div>

          {prefUid ? (
            <div className={s.badge} aria-live="polite">
              <span>✅ UID detected from Omi:</span>
              <code title={uid}>{uid}</code>
            </div>
          ) : (
            <div className={s.field}>
              <label>Your Omi UID</label>
              <input
                required
                className={s.input}
                placeholder="W7xTEw3Y…"
                value={uid}
                onChange={e => setUid(e.target.value)}
              />
            </div>
          )}

          <div className={s.field}>
            <label>Custom Name Corrections (optional)</label>
            <p style={{fontSize: "0.9em", color: "#999", marginTop: "0.25rem", marginBottom: "0.5rem"}}>
              Fix misheard names. One per line: <code style={{background: "#333", padding: "2px 6px", borderRadius: "3px"}}>wrong → correct</code>
            </p>
            <textarea
              className={s.input}
              placeholder={"Caitlyn → Kaitlin\nKatelyn → Kaitlin\nKate → Kaitlin"}
              value={nameCorrections}
              onChange={e => setNameCorrections(e.target.value)}
              rows={4}
              style={{fontFamily: "monospace", fontSize: "0.95em"}}
            />
          </div>

          <button className={s.button} type="submit">Register</button>
        </form>

        {status === "ok"  && <p className={s.footer} style={{color:"#bcd7ff"}}>Saved. New conversations will post to your Discord.</p>}
        {status === "err" && <p className={s.footer} style={{color:"#ffb3b3"}}>Save failed. Check UID and webhook URL.</p>}
      </section>
    </main>
  );
}
