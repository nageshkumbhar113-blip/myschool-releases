import schoolDataService from '../services/schoolDataService'

export async function getInstituteLicenseLimit(instituteId) {
  if (!instituteId) return null

  const record = await schoolDataService.license.getCurrent()
  const payload = record?.payload ?? null
  if (!payload || payload.instituteId !== instituteId) return null

  const maxStudents = Number(payload.maxStudents ?? 0)
  return {
    payload,
    maxStudents: Number.isFinite(maxStudents) && maxStudents > 0 ? maxStudents : null,
  }
}

export async function countInstituteStudents(instituteId) {
  if (!instituteId) return 0
  return schoolDataService.students.count(instituteId)
}

export async function getInstituteCapacity(instituteId) {
  const [{ maxStudents }, currentCount] = await Promise.all([
    getInstituteLicenseLimit(instituteId).then((limit) => limit ?? { maxStudents: null }),
    countInstituteStudents(instituteId),
  ])

  return {
    currentCount,
    maxStudents,
    remainingSlots: maxStudents === null ? Infinity : Math.max(0, maxStudents - currentCount),
  }
}

export async function assertStudentCapacity(instituteId, additionalCount = 1) {
  const { currentCount, maxStudents, remainingSlots } = await getInstituteCapacity(instituteId)

  if (maxStudents === null) {
    return { currentCount, maxStudents: null, remainingSlots: Infinity }
  }

  if (additionalCount > remainingSlots) {
    throw new Error(`Student limit reached for this institute (${currentCount}/${maxStudents}). Upgrade the license to add more students.`)
  }

  return { currentCount, maxStudents, remainingSlots }
}
