// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

function writeStr(view: DataView, off: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
}

function encodeWav16(channels: Float32Array[], sr: number): Uint8Array {
  const numCh = channels.length
  const frames = channels[0]?.length ?? 0
  const dataSize = frames * numCh * 2
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)
  writeStr(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(view, 8, 'WAVE')
  writeStr(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numCh, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * numCh * 2, true)
  view.setUint16(32, numCh * 2, true)
  view.setUint16(34, 16, true)
  writeStr(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c]![i] ?? 0))
      view.setInt16(offset, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true)
      offset += 2
    }
  }
  return new Uint8Array(buf)
}

export async function extractAudioFromMedia(
  file: File,
  opts: { sampleRate: number; channels: 1 | 2; normalize: boolean },
): Promise<{ blob: Blob; duration: number; filename: string }> {
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    const arr = await file.arrayBuffer()
    decoded = await ctx.decodeAudioData(arr.slice(0))
  } finally {
    await ctx.close()
  }

  const outLen = Math.max(1, Math.round(decoded.duration * opts.sampleRate))
  const offline = new OfflineAudioContext(opts.channels, outLen, opts.sampleRate)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start(0)
  const rendered = await offline.startRendering()

  const chs: Float32Array[] = []
  let peak = 0
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    const data = rendered.getChannelData(c).slice()
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]!)
      if (a > peak) peak = a
    }
    chs.push(data)
  }
  if (opts.normalize && peak > 0.0001) {
    const gain = 0.891 / peak
    for (const ch of chs) {
      for (let i = 0; i < ch.length; i++) ch[i] = ch[i]! * gain
    }
  }

  const wavBytes = encodeWav16(chs, opts.sampleRate)
  const base = file.name.replace(/\.[^.]+$/, '') || 'extracted-audio'
  return {
    blob: new Blob([wavBytes as BlobPart], { type: 'audio/wav' }),
    duration: decoded.duration,
    filename: `${base}.wav`,
  }
}

export function generateDemoMediaAudio(): File {
  const sr = 44100
  const len = Math.floor(sr * 1.4)
  const data = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const t = i / sr
    const env = Math.min(1, t / 0.04) * Math.max(0, 1 - t / 1.4)
    data[i] = (Math.sin(2 * Math.PI * 330 * t) * 0.4 + Math.sin(2 * Math.PI * 440 * t) * 0.3) * env
  }
  const wav = encodeWav16([data], sr)
  return new File([wav as BlobPart], 'interview-clip.wav', { type: 'audio/wav' })
}
