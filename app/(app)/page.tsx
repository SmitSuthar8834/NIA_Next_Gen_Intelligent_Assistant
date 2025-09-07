'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, Users, Calendar, FileText, BarChart3, TrendingUp, TrendingDown, DollarSign, Target, Phone, Mail, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import RequireAuth from "@/components/RequireAuth"
import { useUser } from '@/hooks/useUser'
import { ClientOnly } from '@/components/ClientOnly'
import { supabase } from '@/lib/supabaseClient'

interface LeadStats {
  total: number
  new: number
  qualified: number
  contacted: number
  converted: number
  totalValue: number
  avgValue: number
  conversionRate: number
}

interface RecentLead {
  id: string
  name: string
  company?: string
  status: string
  value?: number
  created_at: string
  source?: string
}

export default function HomePage() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const quickActions = [
    {
      title: "View Leads",
      description: "Manage your sales prospects",
      icon: Users,
      href: "/leads",
      color: "text-blue-600"
    },
    {
      title: "Upcoming Meetings",
      description: "Check your scheduled calls",
      icon: Calendar,
      href: "/meetings",
      color: "text-green-600"
    },
    {
      title: "AI Summaries",
      description: "Review meeting insights",
      icon: FileText,
      href: "/summaries",
      color: "text-purple-600"
    },
    {
      title: "Analytics",
      description: "View performance metrics",
      icon: BarChart3,
      href: "/analytics",
      color: "text-orange-600"
    }
  ]

  useEffect(() => {
    loadDashboardData()
    
    // Set up real-time subscription for leads
    const subscription = supabase
      .channel('dashboard-leads')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          loadDashboardData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load lead statistics
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)

      if (leadsError) {
        console.error('Error loading leads:', leadsError)
        return
      }

      if (leads) {
        // Calculate statistics
        const total = leads.length
        const new_leads = leads.filter(lead => lead.status === 'new').length
        const qualified = leads.filter(lead => lead.status === 'qualified').length
        const contacted = leads.filter(lead => lead.status === 'contacted').length
        const converted = leads.filter(lead => lead.status === 'converted').length
        
        const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
        const avgValue = total > 0 ? totalValue / total : 0
        const conversionRate = total > 0 ? (converted / total) * 100 : 0

        setStats({
          total,
          new: new_leads,
          qualified,
          contacted,
          converted,
          totalValue,
          avgValue,
          conversionRate
        })

        // Get recent leads (last 5)
        const recent = leads
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
        
        setRecentLeads(recent)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadDashboardData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'qualified': return 'bg-green-100 text-green-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'converted': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Users className="h-4 w-4" />
      case 'qualified': return <Target className="h-4 w-4" />
      case 'contacted': return <Phone className="h-4 w-4" />
      case 'converted': return <DollarSign className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <RequireAuth>
        <ClientOnly fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </ClientOnly>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome to NIA</h2>
            <p className="text-muted-foreground">
              Your AI-powered sales assistant. Here's your real-time dashboard overview.
            </p>
          </div>
          <Button 
            onClick={refreshData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        {/* Lead Statistics */}
        {stats && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.new} new this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
                <Progress value={stats.conversionRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatCurrency(stats.avgValue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.converted}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.qualified} qualified leads
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <action.icon size={24} className={action.color} />
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </div>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={action.href}>
                    Open
                    <ArrowRight size={16} className="ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Leads */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>
                Your latest prospects and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentLeads.length > 0 ? (
                <div className="space-y-4">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(lead.status)}
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          {lead.company && (
                            <p className="text-sm text-muted-foreground">{lead.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {lead.value && (
                          <span className="text-sm font-medium">{formatCurrency(lead.value)}</span>
                        )}
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/leads">
                      View All Leads
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No leads yet</p>
                  <Button asChild className="mt-2">
                    <Link href="/leads">Add Your First Lead</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Status */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Overview</CardTitle>
              <CardDescription>
                Distribution of leads across different stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">New</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{stats.new}</span>
                      <span className="text-xs text-muted-foreground">
                        ({stats.total > 0 ? ((stats.new / stats.total) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Qualified</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{stats.qualified}</span>
                      <span className="text-xs text-muted-foreground">
                        ({stats.total > 0 ? ((stats.qualified / stats.total) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Contacted</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{stats.contacted}</span>
                      <span className="text-xs text-muted-foreground">
                        ({stats.total > 0 ? ((stats.contacted / stats.total) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">Converted</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{stats.converted}</span>
                      <span className="text-xs text-muted-foreground">
                        ({stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Quick tips to make the most of your NIA dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">📊 Track Your Pipeline</h4>
                <p className="text-sm text-muted-foreground">
                  Monitor your leads and conversion rates in real-time with our analytics dashboard.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🤖 AI-Powered Insights</h4>
                <p className="text-sm text-muted-foreground">
                  Get intelligent summaries and action items from your meetings automatically.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">📅 Schedule Efficiently</h4>
                <p className="text-sm text-muted-foreground">
                  Manage your meetings and follow-ups with integrated calendar tools.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🔄 Real-time Updates</h4>
                <p className="text-sm text-muted-foreground">
                  Stay synchronized with live data updates across all your devices.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  )
}