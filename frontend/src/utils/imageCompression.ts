import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS: Parameters<typeof imageCompression>[1] = {
  maxSizeMB: 0.3, // 300 KB
  maxWidthOrHeight: 1920, // max 1920px on longest edge
  useWebWorker: true,
  fileType: "image/jpeg",
};

/**
 * Compress an image file for upload.
 * Returns a JPEG blob ≤300 KB, max 1920px wide.
 * To disable compression in the future (full-res uploads),
 * simply return the original file from this function.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip compression for files already under the limit
  if (file.size <= COMPRESSION_OPTIONS.maxSizeMB! * 1024 * 1024) {
    return file;
  }

  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);

  // browser-image-compression returns a Blob — wrap it as a File
  return new File([compressed], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}
