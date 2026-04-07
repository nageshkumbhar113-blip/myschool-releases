import schoolDataService from '../services/schoolDataService'

export async function getAcademicYears(instituteId) {
  return schoolDataService.promotion.getYears(instituteId)
}

export async function getClassesForYear(instituteId, academicYear) {
  return schoolDataService.promotion.getClasses(instituteId, academicYear)
}

export async function loadStudentsForPromotion(instituteId, academicYear, filterClass = '') {
  return schoolDataService.promotion.listStudents(instituteId, academicYear, filterClass)
}

export async function promoteStudents(students, targetClass, targetAcademicYear, instituteId, feeDefaults = {}) {
  return schoolDataService.promotion.apply(
    students.map((student) => student.id),
    targetClass,
    targetAcademicYear,
    instituteId,
    feeDefaults,
  )
}

export async function previewPromotion(students, targetClass, targetAcademicYear, instituteId) {
  return schoolDataService.promotion.preview(
    students.map((student) => student.id),
    targetClass,
    targetAcademicYear,
    instituteId,
  )
}
