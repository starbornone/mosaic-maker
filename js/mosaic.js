class MosaicMaker {
  constructor() {
    this.errorElement = document.querySelector("[data-error]");
    this.outputElement = document.querySelector("[data-output]");
    this.regenerateButton = document.querySelector("[data-regenerate]");
    this.currentImage = null;
    this.init();
  }

  init() {
    document
      .getElementById("imageInput")
      .addEventListener("change", this.handleImageUpload.bind(this));
    this.regenerateButton.addEventListener(
      "click",
      this.handleRegenerate.bind(this)
    );
  }

  showError(message) {
    this.errorElement.textContent = message;
    this.errorElement.classList.add("mosaic__error--visible");
  }

  hideError() {
    this.errorElement.classList.remove("mosaic__error--visible");
  }

  showOutput() {
    this.outputElement.classList.add("mosaic__output--visible");
  }

  hideOutput() {
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
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = url;
    });
  }

  getTileDimensions() {
    const width = parseInt(document.getElementById("tileWidth").value);
    const height = parseInt(document.getElementById("tileHeight").value);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new Error("Tiles should be larger than 0");
    }

    return { width, height };
  }

  validateTileSize(image, tileWidth, tileHeight) {
    if (tileWidth > image.width || tileHeight > image.height) {
      throw new Error("Individual tiles should not be larger than the image");
    }
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
      this.regenerateButton.disabled = false;
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
        throw new Error("No image available for regeneration");
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
    const xTileCount = Math.floor(image.width / tileWidth);
    const yTileCount = Math.floor(image.height / tileHeight);
    const outputWidth = xTileCount * tileWidth;
    const outputHeight = yTileCount * tileHeight;

    const canvas = this.createCanvas(outputWidth, outputHeight);
    const context = canvas.getContext("2d");
    const inScreen = this.createCanvas(outputWidth, outputHeight);
    const inScreenContext = inScreen.getContext("2d");

    const svgTile = await this.createSvgTile(tileWidth, tileHeight);
    await this.generateTiles(
      canvas,
      context,
      svgTile,
      xTileCount,
      yTileCount,
      tileWidth,
      tileHeight
    );
    await this.colourTiles(canvas, context, image, xTileCount, yTileCount);

    this.outputElement.innerHTML = "";
    this.outputElement.appendChild(inScreen);
    this.showOutput();

    let imageRow = 0;
    const renderRow = () => {
      if (imageRow < canvas.height) {
        inScreenContext.drawImage(
          canvas,
          0,
          imageRow,
          canvas.width,
          tileHeight,
          0,
          imageRow,
          canvas.width,
          tileHeight
        );
        imageRow += tileHeight;
        requestAnimationFrame(renderRow);
      }
    };

    requestAnimationFrame(renderRow);
  }

  async createSvgTile(width, height) {
    const svgData = `
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
              <ellipse cx="50%" cy="50%" rx="50%" ry="50%"></ellipse>
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

  async generateTiles(
    canvas,
    context,
    svgTile,
    xCount,
    yCount,
    tileWidth,
    tileHeight
  ) {
    for (let y = 0; y < yCount; y++) {
      for (let x = 0; x < xCount; x++) {
        context.drawImage(svgTile, x * tileWidth, y * tileHeight);
      }
    }
  }

  async colourTiles(canvas, context, image, xTileCount, yTileCount) {
    context.globalCompositeOperation = "source-in";

    const smallCanvas = this.createCanvas(xTileCount, yTileCount);
    const smallContext = smallCanvas.getContext("2d");

    smallContext.drawImage(image, 0, 0, xTileCount, yTileCount);

    context.imageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;

    context.scale(canvas.width / xTileCount, canvas.height / yTileCount);
    context.drawImage(smallCanvas, 0, 0);
  }
}

window.addEventListener("DOMContentLoaded", () => new MosaicMaker());
