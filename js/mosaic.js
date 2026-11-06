class MosaicMaker {
  constructor() {
    this.errorElement = document.querySelector("[data-error]");
    this.outputElement = document.querySelector("[data-output]");
    this.canvasHost = document.querySelector("[data-canvas]");
    this.cropElement = document.querySelector("[data-crop]");
    this.downloadLink = document.querySelector("[data-download]");
    this.regenerateButton = document.querySelector("[data-regenerate]");
    this.fileNameElement = document.querySelector("[data-filename]");
    this.currentImage = null;
    this.renderToken = 0;
    this.shownToken = 0;
    this.downloadUrl = null;

    if (!this.errorElement) {
      console.warn("[MosaicMaker] Warning: No element found for data-error.");
    }
    if (!this.outputElement) {
      console.warn("[MosaicMaker] Warning: No element found for data-output.");
    }
    if (!this.regenerateButton) {
      console.warn(
        "[MosaicMaker] Warning: No element found for data-regenerate."
      );
    }

    this.init();
  }

  init() {
    if (typeof MosaicMath !== "object") {
      console.error("[MosaicMaker] Error: mosaic-math.js did not load.");
      return;
    }

    const imageInput = document.getElementById("imageInput");
    if (!imageInput) {
      console.error("[MosaicMaker] Error: No element found for #imageInput.");
      return;
    }

    imageInput.addEventListener("change", this.handleImageUpload.bind(this));
    if (this.regenerateButton) {
      this.regenerateButton.addEventListener(
        "click",
        this.handleRegenerate.bind(this)
      );
    }
  }

  showError(message) {
    if (!this.errorElement) {
      console.warn(
        "[MosaicMaker] Unable to show error, data-error element missing."
      );
      return;
    }
    this.errorElement.textContent = message;
    this.errorElement.classList.add("mosaic__error--visible");
  }

  hideError() {
    if (!this.errorElement) {
      console.warn(
        "[MosaicMaker] Unable to hide error, data-error element missing."
      );
      return;
    }
    this.errorElement.textContent = "";
    this.errorElement.classList.remove("mosaic__error--visible");
  }

  showOutput() {
    if (!this.outputElement) {
      console.warn(
        "[MosaicMaker] Unable to show output, data-output element missing."
      );
      return;
    }
    this.outputElement.classList.add("mosaic__output--visible");
  }

  createCanvas(width, height) {
    const canvas = document.createElement("canvas");
    if (canvas.getContext) {
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    throw new Error("Canvas not supported in your browser");
  }

  async loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      image.src = url;
    });
  }

  getTileDimensions() {
    const widthInput = document.getElementById("tileWidth");
    const heightInput = document.getElementById("tileHeight");
    if (!widthInput || !heightInput) {
      throw new Error("Tile size fields are missing.");
    }

    return {
      width: MosaicMath.readTileSize(widthInput.value),
      height: MosaicMath.readTileSize(heightInput.value),
    };
  }

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Allow choosing the same file again after a failed attempt.
    event.target.value = "";

    const token = ++this.renderToken;
    this.hideError();
    const url = URL.createObjectURL(file);

    try {
      const image = await this.loadImage(url);
      if (token !== this.renderToken) return;

      this.currentImage = image;
      if (this.fileNameElement) {
        this.fileNameElement.textContent = file.name;
        this.fileNameElement.classList.add("mosaic__filename--visible");
      }
      if (this.regenerateButton) {
        this.regenerateButton.disabled = false;
      }

      const { width: tileWidth, height: tileHeight } = this.getTileDimensions();
      MosaicMath.assertTilesFit(image.width, image.height, tileWidth, tileHeight);
      await this.renderMosaic(image, tileWidth, tileHeight, token);
    } catch (error) {
      if (token !== this.renderToken) return;
      this.showError(error.message);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async handleRegenerate() {
    if (!this.currentImage) {
      this.showError("No image available for regeneration.");
      return;
    }

    const token = ++this.renderToken;

    try {
      this.hideError();
      const { width: tileWidth, height: tileHeight } = this.getTileDimensions();
      MosaicMath.assertTilesFit(
        this.currentImage.width,
        this.currentImage.height,
        tileWidth,
        tileHeight
      );
      await this.renderMosaic(this.currentImage, tileWidth, tileHeight, token);
    } catch (error) {
      if (token !== this.renderToken) return;
      this.showError(error.message);
    }
  }

  async renderMosaic(image, tileWidth, tileHeight, token) {
    const { xTileCount, yTileCount, outputWidth, outputHeight } =
      MosaicMath.planMosaic(image.width, image.height, tileWidth, tileHeight);

    const canvas = this.createCanvas(outputWidth, outputHeight);
    const context = canvas.getContext("2d");

    const svgTile = await this.createSvgTile(tileWidth, tileHeight);
    if (token !== this.renderToken) return;

    this.generateTiles(context, svgTile, outputWidth, outputHeight);
    this.colourTiles(canvas, context, image, xTileCount, yTileCount);
    if (token !== this.renderToken) return;

    if (!this.canvasHost) {
      throw new Error("Mosaic output is missing.");
    }

    this.canvasHost.replaceChildren(canvas);
    this.shownToken = token;
    this.updateCropNote(image, outputWidth, outputHeight);
    this.resetDownload();
    this.showOutput();
    this.offerDownload(canvas, token);
  }

  updateCropNote(image, outputWidth, outputHeight) {
    if (!this.cropElement) return;

    const note = MosaicMath.formatCropNote(
      image.width,
      image.height,
      outputWidth,
      outputHeight
    );
    this.cropElement.textContent = note;
    this.cropElement.classList.toggle("mosaic__crop--visible", note !== "");
  }

  resetDownload() {
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = null;
    }
    if (!this.downloadLink) return;
    this.downloadLink.classList.remove("mosaic__download--visible");
    this.downloadLink.removeAttribute("href");
  }

  offerDownload(canvas, token) {
    if (!this.downloadLink) return;

    canvas.toBlob((blob) => {
      if (!blob || token !== this.shownToken) return;
      const url = URL.createObjectURL(blob);
      this.downloadUrl = url;
      this.downloadLink.href = url;
      this.downloadLink.classList.add("mosaic__download--visible");
    }, "image/png");
  }

  async createSvgTile(width, height) {
    const svgData = `
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <ellipse cx="50%" cy="50%" rx="45%" ry="45%" fill="rgba(0, 0, 255, 1)" />
      </svg>
    `;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to create SVG tile"));
      img.src =
        "data:image/svg+xml;charset=utf8," + encodeURIComponent(svgData);
    });
  }

  generateTiles(context, svgTile, width, height) {
    const pattern = context.createPattern(svgTile, "repeat");
    if (!pattern) throw new Error("Could not build a tile pattern.");
    context.fillStyle = pattern;
    context.fillRect(0, 0, width, height);
  }

  /**
   * source-in keeps the ellipse mask and replaces its colour with the photo.
   * The downscale is smoothed so each tile gets an average; the scale-up is not,
   * so tile edges stay sharp.
   */
  colourTiles(canvas, context, image, xTileCount, yTileCount) {
    context.globalCompositeOperation = "source-in";

    const smallCanvas = this.createCanvas(xTileCount, yTileCount);
    const smallContext = smallCanvas.getContext("2d");

    smallContext.drawImage(image, 0, 0, xTileCount, yTileCount);

    context.imageSmoothingEnabled = false;
    context.scale(canvas.width / xTileCount, canvas.height / yTileCount);
    context.drawImage(smallCanvas, 0, 0);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new MosaicMaker();
});
