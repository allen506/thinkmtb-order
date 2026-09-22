import { headers } from 'next/headers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tenant Portal - ThinkMTB",
  description: "Team order portal",
};

export default async function TenantLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  // Await params since it's now a Promise in Next.js 15+
  const { slug } = await params;

  return (
    <html lang="en" data-tenant-slug={slug}>
      <head>
        <title>{`${slug} - Team Portal`}</title>
      </head>
      <body
        className="antialiased min-h-screen"
        style={{ background: "#f5f5f7" }}
      >
        {children}
      </body>
    </html>
  );
}
