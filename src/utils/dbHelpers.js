/**
 * dbHelpers.js
 *
 * Centralised query helpers filtered by instituteId.
 */

import useAppStore from '../store/useAppStore'
import schoolDataService from '../services/schoolDataService'

export function getCurrentInstituteId() {
  return useAppStore.getState().currentInstituteId || ''
}

export function getCurrentInstituteName() {
  return useAppStore.getState().currentInstituteName || 'My School'
}

export function getLicenseExpiry() {
  return useAppStore.getState().licenseExpiry || null
}

export function getDaysUntilExpiry() {
  const expiry = getLicenseExpiry()
  if (!expiry) return null
  const diff = new Date(expiry).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export async function getStudents(instituteId) {
  if (!instituteId) return []
  return schoolDataService.students.list(instituteId)
}

export async function getFees(instituteId) {
  if (!instituteId) return []
  return schoolDataService.fees.list(instituteId)
}

export async function getReceipts(instituteId) {
  if (!instituteId) return []
  return schoolDataService.receipts.list(instituteId)
}

export async function getTemplates(instituteId) {
  if (!instituteId) return []
  return schoolDataService.templates.list(instituteId)
}

export async function getFields(instituteId) {
  if (!instituteId) return []
  return schoolDataService.fields.list(instituteId)
}

export async function getSettings(instituteId) {
  if (!instituteId) return null
  return schoolDataService.settings.get(instituteId)
}

export async function countStudents(instituteId) {
  if (!instituteId) return 0
  return schoolDataService.students.count(instituteId)
}

export async function getAllInstitutes() {
  return schoolDataService.institutes.list(true)
}

export async function getStudentCountsPerInstitute() {
  const students = await schoolDataService.students.list(null)
  const counts = {}
  for (const student of students) {
    counts[student.instituteId] = (counts[student.instituteId] ?? 0) + 1
  }
  return counts
}

export async function getTotalFeesCollectedAll() {
  const fees = await schoolDataService.fees.list(null)
  return fees.reduce((acc, fee) => acc + (fee.paidAmount ?? 0), 0)
}

export async function getActiveTemplate(instituteId, type) {
  if (!instituteId || !type) return null
  return schoolDataService.templates.getActive(instituteId, type)
}

export async function getFeesSummary(instituteId) {
  const fees = await getFees(instituteId)
  let collected = 0
  let pending = 0
  for (const fee of fees) {
    collected += fee.paidAmount ?? 0
    pending += fee.remainingAmount ?? 0
  }
  return { collected, pending, total: collected + pending }
}
