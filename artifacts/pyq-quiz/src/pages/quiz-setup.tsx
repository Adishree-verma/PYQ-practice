import { useState } from "react";
import { useLocation } from "wouter";
import { useGenerateQuestions } from "@workspace/api-client-react";
import type { GenerateQuestionsBodyDifficulty, GenerateQuestionsBodyCount, Question } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkles, Loader2, BookOpen, Target } from "lucide-react";

const EXAMPLE_TOPICS = [
  "Newton's Laws of Motion",
  "Photosynthesis in plants",
  "French Revolution",
  "Quadratic Equations",
  "Organic Chemistry — Hydrocarbons",
  "Indian Constitution — Fundamental Rights",
  "Electromagnetic Induction",
  "Periodic Table & Chemical Bonding",
  "World War II causes and effects",
  "Coordinate Geometry",
];

const DIFFICULTY_OPTIONS: { id: GenerateQuestionsBodyDifficulty; label: string; color: string }[] = [
  { id: "mixed", label: "Mixed", color: "border-primary bg-primary/10 text-primary" },
  { id: "easy", label: "Easy", color: "border-green-500 bg-green-500/10 text-green-700" },
  { id: "medium", label: "Medium", color: "border-amber-500 bg-amber-500/10 text-amber-700" },
  { id: "hard", label: "Hard", color: "border-red-500 bg-red-500/10 text-red-700" },
];

export default function QuizSetup() {
  const [, navigate] = useLocation();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<GenerateQuestionsBodyCount>(10);
  const [difficulty, setDifficulty] = useState<GenerateQuestionsBodyDifficulty>("mixed");
  const [error, setError] = useState("");

  const generateQuestions = useGenerateQuestions();

  const placeholder = EXAMPLE_TOPICS[Math.floor(Math.random() * EXAMPLE_TOPICS.length)];

  const handleStart = () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError("Please enter a topic, subject, or chapter name.");
      return;
    }
    setError("");

    generateQuestions.mutate(
      { data: { topic: trimmed, count, difficulty } },
      {
        onSuccess: (questions: Question[]) => {
          if (!questions || questions.length === 0) {
            setError("No questions were generated. Try a more specific topic.");
            return;
          }
          const sessionId = `ai-${Date.now()}`;
          sessionStorage.setItem(`ai-quiz-${sessionId}`, JSON.stringify(questions));
          navigate(`/quiz/${sessionId}`);
        },
        onError: () => {
          setError("Failed to generate questions. Please try again.");
        },
      }
    );
  };

  const isLoading = generateQuestions.isPending;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ChevronLeft size={24} />
          </Button>
          <h1 className="text-xl font-bold">Start Practice</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-5 md:p-8 flex flex-col gap-8">

        {/* Topic input */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold leading-tight">What do you want to practice?</h2>
              <p className="text-sm text-muted-foreground">Type any topic, chapter, subject, or concept</p>
            </div>
          </div>

          <textarea
            className={`w-full rounded-2xl border-2 bg-card px-5 py-4 text-lg font-medium resize-none focus:outline-none transition-colors min-h-[100px] ${
              error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary"
            }`}
            placeholder={`e.g. "${placeholder}"`}
            value={topic}
            onChange={(e) => { setTopic(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleStart(); } }}
            disabled={isLoading}
            rows={3}
          />

          {error && (
            <p className="mt-2 text-sm font-semibold text-red-500">{error}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {["Kinematics", "Ionic Equilibrium", "Ancient India", "Trigonometry", "Genetics"].map(ex => (
              <button
                key={ex}
                onClick={() => { setTopic(ex); setError(""); }}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors border border-border"
              >
                {ex}
              </button>
            ))}
          </div>
        </section>

        {/* Question count */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Number of Questions</h3>
          <div className="grid grid-cols-3 gap-3">
            {([10, 20, 30] as GenerateQuestionsBodyCount[]).map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                disabled={isLoading}
                className={`py-4 rounded-2xl font-extrabold text-2xl border-2 transition-all ${
                  count === n
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Difficulty */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Difficulty</h3>
          <div className="grid grid-cols-2 gap-3">
            {DIFFICULTY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setDifficulty(opt.id)}
                disabled={isLoading}
                className={`py-4 rounded-2xl font-bold text-base border-2 transition-all ${
                  difficulty === opt.id
                    ? opt.color + " shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Generate button */}
        <div className="mt-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <Button
            className="w-full py-8 text-xl font-bold rounded-2xl shadow-lg hover:scale-[1.02] transition-transform"
            onClick={handleStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-3" size={26} />
                Generating {count} questions...
              </>
            ) : (
              <>
                <Sparkles className="mr-3 text-yellow-300" size={26} />
                Generate &amp; Start
              </>
            )}
          </Button>

          {isLoading && (
            <div className="mt-4 flex flex-col items-center gap-2 animate-in fade-in">
              <Target className="text-primary animate-pulse" size={32} />
              <p className="text-center text-muted-foreground font-medium text-sm">
                Our AI is crafting {count} exam-style questions on <span className="font-bold text-foreground">"{topic}"</span>…
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
