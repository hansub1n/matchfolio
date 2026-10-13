import type { InterestedCompany } from "@/entities/interested-company";

import { InterestedCompanyCard } from "./interested-company-card";

export function Watchlist({ companies }: { companies: InterestedCompany[] }) {
  return (
    <div className="flex flex-wrap gap-2 px-4">
      {companies.map((company) => (
        <InterestedCompanyCard key={company.id} company={company} />
      ))}
    </div>
  );
}
