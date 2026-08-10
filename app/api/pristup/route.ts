import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { code, from } = await request.json();
  const accessCode = process.env.ACCESS_CODE;

  if (!accessCode || code !== accessCode) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, redirect: from || "/" });
  response.cookies.set("exbio_access", accessCode, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
