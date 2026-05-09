import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useDailyCheckIn, useGetUserStats, useGetStreakLeaderboard } from "@workspace/api-client-react";
import BottomNav from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Flame, Target, Activity, Zap, TrendingUp, Trophy, PenLine } from "lucide-react";

export default function Home() {
  const [_, navigate] = useLocation();
  
  const checkInMutation = useDailyCheckIn();
  useEffect(() => {
    checkInMutation.mutate();
  }, []);

  const { data: stats, isLoading: statsLoading } = useGetUserStats();
  const { data: leaderboard, isLoading: leaderboardLoading } = useGetStreakLeaderboard();

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      {/* Header / Motivational */}
      <header className="bg-primary text-primary-foreground pt-12 pb-24 px-6 rounded-b-[2rem] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Target size={300} />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Welcome back, Challenger!</h1>
            <p className="text-primary-foreground/80 text-lg max-w-xl">Every question you solve today brings you one step closer to your dream rank. Let's keep the momentum going.</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col items-center justify-center border border-white/10 shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center text-orange-400 mb-1">
                <Flame className="fill-orange-400 mr-2" size={28} />
                <span className="text-3xl font-black text-white">{stats?.currentDayStreak || 0}</span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/90">Day Streak</span>
            </div>
            
            <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col items-center justify-center border border-white/10 shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center text-green-400 mb-1">
                <Target className="mr-2" size={28} />
                <span className="text-3xl font-black text-white">{stats?.accuracy ? Math.round(stats.accuracy) : 0}%</span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/90">Accuracy</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-12 relative z-20 space-y-10">

        {/* Start Practice CTA */}
        <section>
          <Link href="/quiz-setup">
            <button className="w-full bg-card border-2 border-primary/20 hover:border-primary rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group text-left flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <PenLine size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors">Start Practicing</h2>
                <p className="text-muted-foreground font-medium text-sm mt-0.5">Type any topic — AI generates real exam-level questions instantly</p>
              </div>
            </button>
          </Link>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stats Dashboard */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Your Performance</h2>
            <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-2 border-b border-border">
                  <div className="p-6 border-r border-border">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center"><Activity size={16} className="mr-2" /> Questions</p>
                    <p className="text-3xl font-black text-foreground">{stats?.totalQuestionsAttempted || 0}</p>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center"><Award size={16} className="mr-2" /> Correct</p>
                    <p className="text-3xl font-black text-green-500">{stats?.totalCorrect || 0}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 bg-muted/30">
                  <div className="p-6 border-r border-border">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center"><Flame size={16} className="mr-2" /> Best Streak</p>
                    <p className="text-3xl font-black text-orange-500">{stats?.bestDayStreak || 0} Days</p>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center"><Zap size={16} className="mr-2" /> Answer Streak</p>
                    <p className="text-3xl font-black text-primary">{stats?.bestCorrectStreak || 0} Qs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Weekly Activity */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Weekly Activity</h2>
            <Card className="border-border shadow-sm rounded-2xl h-[calc(100%-2.5rem)] flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col justify-end">
                {stats?.weeklyActivity && stats.weeklyActivity.length > 0 ? (
                  <div className="flex items-end justify-between h-40 gap-2">
                    {stats.weeklyActivity.map((day, i) => {
                      const max = Math.max(...stats.weeklyActivity.map(d => d.questionsAttempted), 10);
                      const height = `${Math.max((day.questionsAttempted / max) * 100, 4)}%`;
                      const isToday = i === stats.weeklyActivity.length - 1;
                      
                      return (
                        <div key={day.date} className="flex flex-col items-center flex-1 gap-2 group">
                          <div className="w-full bg-muted rounded-t-sm rounded-b-sm relative flex items-end justify-center h-full">
                            <div 
                              className={`w-full rounded-t-sm rounded-b-sm transition-all duration-500 ${isToday ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/60'}`}
                              style={{ height }}
                            >
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs py-1 px-2 rounded shadow-md font-bold transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {day.questionsAttempted} Qs
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center flex-col text-muted-foreground">
                    <TrendingUp size={32} className="mb-2 opacity-50" />
                    <p className="font-medium">No activity yet this week.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Leaderboard snippet */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center"><Trophy className="mr-2 text-yellow-500" /> Top Scholars</h2>
          </div>
          <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
            <div className="divide-y divide-border">
              {leaderboardLoading ? (
                [1,2,3].map(i => <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>)
              ) : (
                leaderboard?.slice(0, 5).map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'}`}>
                        {entry.rank}
                      </div>
                      <span className="font-bold text-foreground">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-semibold">
                      <span className="flex items-center text-orange-500"><Flame size={14} className="mr-1" /> {entry.dayStreak}</span>
                      <span className="text-muted-foreground w-16 text-right">{entry.totalQuestions} Qs</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

      </main>
      <BottomNav />
    </div>
  );
}
