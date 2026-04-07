import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Loader2, AlertCircle, User, BookOpen, CreditCard, Image as ImageIcon } from 'lucide-react'
import useStudentStore from '../store/useStudentStore'
import useFieldStore   from '../store/useFieldStore'
import { getCurrentInstituteId } from '../utils/dbHelpers'
import { computeFee, formatCurrency, currentAcademicYear } from '../utils/feeCalculations'
import { isCustomStudentProfileField } from '../utils/studentFieldFilter'
import { dateToWordsEnglish } from '../utils/dateWords'
import clsx from 'clsx'

const CLASSES  = ['1','2','3','4','5','6','7','8','9','10','11-Sci','11-Com','12-Sci','12-Com']
  .flatMap(c => ['A','B','C'].map(s => `${c}-${s}`))
const MEDIUMS  = ['English', 'Hindi', 'Marathi', 'Semi-English', 'Urdu']
const BOARDS   = ['State Board', 'CBSE', 'ICSE', 'IB', 'IGCSE']
const STATUSES = ['active', 'inactive']

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
        <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function AddStudent() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const { addStudent, activeStudent, loadStudent, updateStudent, updateFee } = useStudentStore()
  const { fields, loadFields } = useFieldStore()

  const [photo, setPhoto]           = useState(null)
  const [feePreview, setFeePreview] = useState(null)
  const [error, setError]           = useState(null)

  const instituteId = getCurrentInstituteId()
  const studentProfileFields = fields.filter(isCustomStudentProfileField)

  useEffect(() => {
    if (instituteId) loadFields(instituteId)
  }, [instituteId])

  useEffect(() => {
    if (isEditMode && id) loadStudent(id)
  }, [isEditMode, id, loadStudent])

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      academicYear: currentAcademicYear(),
      medium: 'English',
      board:  'State Board',
      status: 'active',
      totalFee: '',
      discount: '0',
    },
  })

  const watchedFee      = watch('totalFee')
  const watchedDiscount = watch('discount')
  const watchedDob      = watch('dateOfBirth')
  const classInputId = 'student-class-options'
  const dobInWordsField = studentProfileFields.find((field) => field.key === 'dobInWords')

  const editingStudent = isEditMode && activeStudent?.id === id ? activeStudent : null

  const dynamicDefaultValues = useMemo(() => {
    if (!editingStudent) return {}
    return studentProfileFields.reduce((acc, field) => {
      acc[`field_${field.key}`] = editingStudent.dynamicFields?.[field.key] ?? ''
      return acc
    }, {})
  }, [editingStudent, studentProfileFields])

  useEffect(() => {
    const preview = computeFee(watchedFee, watchedDiscount, 0)
    setFeePreview(preview)
  }, [watchedFee, watchedDiscount])

  useEffect(() => {
    if (!dobInWordsField) return
    const value = dateToWordsEnglish(watchedDob)
    setValue(`field_${dobInWordsField.key}`, value, {
      shouldDirty: Boolean(watchedDob),
      shouldValidate: false,
    })
  }, [watchedDob, dobInWordsField, setValue])

  useEffect(() => {
    if (!editingStudent) return

    reset({
      studentName: editingStudent.dynamicFields?.studentName ?? '',
      dateOfBirth: editingStudent.dynamicFields?.dateOfBirth ?? '',
      gender: editingStudent.dynamicFields?.gender ?? '',
      rollNumber: editingStudent.rollNumber ?? '',
      class: editingStudent.class ?? '',
      medium: editingStudent.medium ?? 'English',
      board: editingStudent.board ?? 'State Board',
      academicYear: editingStudent.academicYear ?? currentAcademicYear(),
      status: editingStudent.status ?? 'active',
      totalFee: String(editingStudent.fee?.totalFee ?? ''),
      discount: String(editingStudent.fee?.discount ?? 0),
      ...dynamicDefaultValues,
    })

    setPhoto(editingStudent.dynamicFields?.photo ?? null)
  }, [editingStudent, dynamicDefaultValues, reset])

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Max photo size: 2MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const onSubmit = async (data) => {
    if (!instituteId) { setError('No institute selected'); return }
    setError(null)
    try {
      const dynamicFields = {}

      dynamicFields.studentName = data.studentName ?? ''
      dynamicFields.dateOfBirth = data.dateOfBirth ?? ''
      dynamicFields.gender      = data.gender ?? ''
      if (photo) dynamicFields.photo = photo

      studentProfileFields.forEach(f => {
        const val = data[`field_${f.key}`]
        if (val !== undefined && val !== '') dynamicFields[f.key] = val
      })

      if (isEditMode && editingStudent) {
        await updateStudent(editingStudent.id, {
          dynamicFields,
          rollNumber:   data.rollNumber,
          class:        data.class,
          medium:       data.medium,
          board:        data.board,
          academicYear: data.academicYear,
          status:       data.status,
        })

        if (editingStudent.fee?.id) {
          await updateFee(editingStudent.fee.id, {
            totalFee: Number(data.totalFee) || 0,
            discount: Number(data.discount) || 0,
          })
        }

        navigate(`/students/${editingStudent.id}`)
        return
      }

      const student = await addStudent({
        instituteId,
        dynamicFields,
        rollNumber:   data.rollNumber,
        class:        data.class,
        medium:       data.medium,
        board:        data.board,
        academicYear: data.academicYear,
        status:       data.status,
        totalFee:     Number(data.totalFee) || 0,
        discount:     Number(data.discount) || 0,
      })

      navigate(`/students/${student.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/students')} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEditMode ? 'Edit Student' : 'Add Student'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEditMode ? 'Update student profile and fee details' : 'Register a new student with fee details'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Section title="Personal Information" icon={User}>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden shrink-0 flex items-center justify-center">
              {photo
                ? <img src={photo} alt="Student" className="w-full h-full object-cover" />
                : <ImageIcon className="w-7 h-7 text-gray-400" />
              }
            </div>
            <div className="space-y-2">
              <label className="btn-secondary text-xs cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" /> {photo ? 'Change Photo' : 'Upload Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {photo && (
                <button type="button" onClick={() => setPhoto(null)} className="block text-xs text-red-500 hover:underline">
                  Remove
                </button>
              )}
              <p className="text-xs text-gray-400">Max 2 MB - JPG, PNG</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Full Name <span className="text-red-500">*</span></label>
              <input
                {...register('studentName', {
                  required: 'Student name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  maxLength: { value: 100, message: 'Name must be at most 100 characters' },
                })}
                className={clsx('input', errors.studentName && 'border-red-400')}
                placeholder="Student full name"
              />
              {errors.studentName && <p className="text-xs text-red-500 mt-1">{errors.studentName.message}</p>}
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input {...register('dateOfBirth')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select {...register('gender')} className="input">
                <option value="">-- Select --</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>

            {studentProfileFields.map(field => {
              const v = field.validation ?? {}
              const rules = {
                required: v.required ? `${field.label} is required` : false,
                ...(field.type === 'text' || field.type === 'textarea'
                  ? { maxLength: v.maxLength ? { value: v.maxLength, message: `Max ${v.maxLength} characters` } : undefined }
                  : {}),
                ...(field.type === 'number'
                  ? {
                      min: v.min != null ? { value: v.min, message: `Min value is ${v.min}` } : undefined,
                      max: v.max != null ? { value: v.max, message: `Max value is ${v.max}` } : undefined,
                    }
                  : {}),
              }
              const fieldKey = `field_${field.key}`
              const fieldError = errors[fieldKey]

              return (
                <div key={field.id}>
                  <label className="label">
                    {field.label} {v.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'select'
                    ? <select {...register(fieldKey, rules)} className={clsx('input', fieldError && 'border-red-400')}>
                        <option value="">-- Select --</option>
                        {(field.options ?? []).map(o => <option key={o}>{o}</option>)}
                      </select>
                    : field.type === 'textarea'
                    ? <textarea {...register(fieldKey, rules)} rows={2} className={clsx('input resize-none', fieldError && 'border-red-400')} />
                    : <input
                        {...register(fieldKey, rules)}
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        className={clsx(
                          'input',
                          field.key === 'dobInWords' && 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
                          fieldError && 'border-red-400'
                        )}
                        readOnly={field.key === 'dobInWords'}
                        placeholder={field.key === 'dobInWords' ? 'Auto-generated from Date of Birth' : undefined}
                      />
                  }
                  {fieldError && (
                    <p className="text-xs text-red-500 mt-1">{fieldError.message}</p>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Academic Details" icon={BookOpen}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Roll Number</label>
              <input {...register('rollNumber')} className="input" placeholder="e.g. A001" />
            </div>
            <div>
              <label className="label">Class <span className="text-red-500">*</span></label>
              <input
                {...register('class', { required: 'Class is required' })}
                list={classInputId}
                className="input"
                placeholder="Select or type class"
              />
              <datalist id={classInputId}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </datalist>
              {errors.class && <p className="text-xs text-red-500 mt-1">{errors.class.message}</p>}
            </div>
            <div>
              <label className="label">Medium</label>
              <select {...register('medium')} className="input">
                {MEDIUMS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Board</label>
              <select {...register('board')} className="input">
                {BOARDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input {...register('academicYear')} className="input" placeholder="2024-25" />
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Fee Setup" icon={CreditCard}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Total Fee (Rs) <span className="text-red-500">*</span></label>
              <input
                {...register('totalFee', { required: 'Total fee is required', min: 0 })}
                type="number"
                min="0"
                step="100"
                className="input"
                placeholder="e.g. 12000"
              />
              {errors.totalFee && <p className="text-xs text-red-500 mt-1">{errors.totalFee.message}</p>}
            </div>
            <div>
              <label className="label">Discount (Rs)</label>
              <input
                {...register('discount', {
                  validate: v => {
                    const disc  = Number(v) || 0
                    const total = Number(watchedFee) || 0
                    if (disc > total) return 'Discount cannot exceed total fee'
                    return true
                  },
                })}
                type="number"
                min="0"
                step="100"
                className={clsx('input', errors.discount && 'border-red-400')}
                placeholder="0"
              />
              {errors.discount && (
                <p className="text-xs text-red-500 mt-1">{errors.discount.message}</p>
              )}
            </div>
          </div>

          {feePreview && feePreview.totalFee > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 grid grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(feePreview.totalFee)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Discount</p>
                <p className="font-bold text-red-500">- {formatCurrency(feePreview.discount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Effective</p>
                <p className="font-bold text-primary-600 dark:text-primary-400">{formatCurrency(feePreview.effectiveFee)}</p>
              </div>
            </div>
          )}
        </Section>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(isEditMode && editingStudent ? `/students/${editingStudent.id}` : '/students')}
            className="btn-secondary flex-1 justify-center"
          >
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center disabled:opacity-50">
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> {isEditMode ? 'Update Student' : 'Save Student'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
