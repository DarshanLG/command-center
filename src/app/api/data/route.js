import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
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

    const logs = await DailyLog.find({ userId: user._id }).lean();

    const entries = {};
    logs.forEach(log => {
      entries[log.date] = { dt: log.dayType || "", checks: log.checks || {} };
    });

    const weekPlan = user.weekPlan || {};

    return NextResponse.json({ weekPlan, entries });
  } catch (error) {
    console.error("Database GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { entries, weekPlan } = await req.json();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (weekPlan && Object.keys(weekPlan).length > 0) {
      const current = user.weekPlan || {};
      user.weekPlan = { ...current, ...weekPlan };
      user.markModified('weekPlan');
      await user.save();
    }

    if (entries && Object.keys(entries).length > 0) {
      const bulkOps = Object.keys(entries).map(date => ({
        updateOne: {
          filter: { userId: user._id, date },
          update: {
            $set: {
              dayType: entries[date].dt || "",
              checks: entries[date].checks || {}
            }
          },
          upsert: true
        }
      }));
      await DailyLog.bulkWrite(bulkOps);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database POST Error:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}