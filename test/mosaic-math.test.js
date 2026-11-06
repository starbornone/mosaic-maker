const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  readTileSize,
  assertTilesFit,
  planMosaic,
  formatCropNote,
} = require("../js/mosaic-math");

const root = path.join(__dirname, "..");

test("tile sizes are whole pixels of at least 2", () => {
  assert.equal(readTileSize(2), 2);
  assert.equal(readTileSize("12"), 12);

  for (const value of [1, 0, -4, 10.5, "", "10px", null]) {
    assert.throws(() => readTileSize(value), {
      message: "Tiles must be whole numbers of at least 2 pixels.",
    });
  }
});

test("tiles must fit inside the image", () => {
  assert.doesNotThrow(() => assertTilesFit(40, 30, 40, 30));
  assert.throws(() => assertTilesFit(40, 30, 41, 12), {
    message: "Individual tiles should not be larger than the image.",
  });
  assert.throws(() => assertTilesFit(40, 30, 12, 31), {
    message: "Individual tiles should not be larger than the image.",
  });
});

test("the grid keeps only whole tiles and reports the leftover edge", () => {
  const cropped = planMosaic(40, 30, 12, 12);
  assert.deepEqual(cropped, {
    xTileCount: 3,
    yTileCount: 2,
    outputWidth: 36,
    outputHeight: 24,
  });
  assert.equal(
    formatCropNote(40, 30, cropped.outputWidth, cropped.outputHeight),
    "36×24 used, 4×6 cropped."
  );

  const exact = planMosaic(40, 30, 10, 10);
  assert.deepEqual(exact, {
    xTileCount: 4,
    yTileCount: 3,
    outputWidth: 40,
    outputHeight: 30,
  });
  assert.equal(formatCropNote(40, 30, exact.outputWidth, exact.outputHeight), "");

  const widthOnly = planMosaic(80, 60, 12, 12);
  assert.equal(
    formatCropNote(80, 60, widthOnly.outputWidth, widthOnly.outputHeight),
    "72×60 used, 8px cropped from the width."
  );

  const heightOnly = planMosaic(40, 30, 10, 12);
  assert.equal(
    formatCropNote(40, 30, heightOnly.outputWidth, heightOnly.outputHeight),
    "40×24 used, 6px cropped from the height."
  );
});

test("an error stays hidden until the page shows it", () => {
  const css = fs.readFileSync(path.join(root, "styles/global.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

  assert.match(css, /\.mosaic__error\s*\{[^}]*display:\s*none/);
  assert.match(css, /\.mosaic__error--visible\s*\{[^}]*display:\s*block/);
  assert.match(html, /data-error[^>]*role="alert"/);
});
