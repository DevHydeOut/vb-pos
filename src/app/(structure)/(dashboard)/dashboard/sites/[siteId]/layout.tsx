import { getSite } from "@/data/site";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params:   Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { site } = await getSite(siteId);

  return (
    <div className="min-h-screen">
      <main>
        {children}
      </main>
    </div>
  );
}