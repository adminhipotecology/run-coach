'use client'

import { useState, useRef } from 'react'

interface GarminUploadProps {
  onRunParsed: (runData: Record<string, unknown>) => void
}

export default function GarminUpload({ onRunParsed }: GarminUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setIsUploading(true)
    setStatus('Parsing...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-garmin', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus(`Error: ${data.error}`)
        return
      }

      setStatus(`Parsed: ${data.run.stats.distance} km, ${data.run.stats.time}`)
      onRunParsed(data.run)
    } catch {
      setStatus('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div className="garmin-upload">
      <div
        className={`garmin-dropzone ${isDragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <svg className="garmin-dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="garmin-dropzone-text">
          {isUploading ? 'Processing...' : 'Drop your Garmin file here'}
        </div>
        <div className="garmin-dropzone-hint">.FIT or .CSV files</div>
        <input
          ref={inputRef}
          type="file"
          accept=".fit,.csv"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>

      {status && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: status.startsWith('Error') ? 'var(--z5)' : 'var(--z2)',
          textAlign: 'center',
        }}>
          {status}
        </div>
      )}
    </div>
  )
}
