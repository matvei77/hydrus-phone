export const sortOptions = [
  [2, "Import date"],
  [14, "Modified date"],
  [19, "Archive date"],
  [18, "Last viewed"],
  [0, "File size"],
  [1, "Duration"],
  [5, "Width"],
  [6, "Height"],
  [8, "Resolution"],
  [7, "Aspect ratio"],
  [9, "Number of tags"],
  [3, "File type"],
  [4, "Random"],
] as const;

export const sortLabel = (id: number) =>
  sortOptions.find(([value]) => value === id)?.[1] ?? "Import date";
