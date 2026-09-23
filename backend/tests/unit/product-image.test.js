import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { inspectProductImage, writeProductImage } from "../../src/utils/product-image.js";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("product image utilities", () => {
  it("detects the actual image type and ignores the declared MIME", async () => {
    const result = await inspectProductImage({ buffer: onePixelPng, mimetype: "text/plain" });
    expect(result).toEqual({ extension: "png", mime: "image/png" });
  });

  it("rejects unsupported bytes", async () => {
    await expect(
      inspectProductImage({ buffer: Buffer.from("not an image"), mimetype: "image/png" }),
    ).rejects.toMatchObject({ code: "INVALID_IMAGE", statusCode: 400 });
  });

  it("writes a random filename without using the original name", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sai-product-image-"));
    const filename = await writeProductImage(
      { buffer: onePixelPng, originalname: "../../unsafe.png" },
      directory,
    );

    expect(filename).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(await readFile(join(directory, filename))).toEqual(onePixelPng);
  });
});
