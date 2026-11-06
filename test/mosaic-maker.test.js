const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function classList() {
  const names = new Set();
  return {
    add(name) {
      names.add(name);
    },
    remove(name) {
      names.delete(name);
    },
    toggle(name, force) {
      const on = force === undefined ? !names.has(name) : Boolean(force);
      if (on) names.add(name);
      else names.delete(name);
    },
    contains(name) {
      return names.has(name);
    },
  };
}

function element() {
  return {
    textContent: "",
    value: "",
    disabled: false,
    classList: classList(),
    addEventListener() {},
    removeAttribute() {},
    replaceChildren(child) {
      this.child = child;
    },
  };
}

function loadMaker() {
  const error = element();
  const output = element();
  const canvasHost = element();
  const crop = element();
  const download = element();
  const regenerate = element();
  const filename = element();
  const imageInput = element();
  const tileWidth = element();
  const tileHeight = element();
  tileWidth.value = "12";
  tileHeight.value = "12";

  const bySelector = {
    "[data-error]": error,
    "[data-output]": output,
    "[data-canvas]": canvasHost,
    "[data-crop]": crop,
    "[data-download]": download,
    "[data-regenerate]": regenerate,
    "[data-filename]": filename,
  };
  const byId = {
    imageInput,
    tileWidth,
    tileHeight,
  };

  const context = {
    console,
    document: {
      querySelector(selector) {
        return bySelector[selector] ?? null;
      },
      getElementById(id) {
        return byId[id] ?? null;
      },
    },
    addEventListener() {},
  };
  context.window = context;
  vm.createContext(context);

  const root = path.join(__dirname, "..");
  const source = [
    fs.readFileSync(path.join(root, "js/mosaic-math.js"), "utf8"),
    fs.readFileSync(path.join(root, "js/mosaic.js"), "utf8"),
    "this.Maker = MosaicMaker;",
  ].join("\n");
  vm.runInContext(source, context);

  const maker = new context.Maker();
  maker.createSvgTile = async () => ({});
  maker.generateTiles = () => {};
  maker.colourTiles = () => {};
  maker.offerDownload = () => {};
  maker.createCanvas = (width, height) => ({
    width,
    height,
    getContext() {
      return {};
    },
  });
  maker.currentImage = { width: 40, height: 30 };

  return { maker, error, output, canvasHost, crop, tileWidth, tileHeight };
}

test("a failed regenerate keeps the mosaic and a later success clears the error", async () => {
  const { maker, error, output, canvasHost, crop, tileWidth, tileHeight } = loadMaker();
  output.classList.add("mosaic__output--visible");
  const previous = { width: 36, height: 24 };
  canvasHost.child = previous;

  tileWidth.value = "100";
  await maker.handleRegenerate();

  assert.equal(error.textContent, "Individual tiles should not be larger than the image.");
  assert.equal(error.classList.contains("mosaic__error--visible"), true);
  assert.equal(output.classList.contains("mosaic__output--visible"), true);
  assert.equal(canvasHost.child, previous);

  tileWidth.value = "10";
  tileHeight.value = "10";
  await maker.handleRegenerate();

  assert.equal(error.textContent, "");
  assert.equal(error.classList.contains("mosaic__error--visible"), false);
  assert.equal(canvasHost.child.width, 40);
  assert.equal(canvasHost.child.height, 30);
  assert.equal(crop.textContent, "");
  assert.equal(crop.classList.contains("mosaic__crop--visible"), false);
});

test("an older render cannot replace a newer one", async () => {
  const { maker, canvasHost, crop, tileWidth, tileHeight } = loadMaker();
  let releaseFirst;
  maker.createSvgTile = () =>
    new Promise((resolve) => {
      releaseFirst = () => resolve({});
    });

  const first = maker.handleRegenerate();

  maker.createSvgTile = async () => ({});
  tileWidth.value = "10";
  tileHeight.value = "10";
  await maker.handleRegenerate();

  releaseFirst();
  await first;

  assert.equal(canvasHost.child.width, 40);
  assert.equal(canvasHost.child.height, 30);
  assert.equal(crop.textContent, "");
});

test("a cropped grid reports the leftover pixels", async () => {
  const { maker, crop, canvasHost } = loadMaker();

  await maker.handleRegenerate();

  assert.equal(canvasHost.child.width, 36);
  assert.equal(canvasHost.child.height, 24);
  assert.equal(crop.textContent, "36×24 used, 4×6 cropped.");
  assert.equal(crop.classList.contains("mosaic__crop--visible"), true);
});
