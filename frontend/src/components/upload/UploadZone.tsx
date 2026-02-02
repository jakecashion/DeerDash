import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { compressImage } from "../../utils/imageCompression";
import { getPresignedUploadUrl, uploadToS3 } from "../../lib/api";

interface FileStatus {
  name: string;
  state: "compressing" | "uploading" | "done" | "error";
  error?: string;
  /** Size in bytes after compression */
  compressedSize?: number;
}

interface UploadZoneProps {
  userId: string;
}

export default function UploadZone({ userId }: UploadZoneProps) {
  const [files, setFiles] = useState<FileStatus[]>([]);

  const updateFile = (name: string, patch: Partial<FileStatus>) => {
    setFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, ...patch } : f))
    );
  };

  const processFile = async (file: File) => {
    const id = file.name;

    try {
      // 1. Compress
      updateFile(id, { state: "compressing" });
      const compressed = await compressImage(file);

      updateFile(id, {
        state: "uploading",
        compressedSize: compressed.size,
      });

      // 2. Get presigned URL (now includes userId)
      const presigned = await getPresignedUploadUrl(
        compressed.name,
        compressed.type,
        userId
      );

      // 3. Upload to S3
      await uploadToS3(compressed, presigned);

      updateFile(id, { state: "done" });
    } catch (err) {
      updateFile(id, {
        state: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  const onDrop = useCallback(
    (accepted: File[]) => {
      // Initialize status entries
      const newEntries: FileStatus[] = accepted.map((f) => ({
        name: f.name,
        state: "compressing" as const,
      }));
      setFiles((prev) => [...prev, ...newEntries]);

      // Process each file (concurrently)
      accepted.forEach(processFile);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: true,
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-lg font-medium text-gray-700">
          {isDragActive
            ? "Drop trail camera photos here..."
            : "Drag & drop trail camera photos, or click to browse"}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          JPG, PNG, or WebP. Images are compressed before upload.
        </p>
      </div>

      {/* File status list */}
      {files.length > 0 && (
        <ul className="mt-6 space-y-2">
          {files.map((f) => (
            <li
              key={f.name}
              className="flex items-center justify-between px-4 py-2 rounded bg-white shadow-sm"
            >
              <span className="text-sm text-gray-800 truncate max-w-xs">
                {f.name}
              </span>
              <StatusBadge status={f} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  switch (status.state) {
    case "compressing":
      return (
        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
          Compressing...
        </span>
      );
    case "uploading":
      return (
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
          Uploading{" "}
          {status.compressedSize
            ? `(${(status.compressedSize / 1024).toFixed(0)} KB)`
            : ""}
        </span>
      );
    case "done":
      return (
        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
          Done
        </span>
      );
    case "error":
      return (
        <span
          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
          title={status.error}
        >
          Error
        </span>
      );
  }
}
