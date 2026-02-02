import { useEffect, useState, useCallback } from "react";
import {
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import UploadZone from "./components/upload/UploadZone";
import Gallery from "./components/gallery/Gallery";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import LandingPage from "./pages/LandingPage";
import { fetchDetections } from "./lib/api";
import type { Detection } from "./types/detection";

type Tab = "gallery" | "analytics";

function App() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </>
  );
}

function Dashboard() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const [tab, setTab] = useState<Tab>("gallery");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDetections(userId);
      setDetections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = (sk: string, patch: Partial<Detection>) => {
    setDetections((prev) =>
      prev.map((d) => (d.SK === sk ? { ...d, ...patch } : d))
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">DeerDash</h1>
        <UserButton />
      </div>

      {/* Tab switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <TabButton
            active={tab === "gallery"}
            onClick={() => setTab("gallery")}
          >
            Upload & Gallery
          </TabButton>
          <TabButton
            active={tab === "analytics"}
            onClick={() => setTab("analytics")}
          >
            Analytics Dashboard
          </TabButton>
        </div>
      </div>

      {tab === "gallery" && (
        <>
          <UploadZone userId={userId} />
          <Gallery
            detections={detections}
            loading={loading}
            error={error}
            onRefresh={load}
            onUpdate={handleUpdate}
            userId={userId}
          />
        </>
      )}

      {tab === "analytics" && (
        <AnalyticsDashboard detections={detections} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

export default App;
