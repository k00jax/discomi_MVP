import type { GetServerSideProps } from "next";
import Link from "next/link";

type Props = { build: string };

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  // read a build stamp if you set one; fall back to "unknown"
  return { props: { build: process.env.BUILD_ID || "unknown" } };
};

export default function Home({ build }: Props) {
  return (
    <main style={{fontFamily:"ui-sans-serif,system-ui",padding:"2rem",maxWidth:780,margin:"0 auto"}}>
      <h1>DiscOmi</h1>
      <p>Omi â†’ Discord relay is deployed and listening.</p>

      <ul>
        <li><Link href="/api/setup-complete">Setup check</Link></li>
        <li><Link href="/api/webhook">Webhook GET</Link></li>
        <li><Link href="/api/version">Version</Link></li>
      </ul>

      <h3>Environment sanity</h3>
      <p>
        These are required and should be set in Vercel:
        <code> DISCORD_WEBHOOK_URL </code> Â· <code> WEBHOOK_TOKEN </code>
      </p>

      <small style={{opacity:.7}}>Build: {build}</small>
    </main>
  );
}