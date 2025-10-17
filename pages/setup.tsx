import { useEffect, useMemo, useState } from "react";
import s from "@/styles/Setup.module.css";

export default function Setup() {
  const [uid, setUid] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState<"idle"|"ok"|"err">("idle");
  const [nameCorrections, setNameCorrections] = useState<string>("");
  const [storeKeyword, setStoreKeyword] = useState<string>("");
  const [startKeyword, setStartKeyword] = useState<string>("");

  const prefUid = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get("uid") ?? "";
  }, []);

  useEffect(() => { if (prefUid) setUid(prefUid); }, [prefUid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    
    // Parse important names/terms from textarea (one per line)
    // These will be used as a dictionary for spell-correction
    const customEntities: { important_terms?: string[] } = {};
    if (nameCorrections.trim()) {
      const terms = nameCorrections
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (terms.length > 0) {
        customEntities.important_terms = terms;
      }
    }
    
    const url = `/api/register${uid ? `?uid=${encodeURIComponent(uid)}` : ""}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        webhookUrl,
        custom_entities: Object.keys(customEntities).length > 0 ? customEntities : undefined,
        options: {
          storeKeyword: storeKeyword.trim() || undefined,
          startKeyword: startKeyword.trim() || undefined,
        },
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
            <label>Important Names & Terms (optional)</label>
            <p style={{fontSize: "0.9em", color: "#999", marginTop: "0.25rem", marginBottom: "0.5rem"}}>
              Add names and terms you want transcribed correctly. One per line. &quot;DiscOmi&quot; is included by default.
            </p>
            <textarea
              className={s.input}
              placeholder={"Kaitlin\nSan Francisco\nYour Company Name"}
              value={nameCorrections}
              onChange={e => setNameCorrections(e.target.value)}
              rows={4}
              style={{fontFamily: "monospace", fontSize: "0.95em"}}
            />
          </div>

          <div className={s.field}>
            <label>Custom Trigger Phrases (optional)</label>
            <p style={{fontSize: "0.9em", color: "#999", marginTop: "0.25rem", marginBottom: "0.5rem"}}>
              Customize the voice commands for saving and starting fresh sessions.
            </p>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px"}}>
              <div>
                <label style={{fontSize: "0.85em", color: "#999"}}>Save phrase (default: &quot;store memory&quot;)</label>
                <input
                  className={s.input}
                  placeholder="store memory"
                  value={storeKeyword}
                  onChange={e => setStoreKeyword(e.target.value)}
                  style={{marginTop: "4px"}}
                />
              </div>
              <div>
                <label style={{fontSize: "0.85em", color: "#999"}}>Start fresh phrase (default: &quot;start memory&quot;)</label>
                <input
                  className={s.input}
                  placeholder="start memory"
                  value={startKeyword}
                  onChange={e => setStartKeyword(e.target.value)}
                  style={{marginTop: "4px"}}
                />
              </div>
            </div>
          </div>

          <button className={s.button} type="submit">Register</button>
        </form>

        {status === "ok"  && <p className={s.footer} style={{color:"#bcd7ff"}}>Saved. New conversations will post to your Discord.</p>}
        {status === "err" && <p className={s.footer} style={{color:"#ffb3b3"}}>Save failed. Check UID and webhook URL.</p>}
      </section>
    </main>
  );
}
