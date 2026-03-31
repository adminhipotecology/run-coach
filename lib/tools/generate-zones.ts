import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type { HRZone } from '@/types'

export const generateZonesTool = tool(
  async ({ maxHR, restingHR }) => {
    const useKarvonen = restingHR !== undefined

    function calcZone(lowPct: number, highPct: number): [number, number] {
      if (useKarvonen) {
        const reserve = maxHR - restingHR!
        return [
          Math.round(reserve * lowPct + restingHR!),
          Math.round(reserve * highPct + restingHR!),
        ]
      }
      return [Math.round(maxHR * lowPct), Math.round(maxHR * highPct)]
    }

    const [z1Low] = calcZone(0, 0.65)
    const [z2Low, z2High] = calcZone(0.65, 0.75)
    const [z3Low, z3High] = calcZone(0.75, 0.85)
    const [z4Low, z4High] = calcZone(0.85, 0.92)
    const [z5Low] = calcZone(0.92, 1.0)

    const zones: HRZone[] = [
      { name: 'Zona 1', key: 'z1', minBpm: 0, maxBpm: z2Low - 1, barWidth: 20, description: 'Recovery — very easy effort' },
      { name: 'Zona 2', key: 'z2', minBpm: z2Low, maxBpm: z2High, barWidth: 55, description: 'Aerobic base — conversational pace' },
      { name: 'Zona 3', key: 'z3', minBpm: z3Low, maxBpm: z3High, barWidth: 75, description: 'Tempo — comfortably hard' },
      { name: 'Zona 4', key: 'z4', minBpm: z4Low, maxBpm: z4High, barWidth: 90, description: 'Threshold — race effort' },
      { name: 'Zona 5', key: 'z5', minBpm: z5Low, maxBpm: null, barWidth: 100, description: 'VO2max — maximum effort' },
    ]

    return JSON.stringify(zones)
  },
  {
    name: 'generate_zones',
    description: 'Calculates heart rate training zones based on max HR and optional resting HR using the Karvonen formula.',
    schema: z.object({
      maxHR: z.number().describe('Maximum heart rate'),
      restingHR: z.number().optional().describe('Resting heart rate for Karvonen formula'),
    }),
  }
)
