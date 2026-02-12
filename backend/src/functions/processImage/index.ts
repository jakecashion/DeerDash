import type { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import {
  RekognitionClient,
  DetectLabelsCommand,
} from "@aws-sdk/client-rekognition";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { parseExifDate } from "../../lib/exif.js";
import type { DetectionLabel } from "../../types/detection.js";

const s3 = new S3Client({});
const rekognition = new RekognitionClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

/** Labels that indicate deer or deer-adjacent wildlife */
const DEER_LABELS = new Set([
  "deer",
  "buck",
  "doe",
  "fawn",
  "animal",
  "wildlife",
  "mammal",
  "antler",
  "white-tailed deer",
]);

const MIN_CONFIDENCE = 60;

export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const key = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, " ")
    );

    try {
      await processOne(key);
    } catch (err) {
      // Log but don't throw — one bad image shouldn't kill the batch
      console.error(`Failed to process ${key}:`, err);
    }
  }
};

async function processOne(key: string): Promise<void> {
  // 1. Read S3 object metadata to get the userId
  const headObj = await s3.send(
    new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  );
  const userId = headObj.Metadata?.userid;
  if (!userId) {
    console.error(`No userid metadata on ${key}, skipping`);
    return;
  }

  // 2. Fetch the image bytes for EXIF parsing
  const getObj = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  );
  const imageBytes = await getObj.Body!.transformToByteArray();

  // 3. Extract capture date from EXIF (falls back to now)
  const captureDate = parseExifDate(Buffer.from(imageBytes));

  // 4. Call Rekognition (once per image)
  let allLabels: DetectionLabel[] = [];
  let deerLabels: DetectionLabel[] = [];
  let topConfidence = 0;
  let isDeer = false;

  try {
    const detection = await rekognition.send(
      new DetectLabelsCommand({
        Image: {
          S3Object: {
            Bucket: BUCKET_NAME,
            Name: key,
          },
        },
        MaxLabels: 20,
        MinConfidence: MIN_CONFIDENCE,
      })
    );

    allLabels = (detection.Labels ?? []).map(
      (l: { Name?: string; Confidence?: number }): DetectionLabel => ({
        name: l.Name ?? "Unknown",
        confidence: Math.round(l.Confidence ?? 0),
      })
    );

    // 5. Filter for deer-relevant labels
    deerLabels = allLabels.filter((l) =>
      DEER_LABELS.has(l.name.toLowerCase())
    );

    topConfidence =
      deerLabels.length > 0
        ? Math.max(...deerLabels.map((l) => l.confidence))
        : 0;

    isDeer = deerLabels.some(
      (l) =>
        ["deer", "buck", "doe", "fawn", "white-tailed deer"].includes(
          l.name.toLowerCase()
        ) && l.confidence >= MIN_CONFIDENCE
    );
  } catch (rekErr: unknown) {
    const errName = (rekErr as { name?: string })?.name;
    console.warn(
      `Rekognition failed for ${key} (${errName}), saving record without labels`
    );
    // Continue — we still persist a record so the image isn't silently lost
  }

  // 6. Persist to DynamoDB — PK is the authenticated user
  const timestamp = captureDate.toISOString();
  // Append the first 8 chars of the UUID from the S3 key to prevent
  // SK collisions when multiple images share the same capture timestamp
  const uniqueSuffix = key.split("/").pop()?.split("-")[0] ?? "";

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `DETECT#${timestamp}#${uniqueSuffix}`,
        imageKey: key,
        captureDate: timestamp,
        labels: allLabels,
        deerLabels,
        confidence: topConfidence,
        isDeer,
        isVerified: false,
        createdAt: new Date().toISOString(),
        GSI1PK: "DETECTIONS",
        GSI1SK: timestamp,
      },
    })
  );

  console.log(
    `Processed ${key} for ${userId}: isDeer=${isDeer}, confidence=${topConfidence}, captureDate=${timestamp}`
  );
}
