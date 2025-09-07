"use client"

import { useState } from "react"
import { useLeads } from "@/hooks/use-leads"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Filter, Download, Plus, MoreHorizontal, RefreshCw, Settings } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import RequireAuth from "@/components/RequireAuth"

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "new":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    case "contacted":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    case "qualified":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    case "closed won":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
    case "closed lost":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

export default function LeadsPage() {
  const { leads, loading, error, refetch } = useLeads()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || lead.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <RequireAuth>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        {/* Debug info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="text-sm space-y-1">
              <div>Leads count: {leads.length}</div>
              <div>Loading: {loading.toString()}</div>
              <div>Error: {error || 'None'}</div>
              <div>API URL: {process.env.NEXT_PUBLIC_API_URL}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Leads Management
                  <Badge variant="outline">{leads.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Track and manage your sales prospects in real-time
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={refetch}>
                  <RefreshCw size={16} className="mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/integrations">
                    <Settings size={16} className="mr-2" />
                    Integrations
                  </Link>
                </Button>
                <Button variant="outline" size="sm">
                  <Download size={16} className="mr-2" />
                  Export
                </Button>
                <Button size="sm" asChild>
                  <Link href="/leads/new">
                    <Plus size={16} className="mr-2" />
                    Add Lead
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                ❌ {error}
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter size={16} className="mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="closed won">Closed Won</SelectItem>
                  <SelectItem value="closed lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={`https://i.pravatar.cc/150?u=${lead.email}`} />
                            <AvatarFallback className="text-xs">
                              {getInitials(lead.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{lead.lead_name || lead.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {lead.email}
                            </div>
                            {lead.contact_name && (
                              <div className="text-xs text-muted-foreground">
                                Contact: {lead.contact_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{lead.company}</div>
                        {lead.job_title && (
                          <div className="text-sm text-muted-foreground">{lead.job_title}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.phone && (
                            <div className="text-sm">📱 {lead.phone}</div>
                          )}
                          {lead.business_phone && lead.business_phone !== lead.phone && (
                            <div className="text-sm">☎️ {lead.business_phone}</div>
                          )}
                          {lead.website && (
                            <div className="text-sm">🌐 {lead.website}</div>
                          )}
                          {lead.address && (
                            <div className="text-xs text-muted-foreground">📍 {lead.address}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                        {lead.score && lead.score > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Score: {lead.score}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {lead.source === 'creatio' ? '🏢' : '✏️'}
                          </span>
                          <div>
                            <span className="text-sm text-muted-foreground">
                              {lead.source === 'creatio' ? 'Creatio' : 'Manual'}
                            </span>
                            {lead.budget && lead.budget > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Budget: ${lead.budget}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div>{new Date(lead.created_at).toLocaleDateString()}</div>
                        {lead.creatio_created_on && (
                          <div className="text-xs">
                            Creatio: {new Date(lead.creatio_created_on).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/leads/${lead.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Send Email</DropdownMenuItem>
                            <DropdownMenuItem>Schedule Meeting</DropdownMenuItem>
                            <DropdownMenuItem>Update Status</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredLeads.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No leads found matching your criteria.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  )
}