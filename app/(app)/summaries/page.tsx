"use client"

import { useRealtimeSummaries } from "@/hooks/use-realtime-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Plus, RefreshCw, Calendar, Sparkles } from "lucide-react"
import RequireAuth from "@/components/RequireAuth"

function SummaryCard({ summary }: { summary: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{summary.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar size={14} />
              {new Date(summary.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            AI Generated
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Summary</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {summary.content}
          </p>
        </div>
        
        {summary.key_points && summary.key_points.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Key Points</h4>
            <ul className="space-y-1">
              {summary.key_points.map((point: string, index: number) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {summary.action_items && summary.action_items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Action Items</h4>
            <ul className="space-y-1">
              {summary.action_items.map((item: string, index: number) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SummariesPage() {
  const { summaries, loading, error, refetch } = useRealtimeSummaries()

  if (loading) {
    return (
      <RequireAuth>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button>
              <Sparkles size={16} className="mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            ❌ {error}
          </div>
        )}
        
        {summaries.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {summaries.map((summary) => (
              <SummaryCard key={summary.id} summary={summary} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No summaries yet</h3>
                <p className="text-muted-foreground mb-4">
                  Meeting summaries and insights will appear here after your calls
                </p>
                <Button>
                  <Calendar size={16} className="mr-2" />
                  Schedule a Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RequireAuth>
  )
}