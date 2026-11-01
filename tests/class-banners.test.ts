import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOCAL_PHOTO,
  applyBannerChange,
  bannerChangeError,
  bannerPhotoUrl,
  readChoice,
  readChoices,
} from "../lib/class-banners";
import { classColors } from "../lib/class-themes";

test("older browser saves still load", () => {
  assert.deepEqual(readChoice("math"), { theme: "math" });
  assert.deepEqual(readChoice("custom"), { photo: LOCAL_PHOTO });
  assert.deepEqual(readChoice({ theme: "art", photo: true }), {
    theme: "art",
    photo: LOCAL_PHOTO,
  });
});

test("synced choices keep their photo version and drop junk", () => {
  assert.deepEqual(
    readChoice({ theme: "art", color: "#c2185b", photo: "v1", extra: 1 }),
    { theme: "art", color: "#c2185b", photo: "v1" },
  );
  assert.deepEqual(readChoice({ theme: 3, photo: "" }), {});
  assert.deepEqual(readChoice(null), {});
  assert.deepEqual(readChoices(["math"]), {});
  assert.deepEqual(readChoices({ a: "math", b: 7 }), {
    a: { theme: "math" },
    b: {},
  });
});

test("a theme replaces the photo and color", () => {
  assert.deepEqual(
    applyBannerChange(
      { theme: "art", color: "#c2185b", photo: "v1" },
      { kind: "theme", theme: "math" },
    ),
    { theme: "math" },
  );
});

test("colors and photos change only their own field", () => {
  const old = { theme: "art", photo: "v1" };
  assert.deepEqual(
    applyBannerChange(old, { kind: "color", color: "#137333" }),
    {
      theme: "art",
      photo: "v1",
      color: "#137333",
    },
  );
  assert.deepEqual(applyBannerChange(old, { kind: "photo", photo: "v2" }), {
    theme: "art",
    photo: "v2",
  });
  assert.deepEqual(applyBannerChange(old, { kind: "removePhoto" }), {
    theme: "art",
  });
});

test("only built-in themes and palette colors can be saved", () => {
  assert.equal(bannerChangeError({ kind: "theme", theme: "math" }), null);
  assert.match(
    bannerChangeError({ kind: "theme", theme: "custom" }) ?? "",
    /built-in/,
  );
  assert.equal(
    bannerChangeError({ kind: "color", color: classColors[0].value }),
    null,
  );
  assert.match(
    bannerChangeError({ kind: "color", color: "red; background:url(x)" }) ?? "",
    /banner colors/,
  );
  assert.equal(bannerChangeError({ kind: "removePhoto" }), null);
});

test("photo URLs change with each upload", () => {
  assert.notEqual(bannerPhotoUrl("c", "v1"), bannerPhotoUrl("c", "v2"));
  assert.equal(
    bannerPhotoUrl("c", "a b"),
    "/api/class-banners?class=c&v=a%20b",
  );
});
