export type Lead = {
  id: string
  name: string
  company: string
  email: string
  status: "New" | "Contacted" | "Qualified" | "Closed Won" | "Closed Lost"
  createdAt: string
}

export const leads: Lead[] = [
  {
    id: "l_1",
    name: "Ava Johnson",
    company: "NimbusSoft",
    email: "ava.j@nimbussoft.com",
    status: "Qualified",
    createdAt: "2025-08-15T10:09:00Z",
  },
  {
    id: "l_2",
    name: "Marco Chen",
    company: "GreenGrid",
    email: "mchen@greengrid.io",
    status: "Contacted",
    createdAt: "2025-08-17T08:30:00Z",
  },
  {
    id: "l_3",
    name: "Priya Patel",
    company: "NorthStar AI",
    email: "priya@northstar.ai",
    status: "New",
    createdAt: "2025-08-20T12:00:00Z",
  },
  {
    id: "l_4",
    name: "Diego Ramirez",
    company: "Flux Analytics",
    email: "diego@fluxanalytics.co",
    status: "Closed Won",
    createdAt: "2025-08-25T14:22:00Z",
  },
]

export type Meeting = {
  id: string
  subject: string
  dateTime: string // ISO
  link: string
}

export const meetings: Meeting[] = [
  {
    id: "m_1",
    subject: "Discovery Call - NimbusSoft",
    dateTime: "2025-09-05T15:00:00Z",
    link: "https://meet.example.com/nimbussoft-discovery",
  },
  {
    id: "m_2",
    subject: "Demo - GreenGrid Ops Team",
    dateTime: "2025-09-07T17:30:00Z",
    link: "https://meet.example.com/greengrid-demo",
  },
]

export type Summary = {
  id: string
  leadName: string
  transcriptSnippet: string
  aiSummary: string
  actionItems: string[]
  meetingDate: string
}

export const summaries: Summary[] = [
  {
    id: "s_1",
    leadName: "Ava Johnson",
    transcriptSnippet: "We discussed current outreach workflows and the need for prioritizing high-intent leads...",
    aiSummary:
      "NIA identified key friction points in lead triage. Ava is interested in a 14-day pilot focused on inbound routing.",
    actionItems: [
      "Send pilot proposal with success metrics",
      "Share 3 case studies from SaaS vertical",
      "Schedule technical deep-dive with ops team",
    ],
    meetingDate: "2025-08-28T13:00:00Z",
  },
  {
    id: "s_2",
    leadName: "Marco Chen",
    transcriptSnippet: "Their SDR team struggles with manual note-taking during calls; automation is a priority...",
    aiSummary: "Strong appetite for auto-summarization and CRM sync. Budget approval likely if ROI is clear by Q4.",
    actionItems: ["Prepare ROI calculator for 20 seats", "Create sample summary on one recorded call"],
    meetingDate: "2025-08-26T16:45:00Z",
  },
]
