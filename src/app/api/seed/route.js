import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import UserConfig from '@/models/UserConfig';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

const DEFAULT_CONFIG = {
  dashboardTitle: "COMMAND CENTER",
  graduationDate: "2026-12-15",
  interviewReadyDate: "2026-10-03",
  footerText: "Phase 0 started Mar 29 · Target: Big Tech SDE · Graduating Dec 2026",
  officeRules: "<b>GA requirement:</b> 4 weekdays, ~5 hrs each, between 9 AM–6 PM.<br/><b>Cubicle:</b> Your DSA lab. Stay after GA hours until ~8:30 PM.<br/><b>Gym:</b> 5 min walk from cubicle. Tue/Thu/Fri only (Mon/Wed blocked by 6:30 class).",

  colorMap: {
    dsa: "#7c3aed", gym: "#10b981", work: "#06b6d4", class: "#f59e0b",
    friend: "#f97316", meal: "#78716c", routine: "#6b7280", sleep: "#6366f1",
    office: "#0ea5e9", transit: "#94a3b8"
  },

  checks: [
    { id: "wake", label: "Woke up on schedule for today's day type", icon: "⏰" },
    { id: "dsa", label: "Completed DSA block(s) — Python practice / pattern study", icon: "🧠" },
    { id: "gym", label: "Gym session (Tue/Thu/Fri only)", icon: "💪" },
    { id: "meals", label: "3 meals eaten today", icon: "🍽️" },
    { id: "water", label: "3L+ water consumed", icon: "💧" },
    { id: "sleep", label: "In bed on time for tonight's schedule", icon: "🌙" }
  ],

  officeSchedule: [
    { day: "Mon", arrive: "10:00 AM*", leave: "3:00 PM", class: "6:30 PM", note: "* 12:30 PM if recovery" },
    { day: "Tue", arrive: "10:00 AM", leave: "3:00 PM", class: "8:00 AM", note: "AM class → office" },
    { day: "Wed", arrive: "10:00 AM", leave: "3:00 PM", class: "6:30 PM", note: "Leave by 6:10 for class" },
    { day: "Thu", arrive: "10:00 AM", leave: "3:00 PM", class: "8:00 AM", note: "AM class → office" },
    { day: "Fri", arrive: "10:00 AM", leave: "3:00 PM", class: "—", note: "Cleanest power day" },
    { day: "Sat", arrive: "—", leave: "—", class: "8 AM–1:45 PM", note: "Class only, no office" }
  ],

  dayTypes: {
    POWER: {
      name: "⚡ Power Day + Office", color: "#10b981", tag: "BEST DAY",
      desc: "Full sleep. Fixed 10 AM office. No overnight tonight. Maximize output.",
      wake: "6:45 AM", sleep: "10:30 PM", dsaHrs: "4–5 hrs (cubicle + home)",
      gymSlot: "5:30–6:30 PM campus (Tue/Thu/Fri only)",
      rule: "Most productive day. Morning gym → 10 AM office → GA + cubicle DSA → evening gym (if Tue/Thu/Fri) → home dinner + DSA. Phone in bag during DSA.",
      sched: [
        { t: "6:45", a: "Wake + water (500ml)", c: "routine" },
        { t: "6:45–7:15", a: "Cook breakfast + pack lunch container", c: "meal" },
        { t: "7:15–7:50", a: "Campus gym (weights/cardio)", c: "gym" },
        { t: "7:50–8:15", a: "Shower + change at gym", c: "routine" },
        { t: "8:15–8:30", a: "Eat breakfast at cubicle", c: "meal" },
        { t: "8:30–10:00", a: "CUBICLE DSA: Python practice / problems (phone in bag)", c: "dsa" },
        { t: "10:00–12:30", a: "🏢 OFFICE: GA tasks — fixed start, no negotiation", c: "office" },
        { t: "12:30–1:15", a: "Lunch (microwave packed food)", c: "meal" },
        { t: "1:15–3:00", a: "🏢 OFFICE: GA remaining + DSA in downtime", c: "office" },
        { t: "3:00–5:30", a: "CUBICLE DSA: Continue problems (stay after GA hours)", c: "dsa" },
        { t: "5:30–6:30", a: "GYM on campus — Tue/Thu/Fri ONLY", c: "gym" },
        { t: "6:30–7:00", a: "Shower or head to class (Mon/Wed → 6:30 PM class)", c: "routine" },
        { t: "7:00–7:30", a: "Bus home (30 min)", c: "transit" },
        { t: "7:30–8:15", a: "Cook dinner + eat", c: "meal" },
        { t: "8:15–10:00", a: "DSA at home: review + tomorrow prep", c: "dsa" },
        { t: "10:00–10:30", a: "Wind down → bed", c: "sleep" }
      ]
    },
    POWER_CLASS_AM: {
      name: "📚 Power Day + AM Class + Office", color: "#22d3ee", tag: "TUE / THU",
      desc: "8 AM class → 10 AM office. Gym after GA. Strong day.",
      wake: "6:30 AM", sleep: "10:30 PM", dsaHrs: "3–4 hrs (cubicle + home)",
      gymSlot: "5:30–6:30 PM campus",
      rule: "Class at 8 AM ends 9:15 → walk to cubicle → settle by 9:30–9:45 → 10 AM office start. Gym after GA hours.",
      sched: [
        { t: "6:30", a: "Wake + water (500ml)", c: "routine" },
        { t: "6:30–7:00", a: "Cook breakfast + pack lunch container", c: "meal" },
        { t: "7:00–7:30", a: "Bus to campus (30 min)", c: "transit" },
        { t: "7:30–7:55", a: "Quick eat at campus + settle", c: "meal" },
        { t: "8:00–9:15", a: "📖 CLASS (morning lecture)", c: "class" },
        { t: "9:15–9:45", a: "Walk to cubicle + settle in", c: "routine" },
        { t: "9:45–10:00", a: "CUBICLE DSA: Quick problem warm-up", c: "dsa" },
        { t: "10:00–12:30", a: "🏢 OFFICE: GA tasks — fixed 10 AM start", c: "office" },
        { t: "12:30–1:15", a: "Lunch (microwave packed food)", c: "meal" },
        { t: "1:15–3:00", a: "🏢 OFFICE: GA remaining + DSA in downtime", c: "office" },
        { t: "3:00–5:30", a: "CUBICLE DSA: Problems + pattern study", c: "dsa" },
        { t: "5:30–6:30", a: "GYM on campus (5 min walk from cubicle)", c: "gym" },
        { t: "6:30–7:00", a: "Shower + change", c: "routine" },
        { t: "7:00–7:30", a: "Bus home (30 min)", c: "transit" },
        { t: "7:30–8:15", a: "Cook dinner + eat", c: "meal" },
        { t: "8:15–10:00", a: "DSA at home: review + prep tomorrow", c: "dsa" },
        { t: "10:00–10:30", a: "Wind down → bed", c: "sleep" }
      ]
    },
    POWER_CLASS_PM: {
      name: "🌆 Power Day + Office + PM Class", color: "#a78bfa", tag: "MON / WED",
      desc: "10 AM office. NO gym — 6:30 PM class blocks it. Leave office by 6:10.",
      wake: "6:45 AM", sleep: "10:30 PM", dsaHrs: "3–4 hrs (cubicle + post-class)",
      gymSlot: "❌ No gym — 6:30 PM class",
      rule: "Office at 10 AM → GA + DSA → leave by 6:10 PM → 6:30 class. No gym today.",
      sched: [
        { t: "6:45", a: "Wake + water (500ml)", c: "routine" },
        { t: "6:45–7:15", a: "Cook breakfast + pack lunch container", c: "meal" },
        { t: "7:15–7:50", a: "Campus gym (weights/cardio)", c: "gym" },
        { t: "7:50–8:15", a: "Shower + change at gym", c: "routine" },
        { t: "8:15–8:30", a: "Eat breakfast at cubicle", c: "meal" },
        { t: "8:30–10:00", a: "CUBICLE DSA: Python practice / problems", c: "dsa" },
        { t: "10:00–12:30", a: "🏢 OFFICE: GA tasks — fixed 10 AM start", c: "office" },
        { t: "12:30–1:15", a: "Lunch (microwave packed food)", c: "meal" },
        { t: "1:15–3:00", a: "🏢 OFFICE: GA remaining + DSA in downtime", c: "office" },
        { t: "3:00–6:00", a: "CUBICLE DSA: Deep work session (stay after hours)", c: "dsa" },
        { t: "6:00–6:25", a: "Walk to class building", c: "transit" },
        { t: "6:30–7:45", a: "📖 EVENING CLASS", c: "class" },
        { t: "7:45–8:15", a: "Bus home (30 min)", c: "transit" },
        { t: "8:15–9:00", a: "Cook dinner + eat", c: "meal" },
        { t: "9:00–10:00", a: "DSA at home: light review", c: "dsa" },
        { t: "10:00–10:30", a: "Wind down → bed", c: "sleep" }
      ]
    },
    PRE_OVERNIGHT: {
      name: "🌙 Pre-Overnight + Office", color: "#f59e0b", tag: "FRIEND NIGHT",
      desc: "Office day then friend's overnight. Pack bag in AM. Go direct from campus.",
      wake: "6:45 AM", sleep: "Next day ~7 AM", dsaHrs: "2–3 hrs cubicle + overnight DSA",
      gymSlot: "5:30–6:30 PM if Tue/Thu/Fri, skip if Mon/Wed",
      rule: "Pack overnight bag in morning. Office at 10 AM. After gym/class go DIRECT to friend's. DSA during downtime (10 PM–7 AM).",
      sched: [
        { t: "6:45", a: "Wake + water + PACK OVERNIGHT BAG", c: "routine" },
        { t: "6:45–7:15", a: "Cook breakfast + pack lunch container", c: "meal" },
        { t: "7:15–7:50", a: "Campus gym (if Tue/Thu/Fri)", c: "gym" },
        { t: "7:50–8:30", a: "Shower + eat breakfast at cubicle", c: "routine" },
        { t: "8:30–10:00", a: "CUBICLE DSA: problems (phone in bag)", c: "dsa" },
        { t: "10:00–12:30", a: "🏢 OFFICE: GA tasks — fixed 10 AM start", c: "office" },
        { t: "12:30–1:15", a: "Lunch (microwave packed food)", c: "meal" },
        { t: "1:15–3:00", a: "🏢 OFFICE: GA remaining + DSA in downtime", c: "office" },
        { t: "3:00–5:30", a: "CUBICLE DSA: Continue problems", c: "dsa" },
        { t: "5:30–6:30", a: "GYM if Tue/Thu/Fri — else class if Mon/Wed", c: "gym" },
        { t: "6:30–7:00", a: "Shower → head DIRECT to friend's (bag packed)", c: "routine" },
        { t: "~8:00 PM", a: "Arrive friend's place", c: "friend" },
        { t: "10:00 PM–2:00 AM", a: "🖥️ Startup work (non-negotiable)", c: "work" },
        { t: "2:00–7:00 AM", a: "DSA practice / Python revision during downtime", c: "dsa" }
      ]
    },
    RECOVERY: {
      name: "😴 Recovery Day (post-overnight)", color: "#ef4444", tag: "REST + LATE OFFICE",
      desc: "Home ~7 AM from overnight. Sleep until 11. Office at 12:30 PM. No gym.",
      wake: "~11:00 AM", sleep: "10:30 PM", dsaHrs: "1–2 hrs (cubicle only)",
      gymSlot: "❌ No gym — recovery day",
      rule: "Arrive home ~7 AM. Sleep until 11. Cook + eat. Office at 12:30 PM — NO NEGOTIATION.",
      sched: [
        { t: "~7:00 AM", a: "Arrive home from friend's", c: "routine" },
        { t: "7:00–7:30", a: "Shower + wind down", c: "routine" },
        { t: "7:30–11:00", a: "SLEEP (recovery — non-negotiable)", c: "sleep" },
        { t: "11:00–11:30", a: "Wake + water + light stretch", c: "routine" },
        { t: "11:30–12:00", a: "Cook brunch + eat", c: "meal" },
        { t: "12:00–12:30", a: "Bus to campus (30 min)", c: "transit" },
        { t: "12:30–3:00", a: "🏢 OFFICE: GA tasks — fixed 12:30 PM start", c: "office" },
        { t: "3:00–4:00", a: "CUBICLE DSA: Light problems only", c: "dsa" },
        { t: "4:00–5:30", a: "🏢 OFFICE: GA remaining tasks", c: "office" },
        { t: "5:30–6:00", a: "Head to class (Mon/Wed) or bus home", c: "transit" },
        { t: "6:30–7:45", a: "📖 CLASS if Mon/Wed — else skip", c: "class" },
        { t: "~8:00", a: "Home → cook dinner + eat", c: "meal" },
        { t: "9:00–10:00", a: "Light review or rest — don't push", c: "routine" },
        { t: "10:00–10:30", a: "Wind down → bed (reset sleep cycle)", c: "sleep" }
      ]
    },
    RECOVERY_OFF: {
      name: "🛌 Recovery OFF (no office)", color: "#dc2626", tag: "DAY OFF",
      desc: "Post back-to-back overnights. Full rest. No office, no gym. Light DSA if energy.",
      wake: "~11:00 AM", sleep: "10:30 PM", dsaHrs: "0–1 hr (optional)",
      gymSlot: "❌ No gym — full recovery",
      rule: "1 day off from GA per week. Sleep, eat, recover. Light DSA review ONLY if you have energy.",
      sched: [
        { t: "~7:00 AM", a: "Arrive home from friend's", c: "routine" },
        { t: "7:30–12:00", a: "SLEEP — full recovery", c: "sleep" },
        { t: "12:00–12:30", a: "Wake + water + shower", c: "routine" },
        { t: "12:30–1:15", a: "Cook brunch + eat", c: "meal" },
        { t: "1:15–2:30", a: "Chores: laundry, clean, grocery list", c: "routine" },
        { t: "2:30–4:00", a: "OPTIONAL DSA: Light review / Grokking chapter", c: "dsa" },
        { t: "4:00–5:00", a: "Walk / fresh air / call family", c: "routine" },
        { t: "5:00–6:00", a: "Cook dinner + eat", c: "meal" },
        { t: "6:00–8:00", a: "Free time — NO screens after 9 PM", c: "routine" },
        { t: "8:00–9:30", a: "Light reading (CS Distilled / Grokking)", c: "dsa" },
        { t: "10:00–10:30", a: "Wind down → bed (reset cycle)", c: "sleep" }
      ]
    },
    CLASS_SAT: {
      name: "📖 Saturday (Class Day)", color: "#8b5cf6", tag: "SATURDAY",
      desc: "8 AM–1:45 PM class. No office. Afternoon = DSA + gym if no friend night.",
      wake: "6:30 AM", sleep: "10:30 PM or overnight", dsaHrs: "3–4 hrs (afternoon)",
      gymSlot: "3:00–4:00 PM (if no friend night tonight)",
      rule: "Class all morning. Afternoon is free — maximize DSA. If friend night tonight, pack bag and leave by 8 PM.",
      sched: [
        { t: "6:30", a: "Wake + water", c: "routine" },
        { t: "6:30–7:00", a: "Cook breakfast + eat quickly", c: "meal" },
        { t: "7:00–7:30", a: "Bus to campus", c: "transit" },
        { t: "8:00–1:45 PM", a: "📖 SATURDAY CLASSES (full block)", c: "class" },
        { t: "1:45–2:15", a: "Lunch (campus or packed)", c: "meal" },
        { t: "2:15–3:00", a: "Bus home or stay on campus for gym", c: "transit" },
        { t: "3:00–4:00", a: "GYM — skip if friend night", c: "gym" },
        { t: "4:00–4:30", a: "Shower + snack", c: "routine" },
        { t: "4:30–7:00", a: "DSA: Problems + pattern study", c: "dsa" },
        { t: "7:00–7:45", a: "Cook dinner + eat", c: "meal" },
        { t: "7:45–8:00", a: "If friend night → pack bag + leave", c: "friend" },
        { t: "8:00–10:00", a: "DSA or head to friend's", c: "dsa" },
        { t: "10:00–10:30", a: "Wind down → bed (if no friend night)", c: "sleep" }
      ]
    }
  },

  phases: [
    {
      n: "Phase 0: Spring Break Launchpad", w: "Mar 29 – Apr 5", cl: "#a855f7", startDate: "2026-03-29",
      d: "Python refresh (exercises only, no AI) + start Grokking Algorithms + first TUF+ problems.",
      resources: [
        { name: "Colt Steele Udemy", type: "Course", use: "DAYS 1–3: Skip videos, do exercises only. Write every line by hand. No AI.", status: "Mar 29–31" },
        { name: "Grokking Algorithms", type: "Book", use: "DAY 3+: Begin Ch 1–3 (binary search, selection sort, recursion).", status: "Mar 31+" },
        { name: "TUF+ A2Z Sheet", type: "Platform", use: "DAY 4+: Start Step 3 (Arrays). Watch pattern video, solve 2–3.", status: "Apr 2+" }
      ]
    },
    {
      n: "Phase 1: Pattern Foundations", w: "Apr 6 – May 3", cl: "#22c55e", startDate: "2026-04-06",
      d: "Visual mental models → pattern-based problem solving. 2–3 problems/day.",
      resources: [
        { name: "Grokking Algorithms", type: "Book", use: "Finish book. 1 chapter/day.", status: "Wk 1–2" },
        { name: "TUF+ A2Z Sheet", type: "Platform", use: "Full speed. Pattern video → solve 2–3 problems.", status: "Wk 1–4" },
        { name: "CS Distilled", type: "Book", use: "Bus/before-bed reading.", status: "Ongoing" }
      ]
    },
    {
      n: "Phase 2: Intermediate DSA + Sys Design", w: "May 4 – Jun 14", cl: "#0ea5e9", startDate: "2026-05-04",
      d: "Trees, graphs, DP. System design basics begin.",
      resources: [
        { name: "TUF+ A2Z Sheet", type: "Platform", use: "Trees, graphs, DP sections.", status: "Wk 5–10" },
        { name: "CTCI", type: "Book", use: "Start reading alongside TUF+.", status: "Wk 6+" }
      ]
    },
    {
      n: "Phase 3: Advanced + Projects", w: "Jun 15 – Aug 8", cl: "#f59e0b", startDate: "2026-06-15",
      d: "Hard problems. 2–3 GitHub showcase projects deployed on GCP/Azure.",
      resources: [
        { name: "TUF+ A2Z Sheet", type: "Platform", use: "Advanced sections. Hard problems.", status: "Ongoing" },
        { name: "CLRS", type: "Book", use: "Reference only.", status: "Reference" },
        { name: "Projects", type: "Build", use: "2–3 deployed projects. GCP + Azure.", status: "Build" }
      ]
    },
    {
      n: "Phase 4: Interview Ready", w: "Aug 9 – Oct 3", cl: "#ef4444", startDate: "2026-08-09",
      d: "Behavioral prep (Accenture/Hutech stories), mock interviews, full readiness.",
      resources: [
        { name: "CTCI", type: "Book", use: "Behavioral chapter. STAR method.", status: "Wk 1–2" },
        { name: "Mock Interviews", type: "Practice", use: "Weekly mocks. Timed. Recorded.", status: "Wk 2–8" }
      ]
    }
  ]
};

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete any existing config first to avoid stale Map data
    await UserConfig.deleteOne({ userId: user._id });

    // Create fresh
    const created = await UserConfig.create({
      userId: user._id,
      ...DEFAULT_CONFIG
    });

    // Verify it saved correctly
    const verify = await UserConfig.findById(created._id).lean();
    const dtKeys = verify.dayTypes ? Object.keys(verify.dayTypes) : [];

    return NextResponse.json({
      seeded: true,
      message: "Config seeded successfully",
      debug: { dayTypeCount: dtKeys.length, phaseCount: (verify.phases || []).length, checkCount: (verify.checks || []).length }
    });
  } catch (error) {
    console.error("Seed Error:", error);
    return NextResponse.json({ error: "Failed to seed config", details: error.message }, { status: 500 });
  }
}
