# Mosaic Maker

Mosaic Maker builds a mosaic in the browser from an image you choose. Open `index.html`, set the tile width and height, and upload an image. The image stays on your machine.

Tile width and height are source pixels. Each tile covers a block of that size and takes the average colour of the block. The tile shape is an ellipse. When the image width or height does not divide evenly by the tile size, the leftover edge is left out, and the page reports how many pixels were used and how many were cropped.

The code is licensed under [CC BY-SA 4.0](LICENSE.md). Lexend is included under the [SIL Open Font License](fonts/OFL.txt).

Run `node --test` to check the tile math and the regenerate flow.
