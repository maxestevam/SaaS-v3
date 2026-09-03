import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";

const keys = ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
const hasR2Configuration = keys.every((key) => String(process.env[key] || "").trim());

describe.skipIf(!hasR2Configuration)("credenciais Cloudflare R2", () => {
  it("autentica no bucket sem gravar ou expor objetos", async () => {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const response = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      Prefix: "__credential_validation_without_objects__/",
      MaxKeys: 1,
    }));

    expect(response.$metadata.httpStatusCode).toBe(200);
  }, 20_000);
});
