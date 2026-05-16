import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAdminProtected = createRouteMatcher(['/casa((?!/login).*)'])
const isAdminLogin    = createRouteMatcher(['/casa/login(.*)'])
const isCuentaProtected = createRouteMatcher(['/cuenta((?!/login|/registro).*)'])
const isCuentaPublic  = createRouteMatcher(['/cuenta/login(.*)', '/cuenta/registro(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isAdminLogin(req) && isAdminProtected(req)) {
    const adminLogin = new URL('/casa/login', req.url)
    await auth.protect({ unauthenticatedUrl: adminLogin.toString() })
  }
  if (!isCuentaPublic(req) && isCuentaProtected(req)) {
    const cuentaLogin = new URL('/cuenta/login', req.url)
    await auth.protect({ unauthenticatedUrl: cuentaLogin.toString() })
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
