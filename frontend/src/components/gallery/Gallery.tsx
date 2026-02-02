import { verifyDetection } from "../../lib/api";
import type { Detection } from "../../types/detection";

const S3_BUCKET = import.meta.env.VITE_S3_BUCKET;

function s3Url(key: string): string {
  return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
}

interface GalleryProps {
  detections: Detection[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onUpdate: (sk: string, patch: Partial<Detection>) => void;
  userId: string;
}

export default function Gallery({
  detections,
  loading,
  error,
  onRefresh,
  onUpdate,
  userId,
}: GalleryProps) {
  if (loading) {
    return (
      <p className="text-center text-gray-500 py-8">Loading detections...</p>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={onRefresh}
          className="mt-2 text-sm text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (detections.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No detections yet. Upload some trail camera photos above.
      </p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Detections ({detections.length})
        </h2>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {detections.map((d) => (
          <DetectionCard
            key={d.SK}
            detection={d}
            onUpdate={onUpdate}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
}

function DetectionCard({
  detection,
  onUpdate,
  userId,
}: {
  detection: Detection;
  onUpdate: (sk: string, patch: Partial<Detection>) => void;
  userId: string;
}) {
  const { SK, imageKey, confidence, isDeer, deerLabels, captureDate, isVerified } =
    detection;

  const handleVerify = async (confirmDeer: boolean) => {
    // Optimistic update
    onUpdate(SK, { isVerified: true, isDeer: confirmDeer });

    try {
      await verifyDetection(SK, confirmDeer, userId);
    } catch (err) {
      // Revert on failure
      console.error("Verification failed:", err);
      onUpdate(SK, { isVerified: false, isDeer: detection.isDeer });
    }
  };

  const rejected = isVerified && !isDeer;

  return (
    <div
      className={`rounded-lg overflow-hidden shadow bg-white transition-opacity ${
        rejected ? "opacity-40" : ""
      }`}
    >
      <img
        src={s3Url(imageKey)}
        alt="Trail camera capture"
        className="w-full h-48 object-cover"
        loading="lazy"
      />
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-medium px-2 py-0.5 rounded ${
              isDeer
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isDeer ? `Deer (${confidence}%)` : "No Deer"}
          </span>

          {isVerified && isDeer && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
              Confirmed
            </span>
          )}
          {isVerified && !isDeer && (
            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
              Rejected
            </span>
          )}
        </div>

        {deerLabels.length > 0 && (
          <p className="text-xs text-gray-500">
            {deerLabels.map((l) => `${l.name} (${l.confidence}%)`).join(", ")}
          </p>
        )}

        <p className="text-xs text-gray-400">
          {new Date(captureDate).toLocaleString()}
        </p>

        {/* Verification buttons — only show if not yet verified */}
        {!isVerified && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleVerify(true)}
              className="flex-1 text-xs font-medium py-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Confirm Deer
            </button>
            <button
              onClick={() => handleVerify(false)}
              className="flex-1 text-xs font-medium py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              False Alarm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
