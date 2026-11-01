import assert from "node:assert/strict";
import { test } from "node:test";
import { bannerPhotoError } from "../lib/banner-photos";

test("classroom background accepts common pictures within the size limit", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"])
    assert.equal(bannerPhotoError({ type, size: 10 * 1024 * 1024 }), null);
});

test("classroom background rejects unsupported and oversized files", () => {
  assert.match(
    bannerPhotoError({ type: "image/svg+xml", size: 100 }) ?? "",
    /JPG, PNG, or WebP/,
  );
  assert.match(bannerPhotoError({ type: "image/png", size: 0 }) ?? "", /10 MB/);
  assert.match(
    bannerPhotoError({ type: "image/png", size: 10 * 1024 * 1024 + 1 }) ?? "",
    /10 MB/,
  );
});
