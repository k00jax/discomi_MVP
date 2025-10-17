import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import s from "@/styles/Setup.module.css";

export default function Setup() {
  const [uid, setUid] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState<"idle"|"ok"|"err">("idle");

  const prefUid = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(window.location.href).searchParams.get("uid") ?? "";
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

  return (
    <main className={s.container}>
      <section className={s.card}>
        <div className={s.logoWrap}>
          <Image
            src="/discomi.png"
            alt="DiscOmi"
            fill
            priority
            sizes="128px"
            style={{ objectFit: "cover" }}
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

          <button className={s.button} type="submit">Register</button>
        </form>

        {status === "ok"  && <p className={s.footer} style={{color:"#bcd7ff"}}>Saved. New conversations will post to your Discord.</p>}
        {status === "err" && <p className={s.footer} style={{color:"#ffb3b3"}}>Save failed. Check UID and webhook URL.</p>}
      </section>
    </main>
  );
}
