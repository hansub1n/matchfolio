import type { InterestedCompany } from "@/entities/interested-company";
import { Badge } from "@/shared/ui/badge";

export function Watchlist({ companies }: { companies: InterestedCompany[] }) {
  return (
    <div className="px-4">
      <div className="flex flex-wrap gap-2">
        {companies.map((company) => (
          <Badge key={company.id} variant="outline" className="h-7 gap-1.5 px-3">
            {company.company}
            {company.position && (
              <span className="text-muted-foreground">{company.position}</span>
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}
