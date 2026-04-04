export const ACCEPTED_AUDIO_FORMATS = {
  "audio/wav": [".wav"],
  "audio/x-wav": [".wav"],
  "audio/mpeg": [".mp3"],
  "audio/flac": [".flac"],
  "audio/x-flac": [".flac"],
  "audio/aac": [".aac", ".m4a"],
  "audio/mp4": [".m4a"],
  "audio/ogg": [".ogg"],
} as const;

export const ACCEPTED_EXTENSIONS = [".wav", ".mp3", ".flac", ".aac", ".m4a", ".ogg"];
export const ACCEPTED_MIME_TYPES = Object.keys(ACCEPTED_AUDIO_FORMATS);
export const LOSSLESS_EXTENSIONS = [".wav", ".flac"];

export interface AudioValidationResult {
  valid: boolean;
  errors: string[];
  isLossless: boolean;
  metadata?: {
    sampleRate: number;
    bitDepth: number;
    channels: number;
    durationSeconds: number;
  };
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const MAX_WAV_SIZE = 50 * 1024 * 1024;

/**
 * Estimates WAV file size from duration.
 * Formula: duration * sampleRate * channels * (bitDepth/8) + 44 (header)
 * At 44.1kHz, 16-bit, stereo: ~10.6MB per minute
 */
export function estimateWavSize(durationSeconds: number): number {
  return Math.ceil(durationSeconds * 44100 * 2 * 2) + 44;
}

export const MAX_DURATION_SECONDS = Math.floor((MAX_WAV_SIZE - 44) / (44100 * 2 * 2)); // ~280 seconds (~4:40)

export function validateAudioFile(file: File): AudioValidationResult {
  const errors: string[] = [];
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const isLossless = LOSSLESS_EXTENSIONS.includes(ext);

  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    errors.push(
      `Unsupported format. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum of 50MB`
    );
  }

  if (file.size === 0) {
    errors.push("File is empty");
  }

  return { valid: errors.length === 0, errors, isLossless };
}

export async function parseWavHeader(
  file: File
): Promise<AudioValidationResult> {
  const errors: string[] = [];

  try {
    const buffer = await file.slice(0, 44).arrayBuffer();
    const view = new DataView(buffer);

    const riff = String.fromCharCode(
      view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
    );
    if (riff !== "RIFF") {
      return { valid: false, errors: ["Not a valid WAV file (missing RIFF header)"], isLossless: true };
    }

    const wave = String.fromCharCode(
      view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
    );
    if (wave !== "WAVE") {
      return { valid: false, errors: ["Not a valid WAV file (missing WAVE marker)"], isLossless: true };
    }

    const channels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitDepth = view.getUint16(34, true);
    const byteRate = view.getUint32(28, true);
    const durationSeconds = byteRate > 0 ? Math.round((file.size - 44) / byteRate) : 0;

    return {
      valid: errors.length === 0,
      errors,
      isLossless: true,
      metadata: { sampleRate, bitDepth, channels, durationSeconds },
    };
  } catch {
    return { valid: false, errors: ["Could not read WAV file header"], isLossless: true };
  }
}
