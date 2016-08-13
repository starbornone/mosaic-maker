var showError = function (message) {
    var element = document.getElementById('error');
    element.innerHTML = message;
    element.className = 'visible';
};

var hideError = function () {
    var element = document.getElementById('error');
    element.className = 'hidden';
};

/**
 * @function photoMosaic
 */
var photoMosaic = function () {
    'use strict';

    /**
     * @function renderMosaic
     */
    var renderMosaic = function (tileWidth, tileHeight) {
        URL.revokeObjectURL(url);

        /**
         * @function createCanvas
         * @param {number} width The width of the new canvas.
         * @param {number} height The height of the new canvas.
         */
        var createCanvas = function (width, height) {
            var canvas = document.createElement('canvas');
            if (canvas.getContext) {
                canvas.width = width;
                canvas.height = height;
                return canvas;
            }
        };

        /**
         * @function renderByRow
         */
        var renderByRow = function () {
            if (imageRow < canvas.height) {
                requestAnimationFrame(renderByRow)
            }
            inScreenContext.drawImage(canvas, 0, imageRow, canvas.width, tileHeight, 0, imageRow, canvas.width,
                tileHeight);
            imageRow += tileHeight;
        };

        /**
         * @function pushToDoc
         */
        var pushToDoc = function () {
            document.getElementById('mosaicOutput').innerHTML = '';
            document.getElementById('mosaicOutput').appendChild(inScreen);
        };

        /**
         * @desc Generate coloured tiles by creating a canvas for each tile, resizing the source so that it fits that
         * tile. The browser's image smoothing assists with getting the average colour. However, this will only work
         * with more modern browsers.
         * @function colourTiles
         */
        var colourTiles = function () {
            context.globalCompositeOperation = 'source-in';
            var smallCanvas = canvas.cloneNode(true);
            smallCanvas.width = Math.floor(xTileCount);
            smallCanvas.height = Math.floor(yTileCount);
            var smallContext = smallCanvas.getContext('2d');
            smallContext.drawImage(image, 0, 0, smallCanvas.width, smallCanvas.height);
            context.mozImageSmoothingEnabled = false;
            context.webkitImageSmoothingEnabled = false;
            context.msImageSmoothingEnabled = false;
            context.imageSmoothingEnabled = false;
            context.scale(tileWidth, tileHeight);
            context.drawImage(smallCanvas, 0, 0);
        };

        /**
         * @desc Generate an initial set of tiles to fill the image.
         * @function generateTiles
         */
        var generateTiles = function () {
            for (var y = 0; y < image.height; y += tileHeight) {
                for (var x = 0; x < image.width; x += tileWidth) {
                    context.drawImage(svgTile, x, y)
                }
            }
        };

        /**
         * @desc Calculate the number of tiles there will be per row and column, then determine the final width and
         * height (it differs from the original image because the width and/or height of the uploaded image may not
         * be divisible by the given tile sixes). Then create an off-screen canvas and an on-screen canvas and begin
         * generating the tiles as SVGs.
         * @param {number} xTileCount The number of tiles that fit within the uploaded image on the X axis
         * @param {number} yTileCount The number of tiles that fit within the uploaded image on the Y axis
         * @param {number} outputWidth The width of the canvas that fits the entire mosaic.
         * @param {number} outputHeight The height of the canvas that fits the entire mosaic.
         * @param {Element} canvas Create canvas.
         * @param {CanvasRenderingContext2D} context
         * @param {Node} inScreen
         * @param {CanvasRenderingContext2D} inScreenContext
         * @param {number} imageRow A counter to handle the current row when running renderByRow().
         * @param svgShape
         * @param svgData
         */
        var xTileCount = Math.floor(image.width / tileWidth);
        var yTileCount = Math.floor(image.height / tileHeight);
        var outputWidth = image.width - (image.width % tileWidth);
        var outputHeight = image.height - (image.height % tileHeight);
        var canvas = createCanvas(outputWidth, outputHeight);
        var context = canvas.getContext('2d');
        var inScreen = canvas.cloneNode(true);
        var inScreenContext = inScreen.getContext('2d');
        var imageRow = 0;

        var svgTile = new Image();
        var svgTileData = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="' + tileWidth + '" height="'
            + tileHeight + '">' +
            '<ellipse cx="50%" cy="50%" rx="50%" ry="50%"></ellipse>' +
            '</svg>';
        svgTile.onload = function () {
            generateTiles();
            colourTiles();
            pushToDoc();
            renderByRow();
        };
        svgTile.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(svgTileData)
    };

    /**
     * @param url
     * @param image
     */
    var url = URL.createObjectURL(this.files[0]);
    var image = new Image();
    image.onload = function () {
        /**
         * @param {Number} tileWidth
         * @param {Number} tileHeight
         */
        var tileWidth = parseInt(document.getElementById('tileWidth').value);
        var tileHeight = parseInt(document.getElementById('tileHeight').value);
        if (tileWidth <= 0 || tileHeight <= 0) {
            showError('Tiles should be larger than 0.');
        }
        else if (tileWidth > image.width || tileHeight > image.height) {
            showError('Individual tiles should not be larger than the image.');
        } else {
            hideError();
            renderMosaic(tileWidth, tileHeight);
        }
    };
    image.src = url;
};

/**
 * @desc Image upload triggers photo mosaic process.
 */
window.onload = function () {
    document.getElementById('imageInput').onchange = photoMosaic
};