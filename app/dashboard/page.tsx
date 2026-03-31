import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: planRow } = await supabase
    .from('plans')
    .select('data')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!planRow) redirect('/onboarding')

  const { data: runRows } = await supabase
    .from('runs')
    .select('data')
    .eq('user_id', user.id)
    .order('run_date', { ascending: true })

  const plan = planRow.data
  const runs = (runRows || []).map((r) => r.data)

  return <DashboardClient initialPlan={plan} initialRuns={runs} />
}
