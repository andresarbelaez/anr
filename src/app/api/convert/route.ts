import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { MAX_WAV_SIZE } from "@/lib/utils/audio-validation";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export async function POST(request: Request) {
  const inputPath = join(tmpdir(), `input-${randomUUID()}`);
  const outputPath = join(tmpdir(), `output-${randomUUID()}.wav`);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 500MB)" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(44100)
        .audioChannels(2)
        .audioCodec("pcm_s16le")
        .format("wav")
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .save(outputPath);
    });

    const wavBuffer = await readFile(outputPath);

    if (wavBuffer.length > MAX_WAV_SIZE) {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
      return NextResponse.json(
        {
          error: `Converted WAV is ${(wavBuffer.length / 1024 / 1024).toFixed(1)}MB, which exceeds the 50MB storage limit. Try a shorter track or lower quality source.`,
        },
        { status: 413 }
      );
    }

    const duration = await new Promise<number>((resolve) => {
      ffmpeg.ffprobe(outputPath, (err, metadata) => {
        resolve(err ? 0 : Math.round(metadata.format.duration || 0));
      });
    });

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return new NextResponse(wavBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "X-Duration-Seconds": String(duration),
        "X-Original-Format": file.type || "unknown",
      },
    });
  } catch (err) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    console.error("Conversion error:", err);
    return NextResponse.json(
      { error: "Failed to convert audio file" },
      { status: 500 }
    );
  }
}
