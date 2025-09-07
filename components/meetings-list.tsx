"use client"

import { meetings as initialMeetings } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MeetingsList() {
  const { toast } = useToast()

  async function handleCreateMeeting() {
    console.log("[v0] Creating meeting...")
    toast({
      title: "Create Meeting",
      description: "This will call a backend API in a future step.",
    })
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-blue-700 dark:text-blue-300 text-balance">Meetings</h1>
          <p className="text-sm text-muted-foreground">Upcoming and scheduled meetings.</p>
        </div>
        <Button onClick={handleCreateMeeting} className="bg-blue-600 hover:bg-blue-700 text-white">
          Create Meeting
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {initialMeetings.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="text-pretty">{m.subject}</CardTitle>
              <CardDescription>{new Date(m.dateTime).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                className="text-blue-600 hover:underline break-all"
                href={m.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {m.link}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
