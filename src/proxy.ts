import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/');
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin');
    const isAttendancePage = req.nextUrl.pathname.startsWith('/attendance');
    const isReceptionPage = req.nextUrl.pathname.startsWith('/reception');

    if (!isAuth && (isAdminPage || isAttendancePage || isReceptionPage)) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (isAdminPage && !token?.isAdmin) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true allows the middleware function above to run
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect these specific routes with Middleware
export const config = {
  matcher: ['/admin/:path*', '/attendance/:path*', '/reception/:path*']
};
