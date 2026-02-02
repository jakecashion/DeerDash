import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Detection } from "../../types/detection";

interface AnalyticsDashboardProps {
  detections: Detection[];
}

interface HourBucket {
  hour: string;
  count: number;
}

function buildHourlyData(detections: Detection[]): HourBucket[] {
  // Only count items where isDeer is true (confirmed + unverified deer)
  const deerOnly = detections.filter((d) => d.isDeer);

  const counts = new Array<number>(24).fill(0);
  for (const d of deerOnly) {
    const hour = new Date(d.captureDate).getHours();
    counts[hour]++;
  }

  return counts.map((count, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    count,
  }));
}

export default function AnalyticsDashboard({
  detections,
}: AnalyticsDashboardProps) {
  const deerDetections = detections.filter((d) => d.isDeer);
  const totalDeer = deerDetections.length;
  const verified = deerDetections.filter((d) => d.isVerified).length;
  const hourlyData = buildHourlyData(detections);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total Deer Seen" value={totalDeer} />
        <KpiCard label="Verified" value={verified} />
        <KpiCard label="Pending Review" value={totalDeer - verified} />
      </div>

      {/* Activity by Hour chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Activity by Hour
        </h3>
        {totalDeer === 0 ? (
          <p className="text-gray-500 text-center py-12">
            No deer data yet. Upload and verify photos to see patterns.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12 }}
                interval={1}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
