import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Loader2, AlertCircle, User, BookOpen, CreditCard, Image as ImageIcon } from 'lucide-react'
import clsx from 'clsx'
import useStudentStore from '../store/useStudentStore'
import useFieldStore from '../store/useFieldStore'
import useSettingsStore from '../store/useSettingsStore'
import { getCurrentInstituteId } from '../utils/dbHelpers'
import { computeFee, formatCurrency, currentAcademicYear } from '../utils/feeCalculations'
import { isCustomStudentProfileField } from '../utils/studentFieldFilter'
import { dateToWordsEnglish } from '../utils/dateWords'
import {
  buildFeeStructureDefaults,
  getFeeStructure,
  parseFeeAmount,
  sumFeeStructureAmounts,
} from '../utils/feeStructure'

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11-Sci', '11-Com', '12-Sci', '12-Com']
  .flatMap((currentClass) => ['A', 'B', 'C'].map((section) => `${currentClass}-${section}`))
const MEDIUMS = ['English', 'Hindi', 'Marathi', 'Semi-English', 'Urdu']
const BOARDS = ['State Board', 'CBSE', 'ICSE', 'IB', 'IGCSE']
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
  const { addStudent, activeStudent, loadStudent, updateStudent, updateFee, loading } = useStudentStore()
  const { fields, loadFields } = useFieldStore()
  const { settings, loadSettings } = useSettingsStore()

  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState(null)

  const instituteId = getCurrentInstituteId()
  const studentProfileFields = useMemo(
    () => fields.filter(isCustomStudentProfileField),
    [fields]
  )
  const feeStructure = useMemo(
    () => getFeeStructure(settings),
    [settings]
  )

  useEffect(() => {
    if (instituteId) loadFields(instituteId)
  }, [instituteId, loadFields])

  useEffect(() => {
    if (instituteId) loadSettings(instituteId)
  }, [instituteId, loadSettings])

  useEffect(() => {
    if (isEditMode && id) loadStudent(id)
  }, [id, isEditMode, loadStudent])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      academicYear: currentAcademicYear(),
      medium: 'English',
      board: 'State Board',
      status: 'active',
      totalFee: '0',
      discount: '0',
    },
  })

  const feeFieldNames = useMemo(
    () => feeStructure.map((item) => `feeParticular_${item.key}`),
    [feeStructure]
  )
  const watchedFeeValues = watch(feeFieldNames)
  const watchedDiscount = watch('discount')
  const watchedDob = watch('dateOfBirth')
  const classInputId = 'student-class-options'
  const dobInWordsField = useMemo(
    () => studentProfileFields.find((field) => field.key === 'dobInWords'),
    [studentProfileFields]
  )

  const editingStudent = isEditMode && activeStudent?.id === id ? activeStudent : null

  const dynamicDefaultValues = useMemo(() => {
    if (!editingStudent) return {}

    return studentProfileFields.reduce((acc, field) => {
      acc[`field_${field.key}`] = editingStudent.dynamicFields?.[field.key] ?? ''
      return acc
    }, {})
  }, [editingStudent, studentProfileFields])

  const feeStructureDefaults = useMemo(() => {
    if (!editingStudent) {
      return buildFeeStructureDefaults(feeStructure, {}, 0)
    }

    return buildFeeStructureDefaults(
      feeStructure,
      editingStudent.dynamicFields?.feeStructureAmounts ?? {},
      editingStudent.fee?.totalFee ?? 0
    )
  }, [editingStudent, feeStructure])

  const currentFeeAmounts = useMemo(() => (
    feeStructure.reduce((acc, item, index) => {
      acc[item.key] = watchedFeeValues?.[index] ?? ''
      return acc
    }, {})
  ), [feeStructure, watchedFeeValues])

  const computedTotalFee = useMemo(
    () => sumFeeStructureAmounts(feeStructure, currentFeeAmounts),
    [feeStructure, currentFeeAmounts]
  )

  const feePreview = useMemo(
    () => computeFee(computedTotalFee, watchedDiscount, 0),
    [computedTotalFee, watchedDiscount]
  )

  useEffect(() => {
    setValue('totalFee', String(computedTotalFee), {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [computedTotalFee, setValue])

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
      studentId: editingStudent.dynamicFields?.studentId ?? '',
      uidAadharNo: editingStudent.dynamicFields?.uidAadharNo ?? '',
      motherTongue: editingStudent.dynamicFields?.motherTongue ?? '',
      resistorNo: editingStudent.dynamicFields?.resistorNo ?? '',
      rollNumber: editingStudent.rollNumber ?? '',
      class: editingStudent.class ?? '',
      medium: editingStudent.medium ?? 'English',
      board: editingStudent.board ?? 'State Board',
      academicYear: editingStudent.academicYear ?? currentAcademicYear(),
      status: editingStudent.status ?? 'active',
      totalFee: String(editingStudent.fee?.totalFee ?? 0),
      discount: String(editingStudent.fee?.discount ?? 0),
      ...feeStructure.reduce((acc, item) => {
        acc[`feeParticular_${item.key}`] = feeStructureDefaults[item.key] ?? ''
        return acc
      }, {}),
      ...dynamicDefaultValues,
    })

    setPhoto(editingStudent.dynamicFields?.photo ?? null)
  }, [dynamicDefaultValues, editingStudent, feeStructure, feeStructureDefaults, reset])

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Max photo size: 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => setPhoto(loadEvent.target.result)
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const onSubmit = async (data) => {
    if (!instituteId) {
      setError('No institute selected')
      return
    }

    if (isEditMode && !editingStudent) {
      setError('Student data is still loading. Please wait a moment and try again.')
      return
    }

    setError(null)

    try {
      const dynamicFields = {}
      const feeStructureAmounts = {}

      dynamicFields.studentName = data.studentName ?? ''
      dynamicFields.dateOfBirth = data.dateOfBirth ?? ''
      dynamicFields.gender = data.gender ?? ''
      dynamicFields.studentId = data.studentId ?? ''
      dynamicFields.uidAadharNo = data.uidAadharNo ?? ''
      dynamicFields.motherTongue = data.motherTongue ?? ''
      dynamicFields.resistorNo = data.resistorNo ?? ''
      if (photo) dynamicFields.photo = photo

      studentProfileFields.forEach((field) => {
        const value = data[`field_${field.key}`]
        if (value !== undefined && value !== '') dynamicFields[field.key] = value
      })

      feeStructure.forEach((item) => {
        const amount = parseFeeAmount(data[`feeParticular_${item.key}`])
        if (amount !== null) feeStructureAmounts[item.key] = amount
      })

      dynamicFields.feeStructureAmounts = feeStructureAmounts

      const totalFee = sumFeeStructureAmounts(feeStructure, feeStructureAmounts)
      const discount = Number(data.discount) || 0

      if (isEditMode && editingStudent) {
        await updateStudent(editingStudent.id, {
          dynamicFields,
          rollNumber: data.rollNumber,
          class: data.class,
          medium: data.medium,
          board: data.board,
          academicYear: data.academicYear,
          status: data.status,
        })

        if (editingStudent.fee?.id) {
          await updateFee(editingStudent.fee.id, {
            totalFee,
            discount,
          })
        }

        navigate(`/students/${editingStudent.id}`)
        return
      }

      if (isEditMode) {
        setError('Student data was not available for update.')
        return
      }

      const student = await addStudent({
        instituteId,
        dynamicFields,
        rollNumber: data.rollNumber,
        class: data.class,
        medium: data.medium,
        board: data.board,
        academicYear: data.academicYear,
        status: data.status,
        totalFee,
        discount,
      })

      navigate(`/students/${student.id}`)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  if (isEditMode && loading && !editingStudent) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-6">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Loading student</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Existing student data is loading for edit mode.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isEditMode && !loading && !editingStudent) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card p-6 space-y-3">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Student not found</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">The saved student record could not be loaded for this edit page.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/students')} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Back to Students
            </button>
            <button type="button" onClick={() => id && loadStudent(id)} className="btn-primary">
              <Loader2 className={clsx('w-4 h-4', loading && 'animate-spin')} /> Retry
            </button>
          </div>
        </div>
      </div>
    )
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
                : <ImageIcon className="w-7 h-7 text-gray-400" />}
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
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="label">Student ID</label>
              <input {...register('studentId')} className="input" placeholder="Student ID" />
            </div>
            <div>
              <label className="label">UID (Adhar No)</label>
              <input {...register('uidAadharNo')} className="input" placeholder="UID / Adhar number" />
            </div>
            <div>
              <label className="label">Mother Tongue</label>
              <input {...register('motherTongue')} className="input" placeholder="Mother tongue" />
            </div>
            <div>
              <label className="label">Reg. No.</label>
              <input {...register('resistorNo')} className="input" placeholder="Registration number" />
            </div>

            {studentProfileFields.map((field) => {
              const validation = field.validation ?? {}
              const rules = {
                required: validation.required ? `${field.label} is required` : false,
                ...(field.type === 'text' || field.type === 'textarea'
                  ? { maxLength: validation.maxLength ? { value: validation.maxLength, message: `Max ${validation.maxLength} characters` } : undefined }
                  : {}),
                ...(field.type === 'number'
                  ? {
                      min: validation.min != null ? { value: validation.min, message: `Min value is ${validation.min}` } : undefined,
                      max: validation.max != null ? { value: validation.max, message: `Max value is ${validation.max}` } : undefined,
                    }
                  : {}),
              }
              const fieldKey = `field_${field.key}`
              const fieldError = errors[fieldKey]

              return (
                <div key={field.id}>
                  <label className="label">
                    {field.label} {validation.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'select'
                    ? (
                      <select {...register(fieldKey, rules)} className={clsx('input', fieldError && 'border-red-400')}>
                        <option value="">-- Select --</option>
                        {(field.options ?? []).map((option) => <option key={option}>{option}</option>)}
                      </select>
                    )
                    : field.type === 'textarea'
                      ? <textarea {...register(fieldKey, rules)} rows={2} className={clsx('input resize-none', fieldError && 'border-red-400')} />
                      : (
                        <input
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
                      )}
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
                {CLASSES.map((currentClass) => <option key={currentClass} value={currentClass}>{currentClass}</option>)}
              </datalist>
              {errors.class && <p className="text-xs text-red-500 mt-1">{errors.class.message}</p>}
            </div>
            <div>
              <label className="label">Medium</label>
              <select {...register('medium')} className="input">
                {MEDIUMS.map((medium) => <option key={medium}>{medium}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Board</label>
              <select {...register('board')} className="input">
                {BOARDS.map((board) => <option key={board}>{board}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input {...register('academicYear')} className="input" placeholder="2024-25" />
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                {STATUSES.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Fee Setup" icon={CreditCard}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {feeStructure.map((item) => (
              <div key={item.key}>
                <label className="label">{item.label} (Rs)</label>
                <input
                  {...register(`feeParticular_${item.key}`)}
                  type="number"
                  min="0"
                  step="1"
                  className="input"
                  placeholder="--"
                />
              </div>
            ))}
            <div>
              <label className="label">Total Fee (Rs)</label>
              <input
                {...register('totalFee')}
                type="number"
                min="0"
                step="1"
                className="input bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                readOnly
              />
              <p className="mt-1 text-xs text-gray-400">Auto-calculated from fee structure particulars.</p>
            </div>
            <div>
              <label className="label">Discount (Rs)</label>
              <input
                {...register('discount', {
                  validate: (value) => {
                    const discount = Number(value) || 0
                    if (discount > computedTotalFee) return 'Discount cannot exceed total fee'
                    return true
                  },
                })}
                type="number"
                min="0"
                step="1"
                className={clsx('input', errors.discount && 'border-red-400')}
                placeholder="0"
              />
              {errors.discount && <p className="text-xs text-red-500 mt-1">{errors.discount.message}</p>}
            </div>
          </div>

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
              : <><Save className="w-4 h-4" /> {isEditMode ? 'Update Student' : 'Save Student'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}
