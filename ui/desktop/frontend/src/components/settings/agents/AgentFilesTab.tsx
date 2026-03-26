import { useState, useEffect, useCallback } from 'react'
import { getWsClient } from '../../../lib/ws'
import type { BootstrapFile } from '../../../types/agent'

interface AgentFilesTabProps {
  agentKey: string
  agentType: string
}

export function AgentFilesTab({ agentKey, agentType }: AgentFilesTabProps) {
  const [files, setFiles] = useState<BootstrapFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [fileLoading, setFileLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Load file list
  useEffect(() => {
    const ws = getWsClient()
    setLoading(true)
    ws.call('agents.files.list', { agentId: agentKey })
      .then((res: unknown) => {
        const r = res as { files?: BootstrapFile[] }
        const fileList = (r?.files ?? []).filter((f) =>
          f.name !== 'MEMORY.json' &&
          !(agentType === 'predefined' && f.name === 'BOOTSTRAP.md'),
        )
        setFiles(fileList)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentKey, agentType])

  // Load file content when selected
  const loadFile = useCallback(async (name: string) => {
    setFileLoading(true)
    try {
      const ws = getWsClient()
      const res = (await ws.call('agents.files.get', { agentId: agentKey, name })) as { file?: BootstrapFile }
      setContent(res?.file?.content ?? '')
      setDirty(false)
    } catch {
      setContent('')
    } finally {
      setFileLoading(false)
    }
  }, [agentKey])

  useEffect(() => {
    if (selectedFile) loadFile(selectedFile)
  }, [selectedFile, loadFile])

  const handleSave = async () => {
    if (!selectedFile) return
    setSaving(true)
    try {
      const ws = getWsClient()
      await ws.call('agents.files.set', { agentId: agentKey, name: selectedFile, content })
      setDirty(false)
    } catch (err) {
      console.error('Failed to save file:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-text-muted py-4">Loading files...</p>
  }

  return (
    <div className="flex h-[500px] gap-3">
      {/* File sidebar */}
      <div className="w-48 shrink-0 rounded-lg border border-border overflow-y-auto">
        {files.map((file) => (
          <button
            key={file.name}
            onClick={() => setSelectedFile(file.name)}
            className={[
              'w-full text-left px-3 py-2 text-xs border-b border-border last:border-b-0 transition-colors',
              selectedFile === file.name
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-text-secondary hover:bg-surface-tertiary',
              file.missing ? 'opacity-50' : '',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="truncate">{file.name}</span>
            </div>
            {file.missing && (
              <span className="text-[10px] text-text-muted ml-5.5 block">Not created</span>
            )}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0 rounded-lg border border-border overflow-hidden">
        {selectedFile ? (
          <>
            {/* Editor header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-tertiary/30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">{selectedFile}</span>
                {dirty && <span className="text-[10px] text-warning">Unsaved</span>}
              </div>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="px-3 py-1 text-[11px] bg-accent text-white rounded-md font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Textarea */}
            {fileLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setDirty(true) }}
                className="flex-1 bg-surface-primary px-3 py-3 text-xs font-mono text-text-primary leading-relaxed resize-none focus:outline-none"
                spellCheck={false}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-text-muted">Select a file to edit</p>
          </div>
        )}
      </div>
    </div>
  )
}
