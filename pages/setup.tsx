import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import s from "@/styles/Setup.module.css";

export default function Setup() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState<"idle"|"ok"|"err">("idle");
  const [nameCorrections, setNameCorrections] = useState<string>("");
  const [storeKeyword, setStoreKeyword] = useState<string>("");
  const [startKeyword, setStartKeyword] = useState<string>("");
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load existing configuration when UID is detected
  useEffect(() => {
    const prefUid = router.query.uid as string | undefined;
    
    if (prefUid) {
      setUid(prefUid);
      
      // Fetch existing config to pre-fill form
      fetch(`/api/user-config?uid=${encodeURIComponent(prefUid)}`)
        .then(res => res.json())
        .then(data => {
          if (data.configured) {
            setIsConfigured(true);
            setWebhookUrl(data.webhook_url || "");
            
            // Pre-fill custom entities (important terms)
            if (data.custom_entities?.important_terms) {
              setNameCorrections(data.custom_entities.important_terms.join("\n"));
            }
            
            // Pre-fill custom keywords
            if (data.options?.storeKeyword) {
              setStoreKeyword(data.options.storeKeyword);
            }
            if (data.options?.startKeyword) {
              setStartKeyword(data.options.startKeyword);
            }
          }
        })
        .catch(err => {
          console.error("Failed to load user config:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [router.query.uid]);

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
    
    const payload = { 
      webhookUrl,
      custom_entities: Object.keys(customEntities).length > 0 ? customEntities : undefined,
      options: {
        storeKeyword: storeKeyword.trim() || undefined,
        startKeyword: startKeyword.trim() || undefined,
      },
    };
    
    console.log("[setup] Submitting with UID:", uid);
    console.log("[setup] Webhook URL:", webhookUrl);
    console.log("[setup] Payload:", payload);
    
    const url = `/api/register${uid ? `?uid=${encodeURIComponent(uid)}` : ""}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    console.log("[setup] Response status:", r.status);
    const responseText = await r.text();
    console.log("[setup] Response:", responseText);
    
    if (!r.ok) {
      alert(`Registration failed (${r.status}): ${responseText}\n\nCheck the browser console for details.`);
    }
    
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
          Paste your Discord channel webhook. {uid ? "Your UID was detected from Omi." : "Enter your Omi UID once."}
        </p>

        {/* Show configuration status when user is already set up */}
        {isConfigured && !isLoading && (
          <div 
            style={{
              marginBottom: "1.5rem",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "#d4edda",
              border: "1px solid #c3e6cb",
              color: "#155724",
              fontSize: "0.9em"
            }}
          >
            <strong>✅ Already Configured</strong>
            <p style={{ margin: "6px 0 0 0" }}>
              You can update your settings below.
            </p>
          </div>
        )}

        {isLoading && uid ? (
          <p style={{ textAlign: "center", color: "#999", padding: "2rem" }}>
            Loading your configuration...
          </p>
        ) : (
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

            {uid && router.query.uid ? (
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

            <button className={s.button} type="submit">
              {isConfigured ? "Update Configuration" : "Register"}
            </button>
          </form>
        )}

        {status === "ok"  && <p className={s.footer} style={{color:"#bcd7ff"}}>Saved. New conversations will post to your Discord.</p>}
        {status === "err" && <p className={s.footer} style={{color:"#ffb3b3"}}>Save failed. Check UID and webhook URL.</p>}
      </section>
    </main>
  );
}
