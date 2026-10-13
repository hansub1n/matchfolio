import type { InterestedCompany } from "@/entities/interested-company";
import { formatDeadline } from "@/shared/lib/format-deadline";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function InterestedCompanyCard({ company }: { company: InterestedCompany }) {
  const deadlineLabel = formatDeadline(company.deadline);

  return (
    <Card size="sm" className="w-64">
      <CardHeader>
        <CardTitle>{company.company}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {company.position && (
          <p className="text-sm text-muted-foreground">{company.position}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {company.techStack.slice(0, 2).map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
          {deadlineLabel && (
            <span className="text-xs text-muted-foreground">{deadlineLabel}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
