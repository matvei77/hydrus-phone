import sharp from "sharp";

for (const size of [192, 512]) {
  await sharp("public/icon.svg")
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(`public/icon-${size}.png`);
}
