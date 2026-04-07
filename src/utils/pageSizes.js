export const PAGE_SIZE_DIMENSIONS = {
  A4: {
    widthPx: 794,
    heightPx: 1123,
    widthMm: '210mm',
    heightMm: '297mm',
    label: 'A4',
  },
  A3: {
    widthPx: 1123,
    heightPx: 1587,
    widthMm: '297mm',
    heightMm: '420mm',
    label: 'A3',
  },
}

export const PAGE_SIZE_OPTIONS = ['A4', 'A3']

export function getPageSizeConfig(pageSize = 'A4') {
  return PAGE_SIZE_DIMENSIONS[pageSize] ?? PAGE_SIZE_DIMENSIONS.A4
}
