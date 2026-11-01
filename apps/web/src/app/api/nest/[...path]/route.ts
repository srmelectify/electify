import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxyRequest(request: NextRequest, pathParams: { path?: string[] }) {
  const baseUrl = process.env.NESTJS_API_URL || "http://localhost:4000";
  const subpath = pathParams.path ? pathParams.path.join("/") : "";
  const targetUrl = new URL(
    `/api/${subpath}${request.nextUrl.search}`,
    baseUrl
  );

  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.blob() : undefined,
      redirect: "manual",
    });

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to communicate with internal API service", details: err?.message },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, await ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, await ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, await ctx.params);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, await ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, await ctx.params);
}

