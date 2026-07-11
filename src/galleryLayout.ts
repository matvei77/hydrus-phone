import type { Media } from "./types";

export type GalleryLayoutItem = {
  fileId: number;
  index: number;
  ratio: number;
  width: number;
};

export type GalleryLayoutRow = {
  height: number;
  items: GalleryLayoutItem[];
};

export function mediaAspectRatio(media?: Pick<Media, "width" | "height">) {
  if (!media?.width || !media.height) return 1;
  return Math.max(0.35, Math.min(4, media.width / media.height));
}

export function buildJustifiedRows(
  fileIds: number[],
  media: Map<number, Media>,
  containerWidth: number,
  targetHeight: number,
  gap = 8,
) {
  const rows: GalleryLayoutRow[] = [];
  let pending: Omit<GalleryLayoutItem, "width">[] = [];
  let ratioTotal = 0;

  const closeRow = (last: boolean) => {
    if (!pending.length) return;
    const available = Math.max(1, containerWidth - gap * (pending.length - 1));
    const fittedHeight = available / ratioTotal;
    const height = last ? Math.min(targetHeight, fittedHeight) : fittedHeight;
    rows.push({
      height,
      items: pending.map((item) => ({ ...item, width: item.ratio * height })),
    });
    pending = [];
    ratioTotal = 0;
  };

  fileIds.forEach((fileId, index) => {
    const ratio = mediaAspectRatio(media.get(fileId));
    pending.push({ fileId, index, ratio });
    ratioTotal += ratio;
    const projected = ratioTotal * targetHeight + gap * (pending.length - 1);
    if (projected >= containerWidth) closeRow(false);
  });
  closeRow(true);
  return rows;
}
