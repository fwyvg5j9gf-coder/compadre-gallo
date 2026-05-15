import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Protege /casa pero NO /casa/login ni sus rutas hijas
const isProtected = createRouteMatcher(['/casa((?!/login).*)'])
const isLoginRoute = createRouteMatcher(['/casa/login(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isLoginRoute(req) && isProtected(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
