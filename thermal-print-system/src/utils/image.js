const { Jimp } = require("jimp");

/**
 * Resize, convert to grayscale, and apply dithering to an image.
 *
 * @param {Buffer|string} inputBuffer - The input image buffer or file path.
 * @param {number} targetWidth - The target width to resize to (default 464px for 58mm printer).
 * @param {number} density - Density offset (-128 to 128). Defaults to 0.
 * @returns {Promise<Jimp>} A promise that resolves to the processed Jimp image instance.
 */
async function processImage(inputBuffer, targetWidth = 464, density = 0) {
    // Read the image using Jimp
    const image = await Jimp.read(inputBuffer);

    // Resize the image to the target width, maintaining aspect ratio
    image.resize({ w: targetWidth });

    // Convert the image to grayscale
    image.greyscale();

    const w = image.bitmap.width;
    const h = image.bitmap.height;

    // Floyd-Steinberg dithering implementation
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (w * y + x) << 2;
            const oldPixel = image.bitmap.data[idx];

            // Apply density shift
            const adjustedPixel = Math.max(0, Math.min(255, oldPixel + density));

            const newPixel = adjustedPixel < 128 ? 0 : 255;
            const quantError = adjustedPixel - newPixel;

            image.bitmap.data[idx] = newPixel;
            image.bitmap.data[idx + 1] = newPixel;
            image.bitmap.data[idx + 2] = newPixel;
            image.bitmap.data[idx + 3] = 255;

            // Propagate the error to neighboring pixels
            if (x + 1 < w) {
                const rightIdx = (w * y + (x + 1)) << 2;
                image.bitmap.data[rightIdx] = Math.max(0, Math.min(255, image.bitmap.data[rightIdx] + quantError * 7 / 16));
            }
            if (y + 1 < h) {
                if (x - 1 >= 0) {
                    const bottomLeftIdx = (w * (y + 1) + (x - 1)) << 2;
                    image.bitmap.data[bottomLeftIdx] = Math.max(0, Math.min(255, image.bitmap.data[bottomLeftIdx] + quantError * 3 / 16));
                }
                const bottomIdx = (w * (y + 1) + x) << 2;
                image.bitmap.data[bottomIdx] = Math.max(0, Math.min(255, image.bitmap.data[bottomIdx] + quantError * 5 / 16));

                if (x + 1 < w) {
                    const bottomRightIdx = (w * (y + 1) + (x + 1)) << 2;
                    image.bitmap.data[bottomRightIdx] = Math.max(0, Math.min(255, image.bitmap.data[bottomRightIdx] + quantError * 1 / 16));
                }
            }
        }
    }

    return image;
}

/**
 * Formats a processed Jimp image into an escpos-compatible Image object.
 * (escpos uses its own Image class, we just need to return the raw bitmap data if needed,
 * but escpos.Image can also take a Jimp object or a file path. We will save it to a temporary file
 * and let escpos read it, or return the jimp object directly).
 *
 * Wait, node-escpos uses an Image class that wraps Jimp or reads a file.
 * The best way is to let escpos handle the image reading, or pass it a Jimp object.
 */
module.exports = {
    processImage
};
