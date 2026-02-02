import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,x-user-id",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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

  const id = event.pathParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing detection id" }),
    };
  }

  let body: { isVerified: boolean; isDeer: boolean };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (typeof body.isVerified !== "boolean" || typeof body.isDeer !== "boolean") {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Body must include isVerified (boolean) and isDeer (boolean)",
      }),
    };
  }

  const sk = `DETECT#${id}`;

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: sk },
        UpdateExpression:
          "SET isVerified = :v, isDeer = :d, verifiedAt = :ts",
        ExpressionAttributeValues: {
          ":v": body.isVerified,
          ":d": body.isDeer,
          ":ts": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(PK)",
      })
    );

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        updated: true,
        SK: sk,
        isVerified: body.isVerified,
        isDeer: body.isDeer,
      }),
    };
  } catch (err: unknown) {
    const dynErr = err as { name?: string };
    if (dynErr.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Detection not found" }),
      };
    }

    console.error("Failed to update detection:", err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to update detection" }),
    };
  }
};
