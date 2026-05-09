import { useParams, Link } from "wouter";
import type { QuizResults } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, CheckCircle, XCircle, MinusCircle, Clock, Flame, ListChecks, Home, RotateCcw } from "lucide-react";

interface ResultsProps {
  results?: QuizResults;
  sessionId?: string | number;
}

export default function Results({ results: propResults, sessionId: propSessionId }: ResultsProps) {
  const params = useParams<{ sessionId: string }>();
  const sessionId = propSessionId ?? params.sessionId ?? "";

  const stored = typeof window !== 'undefined'
    ? sessionStorage.getItem(`quiz-results-${sessionId}`)
    : null;
  const results: QuizResults | null = propResults ?? (stored ? JSON.parse(stored) : null);

  if (!results) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center flex-col gap-4 text-muted-foreground">
        <Trophy size={64} className="opacity-20" />
        <p className="text-lg font-medium">No results found for this session.</p>
        <Link href="/"><Button>Go Home</Button></Link>
      </div>
    );
  }

  const accuracy = Math.round((results.correctCount / results.totalQuestions) * 100) || 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-3xl mx-auto w-full shadow-2xl">
      <main className="flex-1 p-6 md:p-8 flex flex-col">
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary/10 text-primary mb-6 animate-in zoom-in duration-500 shadow-inner">
            <Trophy size={64} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">Quiz Complete!</h1>
          <p className="text-xl text-muted-foreground font-medium">You scored <span className="text-primary font-bold">{results.score}</span> points.</p>
        </div>

        <div className="mb-10 px-4">
          <div className="flex justify-between mb-2 font-bold uppercase tracking-wider text-sm">
            <span className="text-muted-foreground">Accuracy</span>
            <span className={accuracy >= 80 ? 'text-green-500' : accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}>{accuracy}%</span>
          </div>
          <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${(results.correctCount / results.totalQuestions) * 100}%` }} />
            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${(results.wrongCount / results.totalQuestions) * 100}%` }} />
            <div className="h-full bg-gray-300 transition-all duration-700" style={{ width: `${(results.skippedCount / results.totalQuestions) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-2 font-semibold text-muted-foreground">
            <span className="text-green-600">{results.correctCount} Correct</span>
            <span className="text-red-500">{results.wrongCount} Wrong</span>
            <span className="text-gray-500">{results.skippedCount} Skipped</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <Card className="border-green-200 bg-green-50/50 shadow-sm">
            <CardContent className="p-6 text-center">
              <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
              <p className="text-3xl font-black text-green-700">{results.correctCount}</p>
              <p className="text-xs font-bold uppercase text-green-600/80 tracking-wider">Correct</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 shadow-sm">
            <CardContent className="p-6 text-center">
              <XCircle className="mx-auto mb-2 text-red-500" size={32} />
              <p className="text-3xl font-black text-red-700">{results.wrongCount}</p>
              <p className="text-xs font-bold uppercase text-red-600/80 tracking-wider">Wrong</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-gray-50/50 shadow-sm sm:col-span-1 col-span-2">
            <CardContent className="p-6 text-center">
              <MinusCircle className="mx-auto mb-2 text-gray-500" size={32} />
              <p className="text-3xl font-black text-gray-700">{results.skippedCount}</p>
              <p className="text-xs font-bold uppercase text-gray-600/80 tracking-wider">Skipped</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-auto">
          <div className="flex items-center p-4 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Time</p>
              <p className="text-xl font-bold text-foreground">{formatTime(results.totalTimeSeconds)}</p>
              <p className="text-xs text-muted-foreground">{results.averageTimeSeconds}s / question</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-4">
              <Flame size={24} className="fill-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Best Streak</p>
              <p className="text-xl font-bold text-foreground">{results.bestStreak}</p>
              <p className="text-xs text-muted-foreground">in this session</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 bg-card border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href={`/answer-key/${sessionId}`}>
          <Button variant="outline" className="w-full font-bold h-14 rounded-xl border-2 text-foreground hover:bg-muted">
            <ListChecks className="mr-2" /> Answer Key
          </Button>
        </Link>
        <Link href="/quiz-setup">
          <Button variant="secondary" className="w-full font-bold h-14 rounded-xl text-secondary-foreground">
            <RotateCcw className="mr-2" /> Practice Again
          </Button>
        </Link>
        <Link href="/">
          <Button className="w-full font-bold h-14 rounded-xl shadow-md text-primary-foreground">
            <Home className="mr-2" /> Home
          </Button>
        </Link>
      </footer>
    </div>
  );
}
