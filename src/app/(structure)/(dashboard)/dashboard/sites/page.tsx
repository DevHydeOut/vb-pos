import { getSites }          from "@/data/site";
import { SiteListClientPage } from "@/components/dashboard/sites/site-list-client";

export default async function SitesPage() {
  const { sites } = await getSites();
  return <SiteListClientPage sites={sites} />;
}