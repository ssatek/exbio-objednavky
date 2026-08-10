import { NextRequest, NextResponse } from "next/server";

const GATE_COOKIE = "exbio_access";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/pristup") || pathname.startsWith("/api/pristup")) {
    return NextResponse.next();
  }

  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    // Kód ještě není nastavený v prostředí — brána je v dev módu odemčená.
    return NextResponse.next();
  }

  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (cookie === accessCode) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/pristup";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
