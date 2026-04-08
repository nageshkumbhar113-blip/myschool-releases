import React from 'react'
import { X, Printer, FileText } from 'lucide-react'
import usePrintDocument from '../../hooks/usePrintDocument'
import LCDocumentLayout from './LCDocumentLayout'
import { getPageSizeConfig } from '../../utils/pageSizes'
import '../../styles/print.css'

export default function NewLCPreview({
  template,
  fields = [],
  student,
  settings,
  manualData = {},
  title,
  onClose,
}) {
  const { print } = usePrintDocument()
  const studentName = student?.dynamicFields?.studentName ?? 'Student'
  const { widthMm, heightMm } = getPageSizeConfig(template?.pageSize ?? 'A4')

  return (
    <>
      <div
        className="doc-print-root"
        style={{ '--print-page-width': widthMm, '--print-page-height': heightMm }}
      >
        <LCDocumentLayout
          template={template}
          fields={fields}
          student={student}
          settings={settings}
          manualData={manualData}
          title={title}
          mode="print"
        />
      </div>

      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm no-print"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="no-print shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {template?.name ?? 'Document Preview'}
              </span>
              <span className="text-xs text-gray-400">- {studentName}</span>
            </div>
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-300">
              Exact size साठी print dialog मध्ये `Margins: None` ठेवा आणि मग `Save as PDF` करा.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => print(template?.pageSize ?? 'A4')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="no-print flex-1 overflow-y-auto p-6 flex justify-center">
          <div style={{ width: '100%', maxWidth: 520 }}>
            <LCDocumentLayout
              template={template}
              fields={fields}
              student={student}
              settings={settings}
              manualData={manualData}
              title={title}
              mode="preview"
              showFrame
            />
          </div>
        </div>
      </div>
    </>
  )
}
