"use client"

import { useState } from "react"
import { leads as initialLeads, type Lead } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

function statusColor(status: Lead["status"]) {
  switch (status) {
    case "New":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
    case "Contacted":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
    case "Qualified":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
    case "Closed Won":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
    case "Closed Lost":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
  }
}

export function LeadsTable() {
  const [rows, setRows] = useState<Lead[]>(initialLeads)
  const { toast } = useToast()

  async function handleSyncCreatio() {
    // Stub: replace with real API call later
    console.log("[v0] Syncing from Creatio...")
    toast({
      title: "Sync from Creatio",
      description: "This will call a backend API in a future step.",
    })
    setTimeout(() => {
      setRows((prev) => [...prev])
    }, 300)
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-blue-700 dark:text-blue-300 text-balance">Leads</h1>
          <p className="text-sm text-muted-foreground">Table of prospects and their current status.</p>
        </div>
        <Button onClick={handleSyncCreatio} className="bg-blue-600 hover:bg-blue-700 text-white">
          Sync from Creatio
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.company}</TableCell>
                <TableCell>
                  <a className="text-blue-600 hover:underline" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                </TableCell>
                <TableCell>
                  <Badge className={statusColor(lead.status)} variant="secondary">
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(lead.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
