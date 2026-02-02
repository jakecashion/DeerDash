import type { Detection } from "../types/detection";

const API_URL = import.meta.env.VITE_API_URL;

interface PresignedPostResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
}

/**
 * Request a presigned POST URL from the backend.
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  userId: string
): Promise<PresignedPostResponse> {
  const params = new URLSearchParams({ filename, contentType });
  const res = await fetch(`${API_URL}/upload-url?${params}`, {
    headers: { "x-user-id": userId },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload URL request failed (${res.status})`);
  }

  return res.json();
}

/**
 * Upload a file to S3 using a presigned POST.
 */
export async function uploadToS3(
  file: File,
  presigned: PresignedPostResponse
): Promise<void> {
  const formData = new FormData();

  // Presigned fields must come before the file
  for (const [key, value] of Object.entries(presigned.fields)) {
    formData.append(key, value);
  }
  formData.append("file", file);

  const res = await fetch(presigned.url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`S3 upload failed (${res.status})`);
  }
}

/**
 * Fetch all processed detections for the authenticated user.
 */
export async function fetchDetections(userId: string): Promise<Detection[]> {
  const res = await fetch(`${API_URL}/detections`, {
    headers: { "x-user-id": userId },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch detections (${res.status})`);
  }

  const data: { detections: Detection[] } = await res.json();
  return data.detections;
}

/**
 * Verify or reject a detection.
 * @param sk - The full SK value, e.g. "DETECT#2024-11-15T06:30:00.000Z"
 */
export async function verifyDetection(
  sk: string,
  isDeer: boolean,
  userId: string
): Promise<void> {
  // Extract the timestamp portion from the SK to use as the path param
  const id = sk.replace("DETECT#", "");

  const res = await fetch(`${API_URL}/detections/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: JSON.stringify({ isVerified: true, isDeer }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Verification failed (${res.status})`);
  }
}
