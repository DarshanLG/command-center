import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import UserConfig from '@/models/UserConfig';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    let user = await User.findOne({ email: session.user.email });
    if (!user) {
      user = await User.create({ email: session.user.email, name: session.user.name });
    }

    // Use .lean() to get a plain JS object, then strip Mongoose internals
    const config = await UserConfig.findOne({ userId: user._id }).lean();

    if (!config) {
      return NextResponse.json({ configured: false });
    }

    // Return everything directly — Mixed types come back as plain objects from .lean()
    return NextResponse.json({
      configured: true,
      graduationDate: config.graduationDate || "",
      interviewReadyDate: config.interviewReadyDate || "",
      dashboardTitle: config.dashboardTitle || "COMMAND CENTER",
      footerText: config.footerText || "",
      officeRules: config.officeRules || "",
      colorMap: config.colorMap || {},
      dayTypes: config.dayTypes || {},
      phases: config.phases || [],
      checks: config.checks || [],
      officeSchedule: config.officeSchedule || [],
    });
  } catch (error) {
    console.error("Config GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch config", details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData = {};
    const fields = ['graduationDate', 'interviewReadyDate', 'dashboardTitle', 'footerText',
                     'officeRules', 'colorMap', 'dayTypes', 'phases', 'checks', 'officeSchedule'];

    fields.forEach(f => { if (body[f] !== undefined) updateData[f] = body[f]; });

    await UserConfig.findOneAndUpdate(
      { userId: user._id },
      { $set: updateData },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config POST Error:", error);
    return NextResponse.json({ error: "Failed to save config", details: error.message }, { status: 500 });
  }
}
