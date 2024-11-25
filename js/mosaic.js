class MosaicMaker {
  constructor() {
    this.errorElement = document.querySelector("[data-error]");
    this.outputElement = document.querySelector("[data-output]");
    this.regenerateButton = document.querySelector("[data-regenerate]");
    this.currentImage = null;

    // Warn if useful elements are missing to aid debugging
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

  /**
   * Initializes the application by attaching event listeners to DOM elements.
   * Ensures critical elements like the file input exist.
   */
  init() {
    const imageInput = document.getElementById("imageInput");
    if (!imageInput) {
      console.error("[MosaicMaker] Error: No element found for #imageInput.");
      return;
    }

    // Bind event handlers for file input and regenerate button
    imageInput.addEventListener("change", this.handleImageUpload.bind(this));
    if (this.regenerateButton) {
      this.regenerateButton.addEventListener(
        "click",
        this.handleRegenerate.bind(this)
      );
    }
    console.log("[MosaicMaker] Initialized.");
  }

  /** Displays an error message and makes the error element visible. */
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

  /** Hides the error element, resetting its visibility. */
  hideError() {
    if (!this.errorElement) {
      console.warn(
        "[MosaicMaker] Unable to hide error, data-error element missing."
      );
      return;
    }
    this.errorElement.classList.remove("mosaic__error--visible");
  }

  /** Makes the output section visible to display the generated mosaic. */
  showOutput() {
    if (!this.outputElement) {
      console.warn(
        "[MosaicMaker] Unable to show output, data-output element missing."
      );
      return;
    }
    this.outputElement.classList.add("mosaic__output--visible");
  }

  /** Hides the output section. */
  hideOutput() {
    if (!this.outputElement) {
      console.warn(
        "[MosaicMaker] Unable to hide output, data-output element missing."
      );
      return;
    }
    this.outputElement.classList.remove("mosaic__output--visible");
  }

  /**
   * Creates a canvas element with the specified dimensions.
   * Ensures browser support for the canvas API.
   */
  createCanvas(width, height) {
    const canvas = document.createElement("canvas");
    if (canvas.getContext) {
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    throw new Error("Canvas not supported in your browser");
  }

  /**
   * Loads an image from a given URL and ensures it is fully loaded before returning.
   * Uses a Promise to handle asynchronous loading.
   */
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

  /** Retrieves and validates the tile dimensions input by the user. */
  getTileDimensions() {
    const width = parseInt(document.getElementById("tileWidth").value);
    const height = parseInt(document.getElementById("tileHeight").value);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new Error("Tiles should have positive dimensions.");
    }

    return { width, height };
  }

  /** Validates whether the tile dimensions are smaller than the image dimensions. */
  validateTileSize(image, tileWidth, tileHeight) {
    if (tileWidth > image.width || tileHeight > image.height) {
      throw new Error("Individual tiles should not be larger than the image.");
    }
  }

  /**
   * Handles image uploads, validates the file, and updates the UI to display the file name.
   * Generates the mosaic after validating the image and tile dimensions.
   */
  async handleImageUpload(event) {
    this.hideError();
    this.hideOutput();

    const file = event.target.files[0];
    const fileNameElement = document.querySelector("[data-filename]");

    // Update file name display or reset it if no file is selected
    if (!file) {
      if (fileNameElement) {
        fileNameElement.textContent = "No file selected";
        fileNameElement.classList.remove("mosaic__filename--visible");
      }
      return;
    }
    if (fileNameElement) {
      fileNameElement.textContent = file.name;
      fileNameElement.classList.add("mosaic__filename--visible");
    }

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
      URL.revokeObjectURL(url); // Clean up memory for the object URL
    }
  }

  /**
   * Handles regenerating the mosaic using the previously uploaded image.
   * Ensures the current image is valid and regenerates the mosaic.
   */
  async handleRegenerate() {
    if (!this.currentImage) {
      this.showError("No image available for regeneration.");
      return;
    }

    try {
      this.hideError();
      this.hideOutput();
      const { width: tileWidth, height: tileHeight } = this.getTileDimensions();
      this.validateTileSize(this.currentImage, tileWidth, tileHeight);
      await this.renderMosaic(this.currentImage, tileWidth, tileHeight);
    } catch (error) {
      this.showError(error.message);
    }
  }

  /**
   * Renders the mosaic on a canvas, creating and coloring tiles based on the input image.
   * Uses helper methods to create SVG tiles and apply colors from the image.
   */
  async renderMosaic(image, tileWidth, tileHeight) {
    const xTileCount = Math.floor(image.width / tileWidth);
    const yTileCount = Math.floor(image.height / tileHeight);
    const outputWidth = xTileCount * tileWidth;
    const outputHeight = yTileCount * tileHeight;

    const canvas = this.createCanvas(outputWidth, outputHeight);
    const context = canvas.getContext("2d");

    const svgTile = await this.createSvgTile(tileWidth, tileHeight);
    if (!svgTile) throw new Error("SVG tile could not be created.");

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

    this.outputElement.innerHTML = ""; // Clear previous content
    this.outputElement.appendChild(canvas);
    this.showOutput();
  }

  /** Creates an SVG tile as an image element that can be drawn on a canvas. */
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

  /** Draws SVG tiles repeatedly across the canvas to form a grid. */
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

  /**
   * Applies the image's colors to the tiles using a blend mode.
   * Uses a smaller canvas to scale down the image to fit the mosaic grid.
   */
  async colourTiles(canvas, context, image, xTileCount, yTileCount) {
    context.globalCompositeOperation = "source-in";

    const smallCanvas = this.createCanvas(xTileCount, yTileCount);
    const smallContext = smallCanvas.getContext("2d");

    smallContext.drawImage(image, 0, 0, xTileCount, yTileCount);

    context.imageSmoothingEnabled = false; // Disable smoothing for pixel-perfect scaling
    context.scale(canvas.width / xTileCount, canvas.height / yTileCount);
    context.drawImage(smallCanvas, 0, 0);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new MosaicMaker();
});
