import { useState } from "react";
import { useGetUserStats, useUpdateProfile, useGetAnalytics } from "@workspace/api-client-react";
import type { UpdateProfileBodyExamType } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/bottom-nav";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { Flame, Target, Zap, Trophy, Clock, BookOpen, CheckCircle, Star, Award, Shield, Rocket, Crown } from "lucide-react";

const EXAM_OPTIONS = [
  { id: "JEE", label: "JEE", desc: "Engineering Entrance", color: "#7C3AED", bg: "bg-purple-50 border-purple-200", active: "bg-purple-600 text-white border-purple-600" },
  { id: "NEET", label: "NEET", desc: "Medical Entrance", color: "#059669", bg: "bg-emerald-50 border-emerald-200", active: "bg-emerald-600 text-white border-emerald-600" },
  { id: "UPSC", label: "UPSC", desc: "Civil Services", color: "#D97706", bg: "bg-amber-50 border-amber-200", active: "bg-amber-600 text-white border-amber-600" },
  { id: "SSC", label: "SSC", desc: "Staff Selection", color: "#2563EB", bg: "bg-blue-50 border-blue-200", active: "bg-blue-600 text-white border-blue-600" },
];

interface BadgeDef {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  check: (s: { dayStreak: number; correctStreak: number; total: number; accuracy: number }) => boolean;
}

const BADGES: BadgeDef[] = [
  { id: "first_question", label: "First Step", desc: "Answer your first question", icon: Star, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200", check: (s) => s.total >= 1 },
  { id: "streak_3", label: "On Fire", desc: "3-day streak", icon: Flame, color: "text-orange-500", bg: "bg-orange-50 border-orange-200", check: (s) => s.dayStreak >= 3 },
  { id: "streak_7", label: "Week Warrior", desc: "7-day streak", icon: Shield, color: "text-blue-500", bg: "bg-blue-50 border-blue-200", check: (s) => s.dayStreak >= 7 },
  { id: "streak_14", label: "Fortnight Fighter", desc: "14-day streak", icon: Rocket, color: "text-purple-500", bg: "bg-purple-50 border-purple-200", check: (s) => s.dayStreak >= 14 },
  { id: "streak_30", label: "Monthly Master", desc: "30-day streak", icon: Crown, color: "text-amber-500", bg: "bg-amber-50 border-amber-200", check: (s) => s.dayStreak >= 30 },
  { id: "correct_5", label: "Sharp Mind", desc: "5 correct in a row", icon: Zap, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", check: (s) => s.correctStreak >= 5 },
  { id: "correct_10", label: "Hot Streak", desc: "10 correct in a row", icon: Award, color: "text-red-500", bg: "bg-red-50 border-red-200", check: (s) => s.correctStreak >= 10 },
  { id: "accuracy_80", label: "Precision Pro", desc: "80%+ accuracy overall", icon: Target, color: "text-green-600", bg: "bg-green-50 border-green-200", check: (s) => s.accuracy >= 80 },
  { id: "questions_50", label: "Half Century", desc: "50 questions attempted", icon: BookOpen, color: "text-teal-500", bg: "bg-teal-50 border-teal-200", check: (s) => s.total >= 50 },
  { id: "questions_100", label: "Centurion", desc: "100 questions attempted", icon: Trophy, color: "text-purple-600", bg: "bg-purple-50 border-purple-200", check: (s) => s.total >= 100 },
];

const DIFF_COLORS: Record<string, string> = { easy: "#10b981", medium: "#f59e0b", hard: "#ef4444" };

function BadgeCard({ badge, unlocked }: { badge: BadgeDef; unlocked: boolean }) {
  const Icon = badge.icon;
  return (
    <div className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${unlocked ? badge.bg : "bg-muted/30 border-border opacity-40 grayscale"}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${unlocked ? "bg-white shadow-sm" : "bg-muted"}`}>
        <Icon size={24} className={unlocked ? badge.color : "text-muted-foreground"} />
      </div>
      <p className={`text-xs font-bold text-center leading-tight mb-0.5 ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>{badge.label}</p>
      <p className="text-[10px] text-muted-foreground text-center leading-tight">{badge.desc}</p>
      {unlocked && <div className="mt-2 w-2 h-2 rounded-full bg-green-500" />}
    </div>
  );
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"profile" | "analysis">("profile");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetUserStats();
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalytics();
  const updateProfile = useUpdateProfile();

  const badgeState = {
    dayStreak: stats?.bestDayStreak ?? 0,
    correctStreak: stats?.bestCorrectStreak ?? 0,
    total: stats?.totalQuestionsAttempted ?? 0,
    accuracy: stats?.accuracy ?? 0,
  };

  const unlockedCount = BADGES.filter((b) => b.check(badgeState)).length;

  const handleExamSelect = (examId: string) => {
    const newExam = stats?.examType === examId ? null : examId as UpdateProfileBodyExamType;
    updateProfile.mutate({ data: { examType: newExam } }, { onSuccess: () => refetchStats() });
  };

  const handleNameSave = () => {
    if (!nameInput.trim()) return;
    updateProfile.mutate({ data: { name: nameInput.trim() } }, {
      onSuccess: () => { refetchStats(); setEditingName(false); }
    });
  };

  // Format 30-day data for charts (show last 14 for readability)
  const activityData = analytics?.thirtyDayActivity.slice(-14).map((d) => ({
    day: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Questions: d.questionsAttempted,
    Correct: d.correctCount,
  })) ?? [];

  const subjectData = analytics?.subjectPerformance.map((s) => ({
    subject: s.subjectName.length > 7 ? s.subjectName.slice(0, 7) + "…" : s.subjectName,
    fullName: s.subjectName,
    Correct: s.correct,
    Wrong: s.wrong,
    accuracy: s.accuracy,
    color: s.subjectColor,
  })) ?? [];

  const diffData = analytics?.difficultyBreakdown.map((d) => ({
    name: d.difficulty.charAt(0).toUpperCase() + d.difficulty.slice(1),
    value: d.total,
    correct: d.correct,
    color: DIFF_COLORS[d.difficulty] ?? "#94a3b8",
  })) ?? [];

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <header className="bg-primary text-primary-foreground pt-12 pb-16 px-6 rounded-b-[2rem] shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-4xl font-black text-white shadow-lg">
            {(stats?.name ?? "C")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            {editingName ? (
              <div className="flex gap-2 items-center">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                  className="bg-white/20 border border-white/30 text-white placeholder-white/60 rounded-xl px-3 py-1.5 text-lg font-bold outline-none focus:bg-white/30 flex-1 max-w-[200px]"
                  placeholder="Your name"
                />
                <Button size="sm" variant="secondary" onClick={handleNameSave} className="text-xs font-bold">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingName(false)} className="text-white text-xs">Cancel</Button>
              </div>
            ) : (
              <div
                className="cursor-pointer group"
                onClick={() => { setNameInput(stats?.name ?? ""); setEditingName(true); }}
              >
                <h1 className="text-2xl font-extrabold text-white group-hover:underline underline-offset-2">
                  {statsLoading ? "Loading..." : (stats?.name ?? "Challenger")}
                </h1>
                <p className="text-white/70 text-sm">Tap to edit name</p>
              </div>
            )}
            {stats?.examType && (
              <span className="mt-1 inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                {stats.examType} Aspirant
              </span>
            )}
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-orange-300 font-black text-3xl">
              <Flame size={28} className="fill-orange-400" />
              {stats?.currentDayStreak ?? 0}
            </div>
            <span className="text-white/70 text-xs font-semibold">Day Streak</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-card rounded-2xl shadow-md border border-border flex p-1">
          {(["profile", "analysis"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl font-bold capitalize text-sm transition-all ${activeTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tab === "profile" ? "Profile" : "Analysis"}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        {activeTab === "profile" && (
          <>
            {/* Exam Selection */}
            <section>
              <h2 className="text-lg font-bold mb-3 text-foreground">My Target Exam</h2>
              <div className="grid grid-cols-2 gap-3">
                {EXAM_OPTIONS.map((exam) => {
                  const isSelected = stats?.examType === exam.id;
                  return (
                    <button
                      key={exam.id}
                      onClick={() => handleExamSelect(exam.id)}
                      disabled={updateProfile.isPending}
                      className={`p-4 rounded-2xl border-2 text-left transition-all font-semibold ${isSelected ? exam.active : `${exam.bg} hover:border-opacity-60`}`}
                    >
                      <p className="text-xl font-black">{exam.label}</p>
                      <p className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>{exam.desc}</p>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1 text-white/90 text-xs font-bold">
                          <CheckCircle size={12} /> Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Badges */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground">Badges</h2>
                <span className="text-sm font-bold text-primary">{unlockedCount}/{BADGES.length} Unlocked</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {BADGES.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} unlocked={badge.check(badgeState)} />
                ))}
              </div>
            </section>

            {/* Quick Stats */}
            <section>
              <h2 className="text-lg font-bold mb-3 text-foreground">Career Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Attempted", value: stats?.totalQuestionsAttempted ?? 0, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
                  { label: "Total Correct", value: stats?.totalCorrect ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
                  { label: "Best Day Streak", value: `${stats?.bestDayStreak ?? 0}d`, icon: Flame, color: "text-orange-500", bg: "bg-orange-100" },
                  { label: "Best Answer Streak", value: `${stats?.bestCorrectStreak ?? 0}`, icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center ${bg}`}>
                      <Icon size={20} className={color} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                      <p className="text-xl font-black text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === "analysis" && (
          <>
            {/* Summary cards */}
            {analyticsLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Sessions", value: analytics?.totalSessions ?? 0, icon: Target, color: "text-primary" },
                  { label: "Minutes", value: analytics?.totalTimeMinutes ?? 0, icon: Clock, color: "text-blue-500" },
                  { label: "Accuracy", value: `${stats?.accuracy ?? 0}%`, icon: CheckCircle, color: "text-green-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="border-border shadow-sm rounded-2xl">
                    <CardContent className="p-4 text-center">
                      <Icon size={24} className={`mx-auto mb-1 ${color}`} />
                      <p className="text-2xl font-black text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 14-day Activity */}
            <section>
              <h2 className="text-lg font-bold mb-3 text-foreground">14-Day Activity</h2>
              <Card className="border-border shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  {analyticsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : activityData.length === 0 || activityData.every(d => d.Questions === 0) ? (
                    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                      <BookOpen size={32} className="mb-2 opacity-40" />
                      <p className="font-medium text-sm">No activity yet. Start practicing!</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={activityData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                        <Area type="monotone" dataKey="Questions" stroke="#7C3AED" strokeWidth={2} fill="url(#colorQuestions)" />
                        <Area type="monotone" dataKey="Correct" stroke="#10b981" strokeWidth={2} fill="url(#colorCorrect)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Subject Performance */}
            <section>
              <h2 className="text-lg font-bold mb-3 text-foreground">Subject Performance</h2>
              <Card className="border-border shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  {analyticsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : subjectData.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                      <Target size={32} className="mb-2 opacity-40" />
                      <p className="font-medium text-sm">Complete some quizzes to see subject breakdown.</p>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={subjectData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                            formatter={(value, name, props) => [value, name]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                          />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Correct" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Wrong" fill="#f87171" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-3 space-y-2">
                        {subjectData.map((s) => (
                          <div key={s.fullName} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-xs font-semibold text-foreground flex-1">{s.fullName}</span>
                            <span className="text-xs font-bold" style={{ color: s.accuracy >= 70 ? "#10b981" : s.accuracy >= 50 ? "#f59e0b" : "#ef4444" }}>
                              {s.accuracy}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Difficulty Breakdown */}
            <section>
              <h2 className="text-lg font-bold mb-3 text-foreground">Difficulty Breakdown</h2>
              <Card className="border-border shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  {analyticsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : diffData.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                      <Zap size={32} className="mb-2 opacity-40" />
                      <p className="font-medium text-sm">No data yet. Try some quizzes!</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie data={diffData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                            {diffData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                            formatter={(value, name, props) => [`${value} questions`, props.payload.name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-3">
                        {diffData.map((d) => (
                          <div key={d.name}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-bold capitalize" style={{ color: d.color }}>{d.name}</span>
                              <span className="text-xs text-muted-foreground font-semibold">{d.value} Qs</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${d.value > 0 ? Math.round((d.correct / d.value) * 100) : 0}%`, backgroundColor: d.color }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {d.value > 0 ? Math.round((d.correct / d.value) * 100) : 0}% accuracy
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
