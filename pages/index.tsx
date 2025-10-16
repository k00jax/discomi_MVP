import type { GetServerSideProps } from "next";
import Link from "next/link";

type Props = { build: string };

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  return { props: { build: process.env.BUILD_ID ?? "unknown" } };
};

export default function Home({ build }: Props) {
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
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            aspectRatio: "1 / 1",
          }}
        >
          <img
            src="/discomi.png"
            alt="DiscOmi bot avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>DiscOmi</h1>
          <p style={{ margin: "6px 0 0 0", color: "#555" }}>
            Posts your Omi memories to your Discord channel. Per-user token. Nothing stored.
          </p>
        </div>
      </header>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Install & Setup</h2>
        <ol style={{ marginTop: 0 }}>
          <li>
            Install DiscOmi from the Omi App Store. Omi will redirect you here to finish setup.
          </li>
          <li>
            Paste your <strong>Discord channel webhook URL</strong> on the{" "}
            <Link href="/setup"><code>/setup</code></Link> page. We register your account and return
            your personal Omi webhook automatically.
          </li>
        </ol>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>API Endpoints</h2>
        <ul style={{ marginTop: 0 }}>
          <li>
            Setup page: <Link href="/setup"><code>/setup</code></Link> (form → calls{" "}
            <code>/api/register</code>)
          </li>
          <li>
            Webhook receiver: <code>/api/webhook?token=…</code> &nbsp;(Omi appends <code>&amp;uid=…</code>)
          </li>
          <li>
            Health check: <Link href="/api/setup-complete"><code>/api/setup-complete</code></Link>
          </li>
          <li>
            Version: <Link href="/api/version"><code>/api/version</code></Link>
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>What it does</h2>
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
