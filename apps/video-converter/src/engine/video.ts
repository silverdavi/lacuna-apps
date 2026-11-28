// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface VideoProbe {
  width: number
  height: number
  duration: number
}

export function pickSupportedWebmMime(preferred: string): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm'
  const candidates = [
    preferred,
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].filter(Boolean)
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return 'video/webm'
}

export async function probeVideoFile(file: File): Promise<VideoProbe> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<VideoProbe>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.onloadedmetadata = () => {
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1.0
        resolve({
          width: video.videoWidth || 320,
          height: video.videoHeight || 180,
          duration: dur,
        })
      }
      video.onerror = () => reject(new Error(`Could not decode metadata for ${file.name}`))
      video.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function generateTestVideoFile(): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')!
  const mime = pickSupportedWebmMime('video/webm;codecs=vp8')
  const stream = canvas.captureStream(24)
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 600_000 })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }))
  })

  recorder.start()
  const totalFrames = 18
  for (let i = 0; i < totalFrames; i++) {
    ctx.fillStyle = 'rgb(28, 34, 46)'
    ctx.fillRect(0, 0, 320, 180)
    ctx.fillStyle = 'rgb(196, 77, 45)'
    ctx.fillRect(24 + i * 14, 56, 48, 48)
    ctx.fillStyle = 'rgb(245, 241, 232)'
    ctx.font = 'bold 12pt monospace'
    ctx.fillText(`LACUNA CLIP ${i + 1}/${totalFrames}`, 24, 152)
    await new Promise((r) => setTimeout(r, 35))
  }
  recorder.stop()
  const blob = await done
  return new File([blob], 'sample-clip.webm', { type: 'video/webm' })
}

export async function capturePosterPng(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('Could not load video frame'))
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, video.videoWidth || 320)
    canvas.height = Math.max(1, video.videoHeight || 180)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Poster encode failed'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function transcodeToWebm(
  file: File,
  opts: { maxHeight: number; codec: string; bitrate: number; mute: boolean },
): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Failed to load video'))
    })

    const srcW = video.videoWidth || 320
    const srcH = video.videoHeight || 180
    const scale = opts.maxHeight > 0 && srcH > opts.maxHeight ? opts.maxHeight / srcH : 1
    const outW = Math.max(2, Math.round((srcW * scale) / 2) * 2)
    const outH = Math.max(2, Math.round((srcH * scale) / 2) * 2)

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')!

    const stream = canvas.captureStream(24)
    const mime = pickSupportedWebmMime(opts.codec)
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: opts.bitrate,
    })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }))
    })

    recorder.start()
    await video.play()

    await new Promise<void>((resolve) => {
      let raf = 0
      const maxMs = Math.min(12000, Math.max(800, (Number.isFinite(video.duration) ? video.duration : 1.5) * 1000 + 400))
      const timer = setTimeout(() => {
        cancelAnimationFrame(raf)
        video.pause()
        resolve()
      }, maxMs)

      const draw = () => {
        ctx.drawImage(video, 0, 0, outW, outH)
        if (video.ended || video.paused) {
          clearTimeout(timer)
          resolve()
          return
        }
        raf = requestAnimationFrame(draw)
      }
      draw()
    })

    recorder.stop()
    return await stopped
  } finally {
    URL.revokeObjectURL(url)
  }
}
