'use client'

import { useRouter } from 'next/navigation'
import Chat from '@/components/Chat'

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <Chat
      onPlanGenerated={() => {
        // Small delay to let Supabase save complete
        setTimeout(() => router.push('/dashboard'), 1000)
      }}
    />
  )
}
