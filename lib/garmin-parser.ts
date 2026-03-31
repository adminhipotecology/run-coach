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

export function parseCsvFile(csvContent: string): ParsedRun {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV file is empty or has no data rows')

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows = lines.slice(1).map((line) =>
    line.split(',').map((v) => v.trim())
  )

  function getCol(name: string): number {
    return headers.findIndex((h) => h.includes(name))
  }

  const laps = rows.map((row, i) => ({
    lap: i + 1,
    time: row[getCol('time')] || '0:00',
    pace: row[getCol('pace')] || '0:00',
    hrAvg: parseInt(row[getCol('avg hr')] || row[getCol('heart')] || '0'),
    hrMax: parseInt(row[getCol('max hr')] || '0'),
    ascent: parseInt(row[getCol('ascent')] || row[getCol('elev gain')] || '0'),
    descent: parseInt(row[getCol('descent')] || row[getCol('elev loss')] || '0'),
  }))

  const totalHR = laps.reduce((sum, l) => sum + l.hrAvg, 0)
  const maxHR = Math.max(...laps.map((l) => l.hrMax))

  return {
    stats: {
      distance: 0, // Will need user input or sum of lap distances
      time: '0:00',
      pace: '0:00',
      hrAvg: Math.round(totalHR / laps.length),
      hrMax: maxHR,
      cadenceAvg: 0,
      cadenceMax: 0,
      strideLength: 0,
      calories: 0,
    },
    elevation: {
      ascent: laps.reduce((sum, l) => sum + l.ascent, 0),
      descent: laps.reduce((sum, l) => sum + l.descent, 0),
    },
    trainingEffect: { aerobic: 0, anaerobic: 0 },
    laps,
    date: new Date().toISOString().split('T')[0],
  }
}
