import type { GetServerSideProps } from "next";
import Link from "next/link";

type Props = { build: string };

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  return { props: { build: process.env.BUILD_ID || "unknown" } };
};

export default function Home({ build }: Props) {
  return (
    <main style={{fontFamily:"ui-sans-serif,system-ui",padding:"2rem",maxWidth:780,margin:"0 auto"}}>
      <h1>DiscOmi</h1>
      <p>Posts your Omi memories to your Discord channel. Per-user token. Nothing stored. Supports titles, overviews, transcripts, audio.</p>

      <h3>Get Started</h3>
      <ul>
        <li><Link href="/setup">ðŸš€ Setup Your Webhook</Link> - Register and get your personal Omi URL</li>
      </ul>

      <h3>API Endpoints</h3>
      <ul>
        <li><Link href="/api/setup-complete">Setup check</Link></li>
        <li><Link href="/api/webhook">Webhook endpoint</Link></li>
        <li><Link href="/api/version">Version info</Link></li>
      </ul>

      <h3>Features</h3>
      <ul>
        <li>âœ… Per-user Discord webhooks</li>
        <li>âœ… Secure token authentication</li>
        <li>âœ… Extracts titles, overviews, and transcripts from Omi memories</li>
        <li>âœ… Optional audio links</li>
        <li>âœ… Configurable text length limits</li>
        <li>âœ… No data storage - direct relay only</li>
      </ul>

      <small style={{opacity:.7}}>Build: {build}</small>
    </main>
  );
}