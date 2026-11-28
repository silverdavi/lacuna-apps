// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface TrimOptions {
  startSec: number
  endSec: number
  fadeInMs: number
  fadeOutMs: number
  speed: number
  reverse: boolean
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

export function encodePcm16Wav(channels: Float32Array[], sampleRate: number): Uint8Array {
  const numChannels = channels.length
  const numFrames = channels[0]?.length ?? 0
  const dataSize = numFrames * numChannels * 2
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch]![i] ?? 0))
      view.setInt16(offset, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true)
      offset += 2
    }
  }
  return new Uint8Array(buf)
}

export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  try {
    const arr = await file.arrayBuffer()
    return await ctx.decodeAudioData(arr.slice(0))
  } finally {
    await ctx.close()
  }
}

export function generateSampleMelodyFile(): File {
  const sr = 44100
  const duration = 2.4
  const len = Math.floor(sr * duration)
  const mono = new Float32Array(len)
  const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63]
  const noteLen = Math.floor(len / notes.length)

  notes.forEach((freq, idx) => {
    const start = idx * noteLen
    for (let i = 0; i < noteLen && start + i < len; i++) {
      const t = i / sr
      const env = Math.min(1, i / 400) * Math.max(0, 1 - i / noteLen)
      mono[start + i] = Math.sin(2 * Math.PI * freq * t) * 0.65 * env
    }
  })

  const wav = encodePcm16Wav([mono], sr)
  return new File([wav as BlobPart], 'sample-melody.wav', { type: 'audio/wav' })
}

export function computePeaks(buffer: AudioBuffer, bars = 120): number[] {
  const ch = buffer.getChannelData(0)
  const blockSize = Math.max(1, Math.floor(ch.length / bars))
  const peaks: number[] = []
  for (let b = 0; b < bars; b++) {
    let max = 0
    const start = b * blockSize
    const end = Math.min(ch.length, start + blockSize)
    for (let i = start; i < end; i++) {
      const v = Math.abs(ch[i]!)
      if (v > max) max = v
    }
    peaks.push(max)
  }
  return peaks
}

export function trimAudioBuffer(buffer: AudioBuffer, opts: TrimOptions): Blob {
  const sr = buffer.sampleRate
  const startSample = Math.max(0, Math.min(buffer.length - 1, Math.floor(opts.startSec * sr)))
  const endSample = Math.max(startSample + 1, Math.min(buffer.length, Math.floor(opts.endSec * sr)))
  const sliceLen = endSample - startSample
  const speed = Math.max(0.25, Math.min(4, opts.speed))
  const outLen = Math.max(1, Math.floor(sliceLen / speed))

  const fadeInSamples = Math.min(outLen, Math.floor((opts.fadeInMs / 1000) * sr))
  const fadeOutSamples = Math.min(outLen, Math.floor((opts.fadeOutMs / 1000) * sr))

  const channels: Float32Array[] = []
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch)
    const dst = new Float32Array(outLen)
    for (let i = 0; i < outLen; i++) {
      const srcIdx = Math.min(endSample - 1, startSample + Math.floor(i * speed))
      dst[i] = src[srcIdx] ?? 0
    }
    if (opts.reverse) dst.reverse()

    for (let i = 0; i < fadeInSamples; i++) {
      dst[i] = dst[i]! * (i / Math.max(1, fadeInSamples))
    }
    for (let i = 0; i < fadeOutSamples; i++) {
      const pos = outLen - 1 - i
      dst[pos] = dst[pos]! * (i / Math.max(1, fadeOutSamples))
    }
    channels.push(dst)
  }

  const wav = encodePcm16Wav(channels, sr)
  return new Blob([wav as BlobPart], { type: 'audio/wav' })
}
