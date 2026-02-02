import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "node:crypto";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME!;
const EXPIRATION_SECONDS = 300; // 5 minutes
const MAX_UPLOAD_BYTES = 500_000; // 500 KB — generous ceiling for compressed images

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,x-user-id",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const userId = event.headers["x-user-id"] ?? event.headers["X-User-Id"];
  if (!userId) {
    return {
      statusCode: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing x-user-id header" }),
    };
  }

  const filename = event.queryStringParameters?.filename;
  const contentType = event.queryStringParameters?.contentType;

  if (!filename || !contentType) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Missing required query parameters: filename, contentType",
      }),
    };
  }

  // Only allow image types
  if (!contentType.startsWith("image/")) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Only image files are allowed" }),
    };
  }

  const key = `uploads/${randomUUID()}-${filename}`;

  // Embed the userId in S3 object metadata so processImage can read it
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 0, MAX_UPLOAD_BYTES],
      ["eq", "$Content-Type", contentType],
      ["eq", "$x-amz-meta-userid", userId],
    ],
    Fields: {
      "Content-Type": contentType,
      "x-amz-meta-userid": userId,
    },
    Expires: EXPIRATION_SECONDS,
  });

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ url, fields, key }),
  };
};
