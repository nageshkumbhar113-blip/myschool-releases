import React from 'react'
import { X, Printer, FileText } from 'lucide-react'
import usePrintDocument from '../hooks/usePrintDocument'
import '../styles/print.css'

function Row({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 border-b border-gray-200 px-4 py-2 text-sm">
      <span className="font-medium text-gray-600">{label}</span>
      <span className="text-gray-900">{String(value)}</span>
    </div>
  )
}

export default function AdmissionFormPreview({
  student,
  fee,
  settings,
  fields = [],
  onClose,
}) {
  const { print } = usePrintDocument()
  const dynamicFields = student?.dynamicFields ?? {}
  const schoolName = settings?.schoolName ?? 'School'
  const schoolAddress = settings?.address ?? ''
  const photo = dynamicFields.photo ?? null
  const studentName = dynamicFields.studentName ?? 'Student'
  const primaryRows = [
    ['Student Name', dynamicFields.studentName],
    ['Date of Birth', dynamicFields.dateOfBirth],
    ['Gender', dynamicFields.gender],
    ['Student ID', dynamicFields.studentId],
    ['UID (Adhar No)', dynamicFields.uidAadharNo],
    ['Mother Tongue', dynamicFields.motherTongue],
    ['Reg. No.', dynamicFields.resistorNo],
    ['Roll Number', student?.rollNumber],
    ['Class', student?.class],
    ['Medium', student?.medium],
    ['Board', student?.board],
    ['Academic Year', student?.academicYear],
    ['Status', student?.status],
  ]

  return (
    <>
      <div
        className="doc-print-root"
        style={{ '--print-page-width': '210mm', '--print-page-height': '297mm' }}
      >
        <div
          style={{
            width: '210mm',
            minHeight: '297mm',
            background: '#fff',
            color: '#000',
            fontFamily: 'Georgia, "Times New Roman", serif',
            boxSizing: 'border-box',
            padding: '12mm',
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: '8mm', marginBottom: '8mm' }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{schoolName}</div>
            {schoolAddress && <div style={{ fontSize: 12, marginTop: 4 }}>{schoolAddress}</div>}
            {settings?.phone && <div style={{ fontSize: 11, marginTop: 4 }}>Phone: {settings.phone}</div>}
            <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>ADMISSION FORM</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: photo ? '1fr 110px' : '1fr', gap: '8mm', marginBottom: '8mm' }}>
            <div style={{ border: '1px solid #d1d5db' }}>
              {primaryRows.map(([label, value]) => (
                <Row key={label} label={label} value={value} />
              ))}
            </div>

            {photo && (
              <div style={{ border: '1px solid #d1d5db', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={photo} alt={studentName} style={{ width: '100%', height: 'auto', maxHeight: 130, objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {fields.length > 0 && (
            <div style={{ border: '1px solid #d1d5db', marginBottom: '8mm' }}>
              <div style={{ padding: '8px 12px', background: '#f3f4f6', fontSize: 12, fontWeight: 700, letterSpacing: 0.6 }}>
                PERSONAL INFORMATION
              </div>
              {fields.map((field) => (
                <Row key={field.id} label={field.label} value={dynamicFields[field.key]} />
              ))}
            </div>
          )}

          <div style={{ border: '1px solid #d1d5db', marginBottom: '12mm' }}>
            <div style={{ padding: '8px 12px', background: '#f3f4f6', fontSize: 12, fontWeight: 700, letterSpacing: 0.6 }}>
              FEE DETAILS
            </div>
            <Row label="Total Fee" value={fee?.totalFee} />
            <Row label="Discount" value={fee?.discount} />
            <Row label="Effective Fee" value={fee?.effectiveFee} />
            <Row label="Paid Amount" value={fee?.paidAmount} />
            <Row label="Remaining Amount" value={fee?.remainingAmount} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20mm', fontSize: 12 }}>
            <div style={{ width: 180, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: 8 }}>Parent Signature</div>
            </div>
            <div style={{ width: 180, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: 8 }}>School Authority</div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm no-print"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Admission Form</span>
              <span className="text-xs text-gray-400">- {studentName}</span>
            </div>
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-300">
              Print dialog मध्ये `Margins: None` ठेवा आणि मग `Save as PDF` करा.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={print}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
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
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-5 text-center">
              <h3 className="text-2xl font-bold text-gray-900">{schoolName}</h3>
              {schoolAddress && <p className="mt-1 text-sm text-gray-500">{schoolAddress}</p>}
              <p className="mt-3 text-lg font-semibold tracking-wide text-gray-900">ADMISSION FORM</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-[1fr_140px]">
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {primaryRows.map(([label, value]) => (
                    <Row key={label} label={label} value={value} />
                  ))}
                </div>
                {photo && (
                  <div className="rounded-xl border border-gray-200 p-2">
                    <img src={photo} alt={studentName} className="h-full w-full rounded-lg object-cover" />
                  </div>
                )}
              </div>

              {fields.length > 0 && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold tracking-wider text-gray-500">PERSONAL INFORMATION</div>
                  {fields.map((field) => (
                    <Row key={field.id} label={field.label} value={dynamicFields[field.key]} />
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold tracking-wider text-gray-500">FEE DETAILS</div>
                <Row label="Total Fee" value={fee?.totalFee} />
                <Row label="Discount" value={fee?.discount} />
                <Row label="Effective Fee" value={fee?.effectiveFee} />
                <Row label="Paid Amount" value={fee?.paidAmount} />
                <Row label="Remaining Amount" value={fee?.remainingAmount} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
