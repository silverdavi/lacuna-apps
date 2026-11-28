// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type AudioOutputFormat = 'wav-16' | 'wav-24' | 'wav-32f' | 'pcm-16'

export interface AudioConvertOptions {
  format: AudioOutputFormat
  sampleRate: number
  channels: 1 | 2
  normalize: boolean
  reverse: boolean
}

export interface DecodedAudio {
  name: string
  buffer: AudioBuffer
  inputBytes: number
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

function encodeWavFromChannels(
  channels: Float32Array[],
  sampleRate: number,
  format: AudioOutputFormat,
): Uint8Array {
  const numChannels = channels.length
  const numFrames = channels[0]?.length ?? 0
  const bytesPerSample = format === 'wav-32f' ? 4 : format === 'wav-24' ? 3 : 2
  const dataSize = numFrames * numChannels * bytesPerSample

  const headerSize = format === 'pcm-16' ? 0 : 44
  const buf = new ArrayBuffer(headerSize + dataSize)
  const view = new DataView(buf)

  if (headerSize === 44) {
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(view, 8, 'WAVE')
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, format === 'wav-32f' ? 3 : 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
    view.setUint16(32, numChannels * bytesPerSample, true)
    view.setUint16(34, bytesPerSample * 8, true)
    writeString(view, 36, 'data')
    view.setUint32(40, dataSize, true)
  }

  let offset = headerSize
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch]![i] ?? 0))
      if (format === 'wav-32f') {
        view.setFloat32(offset, sample, true)
        offset += 4
      } else if (format === 'wav-24') {
        const v = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff)
        view.setUint8(offset, v & 0xff)
        view.setUint8(offset + 1, (v >> 8) & 0xff)
        view.setUint8(offset + 2, (v >> 16) & 0xff)
        offset += 3
      } else {
        view.setInt16(offset, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff), true)
        offset += 2
      }
    }
  }
  return new Uint8Array(buf)
}

export async function decodeAudioFile(file: File): Promise<DecodedAudio> {
  const ctx = new AudioContext()
  try {
    const arr = await file.arrayBuffer()
    const buffer = await ctx.decodeAudioData(arr.slice(0))
    return { name: file.name, buffer, inputBytes: file.size }
  } finally {
    await ctx.close()
  }
}

export async function generateSampleAudioFile(): Promise<File> {
  const sampleRate = 44100
  const duration = 1.6
  const length = Math.floor(sampleRate * duration)
  const left = new Float32Array(length)
  const right = new Float32Array(length)
  const freqs = [261.63, 329.63, 392.0, 523.25] // C major chord

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const env = Math.min(1, t / 0.05) * Math.max(0, 1 - t / duration)
    let sumL = 0
    let sumR = 0
    freqs.forEach((f, idx) => {
      const s = Math.sin(2 * Math.PI * f * t) * 0.2
      sumL += s * (idx % 2 === 0 ? 1 : 0.7)
      sumR += s * (idx % 2 === 1 ? 1 : 0.7)
    })
    left[i] = sumL * env
    right[i] = sumR * env
  }
  const wavBytes = encodeWavFromChannels([left, right], sampleRate, 'wav-16')
  return new File([wavBytes as BlobPart], 'sample-chord.wav', { type: 'audio/wav' })
}

export async function transcodeAudio(
  decoded: DecodedAudio,
  opts: AudioConvertOptions,
): Promise<{ blob: Blob; filename: string; mime: string }> {
  const targetLen = Math.max(1, Math.round(decoded.buffer.duration * opts.sampleRate))
  const offline = new OfflineAudioContext(opts.channels, targetLen, opts.sampleRate)
  const src = offline.createBufferSource()
  src.buffer = decoded.buffer
  src.connect(offline.destination)
  src.start(0)
  const rendered = await offline.startRendering()

  const channels: Float32Array[] = []
  let peak = 0
  for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
    const data = rendered.getChannelData(ch).slice()
    if (opts.reverse) data.reverse()
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]!)
      if (a > peak) peak = a
    }
    channels.push(data)
  }

  if (opts.normalize && peak > 0.0001) {
    const gain = 0.891 / peak // -1 dBFS
    for (const ch of channels) {
      for (let i = 0; i < ch.length; i++) ch[i] = ch[i]! * gain
    }
  }

  const bytes = encodeWavFromChannels(channels, opts.sampleRate, opts.format)
  const ext = opts.format === 'pcm-16' ? 'pcm' : 'wav'
  const mime = opts.format === 'pcm-16' ? 'application/octet-stream' : 'audio/wav'
  const base = decoded.name.replace(/\.[^.]+$/, '') || 'audio'
  return {
    blob: new Blob([bytes as BlobPart], { type: mime }),
    filename: `${base}-${Math.round(opts.sampleRate / 1000)}k.${ext}`,
    mime,
  }
}
