import React from 'react';
import {
  BarChart3,
  Clock,
  Flame,
  Target,
  Compass,
  TrendingUp,
  Award,
  CalendarCheck,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { HourlyStat, Lead, ShiftHistoryPoint, DailyTargets } from '../types';
import { INITIAL_SEVEN_SHIFTS_HISTORY } from '../mockData';

interface Props {
  hourlyStats: HourlyStat[];
  leads: Lead[];
  shiftHistory?: ShiftHistoryPoint[];
  targets?: DailyTargets;
}

export const AnalyticsTab: React.FC<Props> = ({
  hourlyStats,
  leads,
  shiftHistory = INITIAL_SEVEN_SHIFTS_HISTORY,
  targets
}) => {
  // Status breakdown
  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute 7-shift metrics
  const avgConnectRate = (
    shiftHistory.reduce((acc, s) => acc + s.connectRatePct, 0) / shiftHistory.length
  ).toFixed(1);

  const bestShift = [...shiftHistory].sort((a, b) => b.connectRatePct - a.connectRatePct)[0];
  const quotaBenchmark = targets ? Math.round((targets.connectTarget / targets.dialTarget) * 100) : 30;
  const shiftsHittingQuota = shiftHistory.filter((s) => s.connectRatePct >= quotaBenchmark).length;
  const total7DayDials = shiftHistory.reduce((acc, s) => acc + s.dials, 0);
  const total7DayConnects = shiftHistory.reduce((acc, s) => acc + s.connects, 0);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: ShiftHistoryPoint = payload[0].payload;
      return (
        <div className="bg-[#181825] border border-[#363a4f] p-3 rounded-lg shadow-xl text-xs space-y-1.5 font-sans">
          <div className="flex items-center justify-between space-x-3 border-b border-[#313244] pb-1.5">
            <span className="font-bold text-white">{data.shiftName}</span>
            <span className="text-slate-400 font-mono">{data.date}</span>
          </div>

          <div className="flex items-center justify-between space-x-3">
            <span className="text-sky-300 font-medium">Daily Connect Rate:</span>
            <span className="font-mono font-bold text-sky-400 text-sm">
              {data.connectRatePct.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between space-x-3 text-slate-400 text-[11px]">
            <span>Activity Volume:</span>
            <span className="font-mono text-slate-200">
              {data.connects} connects / {data.dials} dials
            </span>
          </div>

          <div className="flex items-center justify-between space-x-3 text-emerald-400 text-[11px]">
            <span>Live Transfers:</span>
            <span className="font-mono font-bold">+{data.transfers} completed</span>
          </div>

          <div className="flex items-center justify-between space-x-3 text-amber-400 text-[10px] pt-1 border-t border-[#313244]">
            <span>Quota Benchmark:</span>
            <span className="font-mono font-bold">{quotaBenchmark}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Shift & Timing Tracker • Dialing Block Optimization
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Empirical pickup rate analytics by hour of the day and historical 7-shift connect trends to optimize power hours and evaluate cadence consistency.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-[#181825] border border-[#313244] px-4 py-2.5 rounded-xl">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Peak Window</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">04:00 - 05:00 PM</div>
            </div>
            <div className="h-7 w-px bg-[#313244]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Today Connect Rate</div>
              <div className="text-sm font-bold text-sky-400 font-mono">
                {shiftHistory[shiftHistory.length - 1]?.connectRatePct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECHARTS: 7-Shift Historical Daily Connect Rates Line Chart */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Daily Connect Rates Over Last 7 Shifts (Recharts)
              </h3>
              <p className="text-[11px] text-slate-400">
                Line chart tracking connect efficiency (%) against the target quota benchmark ({quotaBenchmark}%).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <span className="w-3 h-0.5 bg-sky-400 rounded-full" />
              <span>Actual Connect Rate</span>
            </div>
            <div className="flex items-center space-x-1.5 text-amber-400">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
              <span>Target Benchmark ({quotaBenchmark}%)</span>
            </div>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-72 bg-[#181825] border border-[#313244] rounded-xl p-3 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={shiftHistory}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <CartesianGrid stroke="#313244" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#6c7086"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#313244' }}
              />
              <YAxis
                domain={[0, 50]}
                stroke="#6c7086"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#313244' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={quotaBenchmark}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Benchmark: ${quotaBenchmark}%`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight'
                }}
              />
              <Line
                type="monotone"
                dataKey="connectRatePct"
                name="Connect Rate (%)"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 4, fill: '#38bdf8', stroke: '#181825', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 7-Shift Summary KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-[#181825] border border-[#313244] p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
              <Percent className="w-3 h-3 text-sky-400" />
              <span>7-Shift Avg Rate</span>
            </div>
            <div className="text-xl font-mono font-bold text-sky-400 mt-1">
              {avgConnectRate}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {total7DayConnects} connects / {total7DayDials} dials
            </div>
          </div>

          <div className="bg-[#181825] border border-[#313244] p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
              <Award className="w-3 h-3 text-amber-400" />
              <span>Best Shift Rate</span>
            </div>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {bestShift?.connectRatePct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {bestShift?.shiftName} ({bestShift?.date})
            </div>
          </div>

          <div className="bg-[#181825] border border-[#313244] p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
              <CalendarCheck className="w-3 h-3 text-emerald-400" />
              <span>Quota Hit Ratio</span>
            </div>
            <div className="text-xl font-mono font-bold text-white mt-1">
              {shiftsHittingQuota} / 7 <span className="text-xs text-emerald-400">Shifts</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Exceeded {quotaBenchmark}% target rate
            </div>
          </div>

          <div className="bg-[#181825] border border-[#313244] p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
              <Flame className="w-3 h-3 text-purple-400" />
              <span>7-Shift Transfers</span>
            </div>
            <div className="text-xl font-mono font-bold text-purple-400 mt-1">
              {shiftHistory.reduce((acc, s) => acc + s.transfers, 0)} <span className="text-xs">Handoffs</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              High intent AE transfers
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Peak Hourly Connect Rates vs Pipeline Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Hourly Connect Rates Histogram */}
        <div className="lg:col-span-2 bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Peak Lead Interaction Times (Hourly Connect Rate)
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium">
              ● Green indicates &gt; 40% Connect Rate
            </span>
          </div>

          <div className="space-y-2.5 pt-2">
            {hourlyStats.map((stat) => {
              const isPeak = stat.connectRatePct >= 40;
              return (
                <div
                  key={stat.hour}
                  className="bg-[#181825] border border-[#313244] rounded-lg p-2.5 flex items-center space-x-3 text-xs"
                >
                  <div className="w-20 font-mono font-bold text-slate-200 flex items-center space-x-1">
                    {isPeak && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{stat.label}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400">
                        {stat.connects} connects / {stat.totalCalls} dials
                      </span>
                      <span className={`font-mono font-bold ${isPeak ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {stat.connectRatePct}%
                      </span>
                    </div>

                    <div className="w-full bg-[#24273a] h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPeak ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, (stat.connectRatePct / 60) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {stat.transfers > 0 && (
                    <div className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                      +{stat.transfers} Transfer{stat.transfers > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Status Distribution & Dialing Blocks Strategy */}
        <div className="space-y-4">
          {/* Time-in-Status Distribution */}
          <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Pipeline Distribution
              </span>
            </div>

            <div className="space-y-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between px-3 py-2 bg-[#181825] rounded-lg border border-[#313244] text-xs"
                >
                  <span className="text-slate-300">{status}</span>
                  <span className="font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-[#24273a]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Dialing Blocks Recommendations */}
          <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center space-x-2 mb-1">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Recommended Dialing Blocks
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#181825] border-l-2 border-emerald-500 text-xs">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Block 1: Executive Desk</span>
                <span className="text-[10px] font-mono text-emerald-400">08:30 - 10:00 AM</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Highest pickup for C-Suite & VP levels before daily scrums start.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#181825] border-l-2 border-sky-500 text-xs">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Block 2: Lunch Mobility</span>
                <span className="text-[10px] font-mono text-sky-400">11:30 AM - 01:00 PM</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Optimal for direct dials; prospects check mobile between meetings.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#181825] border-l-2 border-purple-500 text-xs">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Block 3: Wrap-Up Power Hour</span>
                <span className="text-[10px] font-mono text-purple-400">04:00 - 05:30 PM</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Gatekeepers leave desks early; decision makers pick up direct lines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
