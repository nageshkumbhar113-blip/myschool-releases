const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

const ORDINAL_DAYS = [
  '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth',
  'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth',
  'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty First', 'Twenty Second',
  'Twenty Third', 'Twenty Fourth', 'Twenty Fifth', 'Twenty Sixth', 'Twenty Seventh',
  'Twenty Eighth', 'Twenty Ninth', 'Thirtieth', 'Thirty First',
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function numberToWordsUnder100(n) {
  if (n < 20) return ONES[n]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens]
}

function numberToWordsUnder1000(n) {
  if (n < 100) return numberToWordsUnder100(n)
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  return rest
    ? `${ONES[hundreds]} Hundred ${numberToWordsUnder100(rest)}`
    : `${ONES[hundreds]} Hundred`
}

export function numberToWords(n) {
  const value = Number(n)
  if (!Number.isFinite(value) || value < 0 || value > 9999) return ''
  if (value === 0) return 'Zero'
  if (value < 1000) return numberToWordsUnder1000(value)

  const thousands = Math.floor(value / 1000)
  const rest = value % 1000
  return rest
    ? `${ONES[thousands]} Thousand ${numberToWordsUnder1000(rest)}`
    : `${ONES[thousands]} Thousand`
}

export function dateToWordsEnglish(dateString) {
  if (!dateString) return ''

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString))
  if (!match) return ''

  const [, yearStr, monthStr, dayStr] = match
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return ''

  const dayWords = ORDINAL_DAYS[day] ?? ''
  const monthWords = MONTHS[month - 1] ?? ''
  const yearWords = numberToWords(year)

  if (!dayWords || !monthWords || !yearWords) return ''
  return `${dayWords} ${monthWords} ${yearWords}`
}
