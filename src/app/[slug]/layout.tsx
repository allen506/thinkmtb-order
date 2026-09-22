import { headers } from 'next/headers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tenant Portal - ThinkMTB",
  description: "Team order portal",
};

export default function TenantLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { slug: string };
}>) {
  // The tenant slug is available from params
  // Middleware has already extracted it and set x-tenant-slug header
  const slug = params.slug;

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
