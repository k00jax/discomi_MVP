import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Props = { build: string };

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  return { props: { build: process.env.BUILD_ID ?? "unknown" } };
};

export default function Home({ build }: Props) {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if uid is in query params (when opened from Omi)
    const uidParam = router.query.uid as string | undefined;
    if (uidParam) {
      setUid(uidParam);
      
      // Check setup status
      fetch(`/api/setup-complete?uid=${uidParam}`)
        .then(res => res.json())
        .then(data => setIsSetup(data.is_setup_completed))
        .catch(() => setIsSetup(false));
    }
  }, [router.query.uid]);

  const handleSetup = () => {
    if (uid) {
      router.push(`/setup?uid=${uid}`);
    } else {
      router.push('/setup');
    }
  };

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
            flexShrink: 0,
          }}
        >
          <img
            src="/discomi.png"
            alt="DiscOmi bot avatar"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>DiscOmi</h1>
          <p style={{ margin: "6px 0 0 0", color: "#555" }}>
            Posts your Omi memories to your Discord channel. Per-user token. Nothing stored.
          </p>
        </div>
      </header>

      {/* Setup Status Badge (shown when opened from Omi) */}
      {uid && isSetup !== null && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 8,
            backgroundColor: isSetup ? "#d4edda" : "#fff3cd",
            border: `1px solid ${isSetup ? "#c3e6cb" : "#ffeeba"}`,
            color: isSetup ? "#155724" : "#856404",
          }}
        >
          {isSetup ? (
            <>
              <strong>✅ Connected to Discord</strong>
              <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
                Your Omi memories are being posted to your Discord channel.
              </p>
            </>
          ) : (
            <>
              <strong>⚠️ Setup Required</strong>
              <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
                You need to connect your Discord webhook to start receiving memories.
              </p>
            </>
          )}
        </div>
      )}

      {/* Setup Button */}
      {uid && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button
            onClick={handleSetup}
            style={{
              padding: "12px 32px",
              fontSize: 16,
              fontWeight: 600,
              color: "#fff",
              backgroundColor: isSetup ? "#6c757d" : "#4e7cff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            {isSetup ? "Change Discord Channel" : "Setup DiscOmi"}
          </button>
        </div>
      )}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Install & Setup</h2>
        <ol style={{ marginTop: 0 }}>
          <li>
            Install DiscOmi from the Omi App Store. Omi will redirect you here to finish setup.
          </li>
          <li>
            Paste your <strong>Discord channel webhook URL</strong> on the{" "}
            <Link href="/setup"><code>/setup</code></Link> page.
          </li>
          <li>
            (Optional) Add custom names/entities you want transcribed correctly.
          </li>
          <li>
            Click "Register" - your Omi webhook is automatically configured.
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
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Features</h2>
        <ul style={{ marginTop: 0 }}>
          <li>🤖 <strong>AI-Powered Summaries</strong> - GPT-4o-mini generates clean summaries with task extraction</li>
          <li>💬 <strong>Batched Transcripts</strong> - Say "store memory" to post complete conversations</li>
          <li>📝 <strong>Custom Entity Library</strong> - Ensure names and terms are transcribed correctly</li>
          <li>🔒 <strong>Per-User Isolation</strong> - Secure multi-tenant architecture</li>
          <li>⚡ <strong>Cost Efficient</strong> - ~$0.005 per conversation, 15-minute lookback window</li>
          <li>🎯 <strong>Smart Categorization</strong> - Automatically detects work, personal, meetings, etc.</li>
        </ul>
      </section>

      <p style={{ marginTop: 32, color: "#666" }}>
        Build: <code>{build}</code>
      </p>
    </main>
  );
}
