class MosaicMaker {
  constructor() {
    this.errorElement = document.querySelector("[data-error]");
    this.outputElement = document.querySelector("[data-output]");
    this.regenerateButton = document.querySelector("[data-regenerate]");
    this.currentImage = null;

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
    console.log("[MosaicMaker] Initialized.");
  }

  showError(message) {
    if (!this.errorElement) {
      console.warn(
        "[MosaicMaker] Unable to show error, data-error element missing."
      );
      return;
    }
    console.error("[MosaicMaker] Error:", message);
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

  hideOutput() {
    if (!this.outputElement) {
      console.warn(
        "[MosaicMaker] Unable to hide output, data-output element missing."
      );
      return;
    }
    this.outputElement.classList.remove("mosaic__output--visible");
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
        console.log("[MosaicMaker] Image loaded:", url);
        resolve(image);
      };
      image.onerror = () => {
        console.error("[MosaicMaker] Failed to load image:", url);
        reject(new Error("Failed to load image"));
      };
      image.src = url;
    });
  }

  getTileDimensions() {
    const width = parseInt(document.getElementById("tileWidth").value);
    const height = parseInt(document.getElementById("tileHeight").value);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new Error("Tiles should have positive dimensions.");
    }

    console.log("[MosaicMaker] Tile Dimensions:", { width, height });
    return { width, height };
  }

  validateTileSize(image, tileWidth, tileHeight) {
    if (tileWidth > image.width || tileHeight > image.height) {
      throw new Error("Individual tiles should not be larger than the image.");
    }
    console.log("[MosaicMaker] Tile size validated.");
  }

  async handleImageUpload(event) {
    this.hideError();
    this.hideOutput();

    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    try {
      const image = await this.loadImage(url);
      this.currentImage = image;
      if (this.regenerateButton) {
        this.regenerateButton.disabled = false;
      }
      const { width: tileWidth, height: tileHeight } = this.getTileDimensions();

      this.validateTileSize(image, tileWidth, tileHeight);
      await this.renderMosaic(image, tileWidth, tileHeight);
    } catch (error) {
      this.showError(error.message);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async handleRegenerate() {
    try {
      if (!this.currentImage)
        throw new Error("No image available for regeneration.");
      this.hideError();
      this.hideOutput();
      const { width: tileWidth, height: tileHeight } = this.getTileDimensions();
      this.validateTileSize(this.currentImage, tileWidth, tileHeight);
      await this.renderMosaic(this.currentImage, tileWidth, tileHeight);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async renderMosaic(image, tileWidth, tileHeight) {
    try {
      console.log("[MosaicMaker] Rendering mosaic...");
      const xTileCount = Math.floor(image.width / tileWidth);
      const yTileCount = Math.floor(image.height / tileHeight);
      const outputWidth = xTileCount * tileWidth;
      const outputHeight = yTileCount * tileHeight;

      const canvas = this.createCanvas(outputWidth, outputHeight);
      const context = canvas.getContext("2d");

      const svgTile = await this.createSvgTile(tileWidth, tileHeight);
      if (!svgTile) throw new Error("SVG tile could not be created.");

      console.log("[MosaicMaker] Generated SVG Tile:", svgTile);
      await this.generateTiles(
        canvas,
        context,
        svgTile,
        xTileCount,
        yTileCount,
        tileWidth,
        tileHeight
      );

      // Apply color from the image
      await this.colourTiles(canvas, context, image, xTileCount, yTileCount);

      this.outputElement.innerHTML = "";
      this.outputElement.appendChild(canvas); // Append canvas for rendering
      this.showOutput();

      console.log("[MosaicMaker] Mosaic rendering completed.");
    } catch (error) {
      this.showError("Failed to render mosaic: " + error.message);
    }
  }

  async createSvgTile(width, height) {
    const svgData = `
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <ellipse cx="50%" cy="50%" rx="45%" ry="45%" fill="rgba(0, 0, 255, 0.5)" />
      </svg>
    `;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log("[MosaicMaker] SVG tile loaded.");
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error("Failed to create SVG tile"));
      };
      img.src =
        "data:image/svg+xml;charset=utf8," + encodeURIComponent(svgData);
    });
  }

  async generateTiles(
    canvas,
    context,
    svgTile,
    xCount,
    yCount,
    tileWidth,
    tileHeight
  ) {
    console.log("[MosaicMaker] Generating tiles...");
    for (let y = 0; y < yCount; y++) {
      for (let x = 0; x < xCount; x++) {
        context.drawImage(svgTile, x * tileWidth, y * tileHeight);
      }
    }
  }

  async colourTiles(canvas, context, image, xTileCount, yTileCount) {
    console.log("[MosaicMaker] Applying colors to tiles...");
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
