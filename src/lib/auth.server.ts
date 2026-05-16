// Server-only auth helpers — never import from 'use client'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

// Set ADMIN_USER_IDS in Vercel env as a comma-separated list of Clerk user IDs.
// If left empty, any authenticated user can access admin (development fallback).
const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export async function requireAdmin() {
  const { userId } = await auth()

  if (!userId) redirect('/casa/login')

  if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(userId)) {
    redirect('/casa/login')
  }
}

export async function requireAdminOrThrow() {
  const { userId } = await auth()

  if (!userId) throw new Error('no autorizado')

  if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(userId)) {
    throw new Error('no autorizado')
  }
}
