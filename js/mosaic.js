/**
 * @function photoMosaic
 */
var photoMosaic = function ()
{
    'use strict';

    /**
     * @function renderMosaic
     */
    var renderMosaic = function ()
    {
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
        var renderByRow = function ()
        {
            if (imageRow < canvas.height)
            {
                requestAnimationFrame(renderByRow)
            }
            inScreenContext.drawImage(canvas, 0, imageRow, canvas.width, TILE_HEIGHT, 0, imageRow, canvas.width, TILE_HEIGHT);
            imageRow += TILE_HEIGHT;
        };

        /**
         * @function pushToDoc
         */
        var pushToDoc = function ()
        {
            document.getElementById('mosaicOutput').innerHTML = '';
            document.getElementById('mosaicOutput').appendChild(inScreen);
        };

        /**
         * @desc Generate coloured tiles by creating a canvas for each tile, resizing the source so that it fits that
         * tile. The browser's image smoothing assists with getting the average colour. However, this will only work
         * with more modern browsers.
         * @function colourTiles
         * @param {Node} smallCanvas
         * @param {CanvasRenderingContext2D} smallContext
         */
        var colourTiles = function ()
        {
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
            context.scale(TILE_WIDTH, TILE_HEIGHT);
            context.drawImage(smallCanvas, 0, 0);
        };

        /**
         * @desc Generate an initial set of tiles to fill the image.
         * @function generateTiles
         */
        var generateTiles = function ()
        {
            for (var y = 0; y < image.height; y += TILE_HEIGHT)
            {
                for (var x = 0; x < image.width; x += TILE_WIDTH)
                {
                    context.drawImage(svgTile, x, y)
                }
            }
        };

        /**
         * @desc Calculate the number of tiles there will be per row and column, then determine the final width and
         * height (it differs from the original image because the width and/or height of the uploaded image may not be
         * divisible by the given tile sixes). Then create an off-screen canvas and an on-screen canvas and begin
         * generating the tiles as SVGs.
         * @param {number} TILE_WIDTH
         * @param {number} TILE_HEIGHT
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
        var TILE_WIDTH = parseInt(document.getElementById('tileWidth').value);
        var TILE_HEIGHT = parseInt(document.getElementById('tileHeight').value);
        var xTileCount = Math.floor(image.width / TILE_WIDTH);
        var yTileCount = Math.floor(image.height / TILE_HEIGHT);
        var outputWidth = image.width - (image.width % TILE_WIDTH);
        var outputHeight = image.height - (image.height % TILE_HEIGHT);
        var canvas = createCanvas(outputWidth, outputHeight);
        var context = canvas.getContext('2d');
        var inScreen = canvas.cloneNode(true);
        var inScreenContext = inScreen.getContext('2d');
        var imageRow = 0;

        var svgTile = new Image();
        var svgTileData = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="' + TILE_WIDTH + '" height="' + TILE_HEIGHT + '">' +
            '<ellipse cx="50%" cy="50%" rx="50%" ry="50%"></ellipse>' +
            '</svg>';
        svgTile.onload = function ()
        {
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
    image.onload = renderMosaic;
    image.src = url;
};

/**
 * @desc Image upload triggers photo mosaic process.
 */
window.onload = function ()
{
    document.getElementById('imageInput').onchange = photoMosaic
};