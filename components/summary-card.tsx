import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Summary } from "@/lib/mock-data"

export function SummaryCard({ summary }: { summary: Summary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">{summary.leadName}</CardTitle>
        <CardDescription>{new Date(summary.meetingDate).toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <section aria-labelledby={`transcript-${summary.id}`}>
          <h3 id={`transcript-${summary.id}`} className="text-sm font-medium">
            Transcript Snippet
          </h3>
          <p className="text-sm text-muted-foreground text-pretty">{summary.transcriptSnippet}</p>
        </section>
        <section aria-labelledby={`ai-summary-${summary.id}`}>
          <h3 id={`ai-summary-${summary.id}`} className="text-sm font-medium">
            AI Summary
          </h3>
          <p className="text-sm text-pretty">{summary.aiSummary}</p>
        </section>
        <section aria-labelledby={`actions-${summary.id}`}>
          <h3 id={`actions-${summary.id}`} className="text-sm font-medium">
            Action Items
          </h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {summary.actionItems.map((item, idx) => (
              <li key={idx} className="marker:text-amber-500">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  )
}
