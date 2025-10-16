import Link from "next/link";

export default function Home() {
  const build = process.env.BUILD_ID || "unknown";
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        padding: 24,
        lineHeight: 1.5,
        maxWidth: 820,
        margin: "0 auto",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <img
          src="/discomi.png"
          alt="DiscOmi bot avatar"
          width={64}
          height={64}
          style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        />
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>DiscOmi</h1>
          <p style={{ margin: "6px 0 0 0", color: "#555" }}>
            Posts your Omi memories to your Discord channel. Per-user token. Nothing stored.
          </p>
        </div>
      </header>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Get Started</h2>
        <ol style={{ marginTop: 0 }}>
          <li>
            <strong>Register</strong> to get your personal Omi webhook URL:
            {" "}
            <Link href="/api/register"><code>/api/register</code></Link>
            {" "} (POST with <code>{{"{"}} uid, webhookUrl {{ "}" }}</code>)
          </li>
          <li>
            Paste the returned URL into Omi. Omi will append your <code>uid</code> when it calls us.
          </li>
        </ol>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>API Endpoints</h2>
        <ul style={{ marginTop: 0 }}>
          <li>
            Setup check: <Link href="/api/setup-complete"><code>/api/setup-complete</code></Link>
          </li>
          <li>
            Webhook endpoint: <code>/api/webhook?token=…</code> (Omi adds <code>&amp;uid=…</code>)
          </li>
          <li>
            Version info: <Link href="/api/version"><code>/api/version</code></Link>
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Features</h2>
        <ul style={{ marginTop: 0 }}>
          <li>✔ Per-user Discord webhooks</li>
          <li>✔ Secure token authentication</li>
          <li>✔ Extracts titles and overviews from Omi memories</li>
          <li>✔ No data storage — direct relay only</li>
          <li>✔ Supabase-backed multi-tenant routing</li>
        </ul>
      </section>

      <p style={{ marginTop: 32, color: "#666" }}>
        Build: <code>{build}</code>
      </p>
    </main>
  );
}
