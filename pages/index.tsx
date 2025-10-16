import type { GetServerSideProps } from "next";

type Props = { build: string };

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  // read a build stamp if you set one; fall back to "unknown"
  return { props: { build: process.env.BUILD_ID || "unknown" } };
};

export default function Home({ build }: Props) {
  return (
    <main style={{fontFamily:"ui-sans-serif,system-ui",padding:"2rem",maxWidth:780,margin:"0 auto"}}>
      <h1>DiscOmi</h1>
      <p>Omi → Discord relay is deployed and listening.</p>

      <ul>
        <li><a href="/api/setup-complete" rel="noreferrer">Setup check</a> (should return JSON)</li>
        <li><a href="/api/webhook" rel="noreferrer">Webhook GET</a> (should return “ok” or 405 if POST-only)</li>
      </ul>

      <h3>Environment sanity</h3>
      <p>
        These are required and should be set in Vercel:
        <code> DISCORD_WEBHOOK_URL </code> · <code> WEBHOOK_TOKEN </code>
      </p>

      <small style={{opacity:.7}}>Build: {build}</small>
    </main>
  );
}
