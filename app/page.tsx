import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has an active plan
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (plan) {
    redirect('/dashboard')
  } else {
    redirect('/onboarding')
  }
}
