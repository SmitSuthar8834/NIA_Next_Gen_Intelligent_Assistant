"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const salesData = [
  { month: "Jan", sales: 4200, leads: 240 },
  { month: "Feb", sales: 3800, leads: 220 },
  { month: "Mar", sales: 5200, leads: 290 },
  { month: "Apr", sales: 4600, leads: 260 },
  { month: "May", sales: 6100, leads: 340 },
  { month: "Jun", sales: 5800, leads: 320 },
  { month: "Jul", sales: 7200, leads: 380 },
  { month: "Aug", sales: 6800, leads: 360 },
  { month: "Sep", sales: 8100, leads: 420 },
  { month: "Oct", sales: 7600, leads: 400 },
  { month: "Nov", sales: 9200, leads: 480 },
  { month: "Dec", sales: 8900, leads: 460 }
]

const chartConfig = {
  sales: {
    label: "Sales ($)",
    color: "hsl(var(--chart-1))",
  },
  leads: {
    label: "Leads",
    color: "hsl(var(--chart-2))",
  },
}

export function SalesChart() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Sales Performance</CardTitle>
        <CardDescription>
          Monthly sales revenue and lead generation trends
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ChartContainer config={chartConfig} className="w-full h-[300px]">
          <AreaChart
            data={salesData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="leads"
              type="natural"
              fill="var(--color-chart-2)"
              fillOpacity={0.4}
              stroke="var(--color-chart-2)"
              stackId="a"
            />
            <Area
              dataKey="sales"
              type="natural"
              fill="var(--color-chart-1)"
              fillOpacity={0.4}
              stroke="var(--color-chart-1)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}