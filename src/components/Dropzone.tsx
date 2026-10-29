import { useRef, useState, type DragEvent } from 'react'

interface Props {
  onFile: (file: File) => void
}

export function Dropzone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // Ignore "leave" events fired when the cursor moves over child elements.
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setDragging(false)
  }

  return (
    <div
      className={`dropzone${dragging ? ' is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <svg className="dropzone-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <p className="dropzone-title">Przeciągnij tutaj plik PDF</p>
      <p className="muted">albo</p>
      <button type="button" className="button primary" onClick={() => inputRef.current?.click()}>
        Wybierz plik z dysku
      </button>
      <p className="muted small">Tylko PDF, maksymalnie 10 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          handleFiles(event.target.files)
          // Allow choosing the same file again after an error.
          event.target.value = ''
        }}
      />
    </div>
  )
}
