(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.MosaicMath = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TILE_SIZE_ERROR = "Tiles must be whole numbers of at least 2 pixels.";
  const TILE_FIT_ERROR = "Individual tiles should not be larger than the image.";

  function readTileSize(value) {
    const size = Number(value);
    if (!Number.isInteger(size) || size < 2) {
      throw new Error(TILE_SIZE_ERROR);
    }
    return size;
  }

  function assertTilesFit(imageWidth, imageHeight, tileWidth, tileHeight) {
    if (tileWidth > imageWidth || tileHeight > imageHeight) {
      throw new Error(TILE_FIT_ERROR);
    }
  }

  function planMosaic(imageWidth, imageHeight, tileWidth, tileHeight) {
    const xTileCount = Math.floor(imageWidth / tileWidth);
    const yTileCount = Math.floor(imageHeight / tileHeight);
    return {
      xTileCount,
      yTileCount,
      outputWidth: xTileCount * tileWidth,
      outputHeight: yTileCount * tileHeight,
    };
  }

  function formatCropNote(imageWidth, imageHeight, outputWidth, outputHeight) {
    const croppedX = imageWidth - outputWidth;
    const croppedY = imageHeight - outputHeight;
    if (croppedX === 0 && croppedY === 0) return "";

    const used = `${outputWidth}×${outputHeight} used`;
    let cropped = `${croppedX}×${croppedY} cropped`;
    if (croppedX === 0) cropped = `${croppedY}px cropped from the height`;
    if (croppedY === 0) cropped = `${croppedX}px cropped from the width`;
    return `${used}, ${cropped}.`;
  }

  return { readTileSize, assertTilesFit, planMosaic, formatCropNote };
});
