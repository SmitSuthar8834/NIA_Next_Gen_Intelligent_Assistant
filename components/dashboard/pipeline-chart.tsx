"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

const pipelineData = [
  { stage: "New", count: 45, value: 180000 },
  { stage: "Contacted", count: 32, value: 256000 },
  { stage: "Qualified", count: 28, value: 420000 },
  { stage: "Proposal", count: 18, value: 540000 },
  { stage: "Negotiation", count: 12, value: 480000 },
  { stage: "Closed Won", count: 8, value: 320000 }
]

const chartConfig = {
  count: {
    label: "Leads",
    color: "hsl(var(--chart-1))",
  },
  value: {
    label: "Value ($)",
    color: "hsl(var(--chart-2))",
  },
}

export function PipelineChart() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Sales Pipeline</CardTitle>
        <CardDescription>
          Lead distribution across sales stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[300px]">
          <BarChart
            data={pipelineData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <XAxis
              dataKey="stage"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 8)}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="count" fill="var(--color-chart-1)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}