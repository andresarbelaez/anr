export interface MetadataErrors {
  title?: string;
  artistName?: string;
  releaseDate?: string;
  genre?: string;
  coverArt?: string;
  tracks?: string;
}

export function validateReleaseMetadata(data: {
  title: string;
  artistName: string;
  releaseDate: string;
  genre: string;
}): MetadataErrors {
  const errors: MetadataErrors = {};

  if (!data.title.trim()) {
    errors.title = "Release title is required";
  } else if (data.title.length > 200) {
    errors.title = "Title must be under 200 characters";
  }

  if (!data.artistName.trim()) {
    errors.artistName = "Artist name is required";
  }

  if (!data.releaseDate) {
    errors.releaseDate = "Release date is required";
  } else {
    const date = new Date(data.releaseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      errors.releaseDate = "Release date must be in the future";
    }
  }

  if (!data.genre.trim()) {
    errors.genre = "Genre is required";
  }

  return errors;
}

export function validateCoverArt(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve("File must be an image (JPG or PNG)");
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      resolve("Cover art must be JPG or PNG format");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      resolve("Cover art must be under 20MB");
      return;
    }

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width < 1400 || img.height < 1400) {
        resolve(
          `Cover art must be at least 1400x1400px (got ${img.width}x${img.height})`
        );
      } else if (img.width !== img.height) {
        resolve("Cover art must be square (1:1 aspect ratio)");
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve("Could not read image file");
    };
    img.src = URL.createObjectURL(file);
  });
}

export const GENRES = [
  "Alternative",
  "Blues",
  "Classical",
  "Country",
  "Dance",
  "Electronic",
  "Folk",
  "Funk",
  "Gospel",
  "Hip-Hop/Rap",
  "Indie",
  "Jazz",
  "K-Pop",
  "Latin",
  "Metal",
  "Pop",
  "Punk",
  "R&B/Soul",
  "Reggae",
  "Reggaeton",
  "Rock",
  "Singer/Songwriter",
  "World",
] as const;
