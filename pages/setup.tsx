import { useState } from "react";

export default function Setup() {
  const [uid, setUid] = useState<string>("");
  const [hook, setHook] = useState<string>("");
  const [result, setResult] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult("Working…");
    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, webhookUrl: hook }),
    });
    const t = await r.text();
    setResult(t);
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1>DiscOmi Setup</h1>
      <p>Paste your Discord channel webhook URL to complete setup.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          Omi UID
          <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Your Omi user id" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>
          Discord Webhook URL
          <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="https://discord.com/api/webhooks/…" style={{ width: "100%", padding: 8 }} />
        </label>
        <button type="submit" style={{ padding: "8px 14px", cursor: "pointer" }}>Register</button>
      </form>
      {result && <pre style={{ marginTop: 16, background: "#f6f6f6", padding: 12, overflow: "auto" }}>{result}</pre>}
    </main>
  );
}
