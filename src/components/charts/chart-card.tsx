"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/common/card";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface ChartCardProps {
  title: string;
  description?: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: ChartSeries[];
  height?: number;
  currency?: boolean;
  emptyMessage?: string;
}

const axisProps = {
  tick: { fill: "#929A92", fontSize: 11, fontWeight: 600 },
  axisLine: false,
  tickLine: false,
};

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-background/60 text-center">
      <p className="text-xs font-semibold text-muted">{message}</p>
      <p className="text-[11px] text-muted/80">Add records to see this chart come alive.</p>
    </div>
  );
}

function tooltipFormatter(currency: boolean) {
  return (value: number | string | Array<number | string>, name: string) => {
    const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
    return [currency ? formatCurrency(numeric) : numeric.toLocaleString(), name];
  };
}

export function ExpenseLineChart({
  title,
  description,
  data,
  xKey,
  series,
  height = 260,
  currency = true,
  emptyMessage = "No chart data yet",
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {data.length === 0 ? (
        <ChartEmpty message={emptyMessage} />
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAEDE8" vertical={false} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis
                {...axisProps}
                tickFormatter={(value: number) =>
                  currency ? formatCompactCurrency(value) : value.toLocaleString()
                }
              />
              <Tooltip
                formatter={tooltipFormatter(currency)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #EAEDE8",
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(48,54,48,0.08)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              {series.map((entry) => (
                <Line
                  key={entry.key}
                  type="monotone"
                  dataKey={entry.key}
                  name={entry.label}
                  stroke={entry.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: entry.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function ExpenseAreaChart({
  title,
  description,
  data,
  xKey,
  series,
  height = 260,
  currency = true,
  emptyMessage = "No chart data yet",
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {data.length === 0 ? (
        <ChartEmpty message={emptyMessage} />
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8CBF9F" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8CBF9F" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAEDE8" vertical={false} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis
                {...axisProps}
                tickFormatter={(value: number) =>
                  currency ? formatCompactCurrency(value) : value.toLocaleString()
                }
              />
              <Tooltip
                formatter={tooltipFormatter(currency)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #EAEDE8",
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(48,54,48,0.08)",
                }}
              />
              {series.map((entry) => (
                <Area
                  key={entry.key}
                  type="monotone"
                  dataKey={entry.key}
                  name={entry.label}
                  stroke={entry.color}
                  strokeWidth={2.5}
                  fill="url(#expenseGradient)"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function ExpenseBarChart({
  title,
  description,
  data,
  xKey,
  series,
  height = 260,
  currency = true,
  emptyMessage = "No chart data yet",
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {data.length === 0 ? (
        <ChartEmpty message={emptyMessage} />
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAEDE8" vertical={false} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis
                {...axisProps}
                tickFormatter={(value: number) =>
                  currency ? formatCompactCurrency(value) : value.toLocaleString()
                }
              />
              <Tooltip
                formatter={tooltipFormatter(currency)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #EAEDE8",
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(48,54,48,0.08)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              {series.map((entry) => (
                <Bar
                  key={entry.key}
                  dataKey={entry.key}
                  name={entry.label}
                  fill={entry.color}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={38}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

interface PieDatum {
  name: string;
  value: number;
  color: string;
}

export function ExpensePieChart({
  title,
  description,
  data,
  height = 260,
  emptyMessage = "No chart data yet",
}: {
  title: string;
  description?: string;
  data: PieDatum[];
  height?: number;
  emptyMessage?: string;
}) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {total <= 0 ? (
        <ChartEmpty message={emptyMessage} />
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter((entry) => entry.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="82%"
                paddingAngle={3}
                stroke="none"
              >
                {data
                  .filter((entry) => entry.value > 0)
                  .map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
              </Pie>
              <Tooltip
                formatter={(value: number | string | Array<number | string>) => {
                  const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
                  return formatCurrency(numeric);
                }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #EAEDE8",
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(48,54,48,0.08)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
                formatter={(value: string) => value}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
