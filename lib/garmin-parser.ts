import FitParser from 'fit-file-parser'

interface ParsedRun {
  stats: {
    distance: number
    time: string
    pace: string
    hrAvg: number
    hrMax: number
    cadenceAvg: number
    cadenceMax: number
    strideLength: number
    calories: number
  }
  elevation: { ascent: number; descent: number }
  trainingEffect: { aerobic: number; anaerobic: number }
  laps: {
    lap: number
    time: string
    pace: string
    hrAvg: number
    hrMax: number
    ascent: number
    descent: number
  }[]
  date: string
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return '0:00'
  const secPerKm = 1000 / metersPerSecond
  return formatTime(secPerKm)
}

export async function parseFitFile(buffer: ArrayBuffer): Promise<ParsedRun> {
  return new Promise((resolve, reject) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      elapsedRecordField: true,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fitParser.parse(buffer, (error: any, data: any) => {
      if (error) {
        reject(error)
        return
      }

      const sessions = data.sessions as Array<Record<string, number | string | undefined>> | undefined
      const laps = data.laps as Array<Record<string, number | undefined>> | undefined

      if (!sessions || sessions.length === 0) {
        reject(new Error('No session data found in FIT file'))
        return
      }

      const session = sessions[0]
      const totalDistance = (session.total_distance as number || 0) / 1000 // Convert to km
      const totalTime = session.total_timer_time as number || 0
      const avgSpeed = session.avg_speed as number || 0
      const avgHR = session.avg_heart_rate as number || 0
      const maxHR = session.max_heart_rate as number || 0
      const avgCadence = (session.avg_running_cadence as number || session.avg_cadence as number || 0) * 2 // Garmin reports steps per leg
      const maxCadence = (session.max_running_cadence as number || session.max_cadence as number || 0) * 2
      const calories = session.total_calories as number || 0
      const ascent = session.total_ascent as number || 0
      const descent = session.total_descent as number || 0
      const aerobicTE = session.total_training_effect as number || 0
      const anaerobicTE = session.total_anaerobic_training_effect as number || 0
      const timestamp = session.start_time as string || new Date().toISOString()

      const strideLength = avgSpeed > 0 && avgCadence > 0
        ? (avgSpeed / 3.6) / (avgCadence / 60)
        : 0

      const parsedLaps = (laps || []).map((lap, i) => {
        const lapTime = lap.total_timer_time || 0
        const lapDistance = (lap.total_distance || 0) / 1000
        const lapSpeed = lapDistance > 0 ? lapDistance / (lapTime / 3600) : 0
        const lapPace = lapSpeed > 0 ? formatPace(lapSpeed / 3.6) : '0:00'

        return {
          lap: i + 1,
          time: formatTime(lapTime),
          pace: lapPace,
          hrAvg: lap.avg_heart_rate || 0,
          hrMax: lap.max_heart_rate || 0,
          ascent: lap.total_ascent || 0,
          descent: lap.total_descent || 0,
        }
      })

      resolve({
        stats: {
          distance: Math.round(totalDistance * 100) / 100,
          time: formatTime(totalTime),
          pace: formatPace(avgSpeed > 0 ? avgSpeed / 3.6 : 0),
          hrAvg: Math.round(avgHR),
          hrMax: Math.round(maxHR),
          cadenceAvg: Math.round(avgCadence),
          cadenceMax: Math.round(maxCadence),
          strideLength: Math.round(strideLength * 100) / 100,
          calories: Math.round(calories),
        },
        elevation: { ascent: Math.round(ascent), descent: Math.round(descent) },
        trainingEffect: {
          aerobic: Math.round(aerobicTE * 10) / 10,
          anaerobic: Math.round(anaerobicTE * 10) / 10,
        },
        laps: parsedLaps,
        date: new Date(timestamp).toISOString().split('T')[0],
      })
    })
  })
}

/**
 * Parse a CSV string that may contain quoted fields with newlines (Garmin export format).
 * Returns an array of rows, each row being an array of field values.
 */
function parseCSVRows(csv: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let fields: string[] = []

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]

    if (inQuotes) {
      if (ch === '"' && csv[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current.trim())
        current = ''
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && csv[i + 1] === '\n') i++
        fields.push(current.trim())
        current = ''
        if (fields.some((f) => f !== '')) {
          rows.push(fields)
        }
        fields = []
      } else {
        current += ch
      }
    }
  }
  // Last field/row
  fields.push(current.trim())
  if (fields.some((f) => f !== '')) {
    rows.push(fields)
  }

  return rows
}

/**
 * Normalize multi-line Garmin header into single-line lowercase names.
 * e.g. "Avg Pace\nmin/km" → "avg pace min/km"
 */
function normalizeHeader(raw: string): string {
  return raw.replace(/\n/g, ' ').toLowerCase().trim()
}

export function parseCsvFile(csvContent: string): ParsedRun {
  const rows = parseCSVRows(csvContent)
  if (rows.length < 2) throw new Error('CSV file is empty or has no data rows')

  const headers = rows[0].map(normalizeHeader)
  const dataRows = rows.slice(1)

  function col(name: string): number {
    return headers.findIndex((h) => h.includes(name))
  }

  function val(row: string[], name: string): string {
    const idx = col(name)
    return idx >= 0 ? (row[idx] || '') : ''
  }

  function num(row: string[], name: string): number {
    const v = val(row, name).replace(/[^0-9.]/g, '')
    return parseFloat(v) || 0
  }

  // Separate summary row from lap rows
  // Garmin CSV has a "Summary" row at the end
  const summaryIdx = dataRows.findIndex((r) => r[0]?.toLowerCase() === 'summary')
  const summaryRow = summaryIdx >= 0 ? dataRows[summaryIdx] : null
  const lapRows = summaryIdx >= 0 ? dataRows.slice(0, summaryIdx) : dataRows

  // Filter out tiny remainder laps (< 0.1 km) — these are GPS rounding artifacts
  const significantLaps = lapRows.filter((row) => {
    const dist = num(row, 'distance')
    return dist >= 0.1
  })

  const laps = significantLaps.map((row, i) => ({
    lap: i + 1,
    time: val(row, 'time') || '0:00',
    pace: val(row, 'avg pace') || '0:00',
    hrAvg: Math.round(num(row, 'avg hr')),
    hrMax: Math.round(num(row, 'max hr')),
    ascent: Math.round(num(row, 'total ascent')),
    descent: Math.round(num(row, 'total descent')),
  }))

  // Extract summary stats — prefer summary row, fall back to aggregating laps
  const source = summaryRow ?? null
  const distance = source ? num(source, 'distance') : laps.length
  const totalTime = source ? val(source, 'time') : '0:00'
  const avgPace = source ? val(source, 'avg pace') : '0:00'
  const hrAvg = source ? Math.round(num(source, 'avg hr')) : (laps.length > 0 ? Math.round(laps.reduce((s, l) => s + l.hrAvg, 0) / laps.length) : 0)
  const hrMax = source ? Math.round(num(source, 'max hr')) : Math.max(0, ...laps.map((l) => l.hrMax))
  const cadenceAvg = source ? Math.round(num(source, 'avg run cadence')) : 0
  const cadenceMax = source ? Math.round(num(source, 'max run cadence')) : 0
  const strideLength = source ? num(source, 'avg stride length') : 0
  const calories = source ? Math.round(num(source, 'calories')) : 0
  const ascent = source ? Math.round(num(source, 'total ascent')) : laps.reduce((s, l) => s + l.ascent, 0)
  const descent = source ? Math.round(num(source, 'total descent')) : laps.reduce((s, l) => s + l.descent, 0)

  return {
    stats: {
      distance: Math.round(distance * 100) / 100,
      time: totalTime,
      pace: avgPace,
      hrAvg,
      hrMax,
      cadenceAvg,
      cadenceMax,
      strideLength: Math.round(strideLength * 100) / 100,
      calories,
    },
    elevation: { ascent, descent },
    trainingEffect: { aerobic: 0, anaerobic: 0 },
    laps,
    date: new Date().toISOString().split('T')[0],
  }
}
