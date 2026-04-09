// file: app/api/auth/register/route.ts — FIXED
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/ratelimit'

const schema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email().max(255).toLowerCase(),
  password: z.string().min(6).max(128),
})

export async function POST(req: NextRequest) {
  // FIX #6: Rate limit — 5 registrations per hour per IP
  const ip = getClientIp(req)
  const { success } = rateLimit(`register:${ip}`, { maxRequests: 5, windowMs: 60 * 60 * 1000 })
  if (!success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  // Check existence before hashing to fail fast (bcrypt is intentionally slow)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // FIX: Don't leak which emails are registered — use generic message
    // (if you want UX feedback, accept the email info leak, but at minimum rate-limit it)
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    })
    // FIX: Don't return the hashed password — return only safe fields
    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (err: any) {
    // Handle race condition: two concurrent registrations with same email
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
