import { NextResponse } from "next/server"; import { dashboardData } from "@/repositories/dashboard.repository";
export async function GET() { return NextResponse.json(await dashboardData()); }
