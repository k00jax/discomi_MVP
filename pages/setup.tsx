import { useState } from "react";

export default function Setup() {
  const [uid, setUid] = useState("");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string>("");

  return (
    <main style={{fontFamily:"ui-sans-serif,system-ui",padding:"2rem",maxWidth:720,margin:"0 auto"}}>
      <h1>DiscOmi Setup</h1>
      <p>Paste your Discord channel webhook URL. Your Omi app will include your uid automatically.</p>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const r = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, webhookUrl: url })
        });
        const j = await r.json();
        setResult(r.ok ? `Use this in Omi: ${j.omiWebhook}` : `Error: ${await r.text()}`);
      }}>
        <div style={{display:"grid",gap:"12px",marginTop:"12px"}}>
          <input placeholder="Your Omi uid (for manual test)" value={uid} onChange={e=>setUid(e.target.value)} style={{padding:"10px"}} />
          <input placeholder="Discord Webhook URL" value={url} onChange={e=>setUrl(e.target.value)} style={{padding:"10px"}} />
          <button type="submit" style={{padding:"10px 16px"}}>Register</button>
        </div>
      </form>
      {result ? <pre style={{marginTop:"16px",whiteSpace:"pre-wrap"}}>{result}</pre> : null}
    </main>
  );
}
