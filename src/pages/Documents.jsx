/**
 * Documents.jsx
 * Full CRUD â€” upload, preview, download, delete
 * Files stored as base64 blobs in IndexedDB
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FolderOpen, Upload, Search, Download,
  Trash2, FileText, Image, File, Eye,
  X, CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react'
import schoolDataService from '../services/schoolDataService'
import useAppStore from '../store/useAppStore'
import { getStudents } from '../utils/dbHelpers'
import clsx from 'clsx'

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DOC_TYPES = [
  'Aadhar Card', 'Transfer Certificate', 'Birth Certificate',
  'Marksheet', 'Photo', 'Bonafide', 'Other',
]

const MAX_SIZE_MB = 10

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function FileIcon({ fileType, className = 'w-5 h-5' }) {
  if (fileType?.startsWith('image/'))
    return <Image className={clsx(className, 'text-blue-500')} />
  if (fileType === 'application/pdf')
    return <FileText className={clsx(className, 'text-red-500')} />
  return <File className={clsx(className, 'text-gray-500')} />
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

// â”€â”€ Preview Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PreviewModal({ doc, onClose }) {
  if (!doc) return null
  const isImage = doc.fileType?.startsWith('image/')
  const isPdf   = doc.fileType === 'application/pdf'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <FileIcon fileType={doc.fileType} />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[300px]">
                {doc.fileName}
              </p>
              <p className="text-xs text-gray-400">{formatSize(doc.fileSize ?? 0)} Â· {fmtDate(doc.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
          {isImage && (
            <img src={doc.blob} alt={doc.fileName}
              className="max-w-full max-h-[60vh] rounded-xl object-contain shadow" />
          )}
          {isPdf && (
            <iframe src={doc.blob} title={doc.fileName}
              className="w-full h-[60vh] rounded-xl border border-gray-200 dark:border-gray-700" />
          )}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <File className="w-16 h-16" />
              <p className="text-sm">Preview not available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <a href={doc.blob} download={doc.fileName}
            className="btn-primary text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Download
          </a>
        </div>
      </div>
    </div>
  )
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Documents() {
  const { currentInstituteId } = useAppStore()
  const instituteId = currentInstituteId || ''

  const [docs,       setDocs]       = useState([])
  const [students,   setStudents]   = useState([])
  const [loading,    setLoading]    = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [preview,    setPreview]    = useState(null)
  const [toast,      setToast]      = useState(null)

  // Upload form state
  const [selectedFile,    setSelectedFile]    = useState(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedType,    setSelectedType]    = useState(DOC_TYPES[0])
  const [showUploadForm,  setShowUploadForm]  = useState(false)

  // â”€â”€ Load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadDocs = useCallback(async () => {
    if (!instituteId) return
    setLoading(true)
    try {
      const rows = await schoolDataService.documents.list(instituteId)
      setDocs(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    } finally {
      setLoading(false)
    }
  }, [instituteId])

  const loadStudents = useCallback(async () => {
    if (!instituteId) return
    const rows = await getStudents(instituteId)
    setStudents(rows)
  }, [instituteId])

  useEffect(() => {
    loadDocs()
    loadStudents()
  }, [loadDocs, loadStudents])

  // â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // â”€â”€ Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleUpload = useCallback(async () => {
    if (!selectedFile) { showToast('Please select a file', 'error'); return }
    if (!selectedStudent) { showToast('Please select a student', 'error'); return }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`File too large. Max ${MAX_SIZE_MB}MB`, 'error'); return
    }

    setUploading(true)
    try {
      const base64 = await readFileAsBase64(selectedFile)
      const doc = await schoolDataService.documents.create({
        instituteId,
        studentId: selectedStudent,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        docType: selectedType,
        blob: base64,
      })
      setDocs(prev => [doc, ...prev])
      setSelectedFile(null)
      setSelectedStudent('')
      setShowUploadForm(false)
      showToast('Document uploaded successfully')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }, [selectedFile, selectedStudent, selectedType, instituteId, showToast])

  // â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleDelete = useCallback(async (docId, fileName) => {
    if (!confirm(`Delete "${fileName}"?`)) return
    await schoolDataService.documents.delete(docId)
    setDocs(prev => prev.filter(d => d.id !== docId))
    showToast('Document deleted')
  }, [showToast])

  // â”€â”€ Filtered list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(d => {
      const student = students.find(s => s.id === d.studentId)
      const name    = (student?.dynamicFields?.studentName ?? '').toLowerCase()
      if (q && !d.fileName.toLowerCase().includes(q) && !name.includes(q)) return false
      if (typeFilter !== 'All' && d.docType !== typeFilter) return false
      return true
    })
  }, [docs, students, search, typeFilter])

  // â”€â”€ No institute â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (!instituteId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">No institute found. Add one first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Documents</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {docs.length} document{docs.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        <button onClick={() => setShowUploadForm(p => !p)} className="btn-primary">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="card p-5 space-y-4 border-2 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Upload New Document</p>
            <button onClick={() => setShowUploadForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Student select */}
            <div>
              <label className="label text-xs">Student *</label>
              <select
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                className="input text-sm"
              >
                <option value="">â€” Select Student â€”</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.dynamicFields?.studentName ?? s.id} â€” {s.class}
                  </option>
                ))}
              </select>
            </div>

            {/* Doc type */}
            <div>
              <label className="label text-xs">Document Type *</label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="input text-sm"
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* File picker */}
            <div>
              <label className="label text-xs">File * (max {MAX_SIZE_MB}MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setSelectedFile(e.target.files[0] ?? null)}
                className="input text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary-50 file:text-primary-700"
              />
            </div>
          </div>

          {selectedFile && (
            <p className="text-xs text-gray-500">
              Selected: <strong>{selectedFile.name}</strong> ({formatSize(selectedFile.size)})
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowUploadForm(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleUpload} disabled={uploading} className="btn-primary text-sm">
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploadingâ€¦</>
                : <><Upload className="w-4 h-4" /> Upload</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Search + Type Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by file name or studentâ€¦"
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', ...DOC_TYPES].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                typeFilter === t
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">File</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Size</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                      <p className="text-gray-400 text-sm">
                        {docs.length === 0
                          ? 'No documents yet. Upload one above.'
                          : 'No documents match your search.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map(doc => {
                  const student = students.find(s => s.id === doc.studentId)
                  const studentName = student?.dynamicFields?.studentName ?? 'Unknown'
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <FileIcon fileType={doc.fileType} />
                          <span className="font-medium text-gray-900 dark:text-white text-xs truncate max-w-[180px]">
                            {doc.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{studentName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {doc.docType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell text-xs">
                        {formatSize(doc.fileSize ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell text-xs">
                        {fmtDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreview(doc)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = doc.blob
                              link.download = doc.fileName
                              link.click()
                            }}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.fileName)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {preview && <PreviewModal doc={preview} onClose={() => setPreview(null)} />}

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
        )}>
          {toast.type === 'error'
            ? <AlertTriangle className="w-4 h-4" />
            : <CheckCircle className="w-4 h-4 text-green-400 dark:text-green-600" />
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}




