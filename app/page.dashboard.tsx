"use client"

import { RealtimeMetricsCards } from "@/components/dashboard/realtime-metrics-cards"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { PipelineChart } from "@/components/dashboard/pipeline-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { TopLeads } from "@/components/dashboard/top-leads"
import { EnhancedLeadsTable } from "@/components/leads/enhanced-leads-table"
import { EnhancedMeetingsList } from "@/components/meetings/enhanced-meetings-list"
import { GlobalAppLayout } from "@/components/layout/global-app-layout"
import { Logo } from "@/components/ui/logo"
import { useRealtimeSummaries } from "@/hooks/use-realtime-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, FileText, TrendingUp } from "lucide-react"

export default function DashboardPage() {
  const { summaries, loading: summariesLoading } = useRealtimeSummaries()

  const headerContent = (
    <div className="flex items-center gap-3">
      <Logo size="md" showText={false} />
      <div>
        <h1 className="text-xl font-semibold">NIA Sales Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, Smit. Here's what's happening with your sales pipeline today.
        </p>
      </div>
    </div>
  )

  return (
    <GlobalAppLayout headerContent={headerContent}>
      {/* Main Content */}
      <div className="space-y-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <TrendingUp size={16} />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center space-x-2">
              <Users size={16} />
              <span>Leads</span>
            </TabsTrigger>
            <TabsTrigger value="meetings" className="flex items-center space-x-2">
              <Calendar size={16} />
              <span>Meetings</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <FileText size={16} />
              <span>Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Real-time Metrics Cards */}
            <RealtimeMetricsCards />
            
            {/* Charts Grid */}
            <div className="grid gap-6 md:grid-cols-7">
              <SalesChart />
              <RecentActivity />
            </div>
            
            <div className="grid gap-6 md:grid-cols-7">
              <PipelineChart />
              <TopLeads />
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <EnhancedLeadsTable />
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings">
            <EnhancedMeetingsList />
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Meeting Summaries & Insights</h2>
                <p className="text-muted-foreground">
                  AI-generated summaries and action items from your meetings
                </p>
              </div>
              <Button>
                <FileText size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {summaries.map((summary) => (
                <Card key={summary.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{summary.title}</CardTitle>
                    <CardDescription>
                      {new Date(summary.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Summary</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {summary.content}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {summaries.length === 0 && !summariesLoading && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No insights yet</h3>
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
          </TabsContent>
        </Tabs>
      </div>
    </GlobalAppLayout>
  )
}