import ExifParser from "exif-parser";

/**
 * Attempt to extract the original capture date from EXIF data.
 * Falls back to the current date if EXIF is missing or unparseable.
 */
export function parseExifDate(imageBuffer: Buffer): Date {
  try {
    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();

    // DateTimeOriginal is a Unix timestamp (seconds since epoch)
    const ts = result.tags?.DateTimeOriginal;
    if (ts && typeof ts === "number") {
      return new Date(ts * 1000);
    }
  } catch {
    // EXIF parsing can fail on non-JPEG or stripped images — that's fine
  }

  return new Date();
}
