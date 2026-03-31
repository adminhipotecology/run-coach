'use client'

import { useRouter } from 'next/navigation'
import Chat from '@/components/Chat'

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <Chat
      onStreamComplete={() => {
        // Redirect after the full response has streamed
        setTimeout(() => router.push('/dashboard'), 1500)
      }}
    />
  )
}
