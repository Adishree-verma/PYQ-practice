import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useGetQuizSession, useSubmitAnswer, useCompleteQuizSession, useGetMoreQuestions, getGetQuizSessionQueryKey } from "@workspace/api-client-react";
import type { Question } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Clock, X, Sparkles, Loader2, FastForward, Flame } from "lucide-react";
import Results from "./results";

interface LocalAnswer {
  questionId: number;
  selectedOption: number;
  isCorrect: boolean;
  timeTakenSeconds: number;
}

export default function Quiz() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();

  const isAiSession = sessionId.startsWith("ai-");

  const numericSessionId = isAiSession ? 0 : Number(sessionId);
  const { data: session, isLoading: sessionLoading } = useGetQuizSession(
    numericSessionId,
    { query: { enabled: !isAiSession, queryKey: getGetQuizSessionQueryKey(numericSessionId) } }
  );
  const submitAnswer = useSubmitAnswer();
  const completeSession = useCompleteQuizSession();
  const getMoreQuestions = useGetMoreQuestions();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | number | null>(null);

  // For AI sessions: track answers locally
  const [localAnswers, setLocalAnswers] = useState<LocalAnswer[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load questions from API session or sessionStorage
  useEffect(() => {
    if (isAiSession) {
      const stored = sessionStorage.getItem(`ai-quiz-${sessionId}`);
      if (stored) {
        try {
          setQuestions(JSON.parse(stored));
        } catch {
          navigate("/");
        }
      } else {
        navigate("/");
      }
    } else if (session?.questions && questions.length === 0) {
      setQuestions(session.questions);
    }
  }, [session, questions.length, isAiSession, sessionId]);

  useEffect(() => {
    if (!isAnswered && !isCompleted && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAnswered, isCompleted, questions.length, currentIndex]);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedOption(optionIndex);
  };

  const handleSubmit = () => {
    if (selectedOption === null || isAnswered || !currentQuestion) return;

    if (isAiSession) {
      // Client-side answer checking for AI sessions
      const correct = selectedOption === currentQuestion.correctOption;
      setIsAnswered(true);
      setIsCorrect(correct);
      setCorrectOption(currentQuestion.correctOption);
      if (correct) setStreak(s => s + 1);
      else setStreak(0);
      setLocalAnswers(prev => [...prev, {
        questionId: currentQuestion.id,
        selectedOption,
        isCorrect: correct,
        timeTakenSeconds: timeSpent,
      }]);
    } else {
      submitAnswer.mutate({
        sessionId: Number(sessionId),
        data: { questionId: currentQuestion.id, selectedOption, timeTakenSeconds: timeSpent }
      }, {
        onSuccess: (result) => {
          setIsAnswered(true);
          setIsCorrect(result.isCorrect);
          setCorrectOption(result.correctOption);
          if (result.isCorrect) setStreak(s => s + 1);
          else setStreak(0);
        }
      });
    }
  };

  const handleSkip = () => {
    if (isAnswered || !currentQuestion) return;

    if (isAiSession) {
      setIsAnswered(true);
      setIsCorrect(false);
      setCorrectOption(currentQuestion.correctOption);
      setStreak(0);
      // Don't add to localAnswers — skipped means no entry (counted as skipped)
    } else {
      submitAnswer.mutate({
        sessionId: Number(sessionId),
        data: { questionId: currentQuestion.id, selectedOption: 999, timeTakenSeconds: timeSpent }
      }, {
        onSuccess: (result) => {
          setIsAnswered(true);
          setIsCorrect(false);
          setCorrectOption(result.correctOption);
          setStreak(0);
        }
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      resetQuestionState();
    } else {
      finishQuiz();
    }
  };

  const resetQuestionState = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setCorrectOption(null);
    setTimeSpent(0);
  };

  const finishQuiz = () => {
    if (isAiSession) {
      // Compute results client-side
      const totalQuestions = questions.length;
      const correctCount = localAnswers.filter(a => a.isCorrect).length;
      const wrongCount = localAnswers.filter(a => !a.isCorrect).length;
      const skippedCount = totalQuestions - localAnswers.length;
      const totalTimeSeconds = localAnswers.reduce((s, a) => s + a.timeTakenSeconds, 0);
      const averageTimeSeconds = localAnswers.length > 0
        ? Math.round(totalTimeSeconds / localAnswers.length)
        : 0;
      const score = Math.round((correctCount / totalQuestions) * 100);

      // Compute best streak
      let bestStreak = 0;
      let cur = 0;
      for (const a of localAnswers) {
        if (a.isCorrect) { cur++; bestStreak = Math.max(bestStreak, cur); }
        else cur = 0;
      }

      const results = {
        sessionId,
        totalQuestions,
        correctCount,
        wrongCount,
        skippedCount,
        totalTimeSeconds,
        averageTimeSeconds,
        score,
        currentStreak: cur,
        bestStreak,
      };

      // Build answer key data for the answer-key page
      const answerKeyData = questions.map(q => {
        const userAns = localAnswers.find(a => a.questionId === q.id);
        return {
          questionId: q.id,
          questionText: q.text,
          options: q.options,
          correctOption: q.correctOption,
          selectedOption: userAns?.selectedOption ?? null,
          isCorrect: userAns?.isCorrect ?? null,
          explanation: q.explanation,
          year: q.year,
          source: q.source,
          difficulty: q.difficulty,
        };
      });

      sessionStorage.setItem(`quiz-results-${sessionId}`, JSON.stringify(results));
      sessionStorage.setItem(`ai-answer-key-${sessionId}`, JSON.stringify(answerKeyData));

      setIsCompleted(true);
      setCompletedSessionId(sessionId);
    } else {
      completeSession.mutate({ sessionId: Number(sessionId) }, {
        onSuccess: (results) => {
          sessionStorage.setItem(`quiz-results-${sessionId}`, JSON.stringify(results));
          setIsCompleted(true);
          setCompletedSessionId(sessionId);
        }
      });
    }
  };

  const handleGetMore = () => {
    if (!currentQuestion) return;
    if (isAiSession) {
      // For AI sessions, insert a new AI question inline using the getMoreQuestions endpoint
      getMoreQuestions.mutate({
        data: {
          concept: currentQuestion.concept,
          chapterId: 0,
          difficulty: (currentQuestion.difficulty as "easy" | "medium" | "hard") ?? "medium",
          excludeIds: questions.map(q => q.id)
        }
      }, {
        onSuccess: (newQuestions) => {
          setQuestions(prev => {
            const updated = [...prev];
            updated.splice(currentIndex + 1, 0, ...newQuestions);
            return updated;
          });
        }
      });
    } else {
      getMoreQuestions.mutate({
        data: {
          concept: currentQuestion.concept,
          chapterId: currentQuestion.chapterId,
          difficulty: 'medium',
          excludeIds: questions.map(q => q.id)
        }
      }, {
        onSuccess: (newQuestions) => {
          setQuestions(prev => {
            const updated = [...prev];
            updated.splice(currentIndex + 1, 0, ...newQuestions);
            return updated;
          });
        }
      });
    }
  };

  if (isCompleted && completedSessionId) {
    return <Results sessionId={completedSessionId} />;
  }

  if ((!isAiSession && sessionLoading) || questions.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col p-6 bg-background">
        <Skeleton className="h-4 w-full mb-8" />
        <Skeleton className="h-32 w-full mb-8 rounded-2xl" />
        <div className="space-y-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const difficultyColor =
    currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-green-200' :
    currentQuestion.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-red-100 text-red-700 border-red-200';

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-3xl mx-auto w-full shadow-2xl relative overflow-hidden">
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card relative z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground"><X size={24} /></Button>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Question {currentIndex + 1} of {questions.length}</span>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {streak >= 3 && (
            <div className="animate-in slide-in-from-right fade-in flex items-center bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-bold text-sm shadow-sm border border-orange-200">
              <Flame size={16} className="mr-1 fill-orange-500" /> {streak} Streak
            </div>
          )}
          <div className="flex items-center font-mono font-bold text-lg text-foreground w-16 justify-end">
            <Clock size={18} className="mr-2 text-muted-foreground" /> {formatTime(timeSpent)}
          </div>
        </div>
      </header>

      {/* Question Content */}
      <main className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="mb-6 flex flex-wrap gap-2">
          {currentQuestion.year && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              PYQ {currentQuestion.year} • {currentQuestion.source}
            </span>
          )}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${difficultyColor}`}>
            {currentQuestion.difficulty}
          </span>
          {currentQuestion.concept && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
              {currentQuestion.concept}
            </span>
          )}
        </div>

        {currentQuestion.diagram && (
          <div className="mb-6 rounded-2xl border-2 border-primary/20 bg-primary/5 overflow-x-auto">
            <div className="px-2 py-1.5 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Figure / Diagram</span>
            </div>
            <pre className="px-5 py-4 text-sm font-mono text-foreground leading-relaxed whitespace-pre overflow-x-auto">
              {currentQuestion.diagram}
            </pre>
          </div>
        )}

        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-8 leading-snug">
          {currentQuestion.text}
        </h2>

        <div className="space-y-4">
          {currentQuestion.options.map((option: string, idx: number) => {
            const isSelected = selectedOption === idx;
            let stateClass = "bg-card border-border hover:border-primary/50 hover:shadow-md text-foreground";

            if (isAnswered) {
              if (idx === correctOption) {
                stateClass = "bg-green-50 border-green-500 text-green-900 shadow-sm";
              } else if (isSelected && !isCorrect) {
                stateClass = "bg-red-50 border-red-500 text-red-900";
              } else {
                stateClass = "bg-card border-border opacity-50";
              }
            } else if (isSelected) {
              stateClass = "bg-primary/5 border-primary shadow-sm text-foreground";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={isAnswered}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center group ${stateClass}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 transition-colors ${
                  isAnswered && idx === correctOption ? 'bg-green-500 text-white' :
                  isAnswered && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                  isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-lg font-medium">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation Section */}
        {isAnswered && (
          <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in">
            <div className={`p-6 rounded-2xl border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`text-xl font-bold mb-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrect ? 'Excellent!' : 'Not quite right.'}
              </h3>
              <p className="text-foreground/80 font-medium leading-relaxed">{currentQuestion.explanation}</p>

              {!isCorrect && (
                <Button
                  variant="outline"
                  className="mt-6 font-bold w-full sm:w-auto text-primary border-primary/20 hover:bg-primary/10"
                  onClick={handleGetMore}
                  disabled={getMoreQuestions.isPending}
                >
                  {getMoreQuestions.isPending ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 text-yellow-500" />}
                  Generate Similar Question
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <footer className="fixed bottom-0 w-full max-w-3xl bg-card/80 backdrop-blur-xl border-t border-border p-4 md:p-6 flex items-center justify-between gap-4 z-20">
        {!isAnswered ? (
          <>
            <Button variant="ghost" onClick={handleSkip} className="font-bold text-muted-foreground uppercase tracking-wider" size="lg">
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedOption === null || submitAnswer.isPending}
              className="flex-1 max-w-xs font-bold text-lg py-6 rounded-2xl shadow-md"
            >
              {submitAnswer.isPending ? <Loader2 className="animate-spin" /> : 'Check Answer'}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleNext}
            disabled={completeSession.isPending}
            className="w-full font-bold text-xl py-8 rounded-2xl shadow-lg hover:scale-[1.02] transition-transform"
          >
            {completeSession.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'} <FastForward className="ml-2" />
          </Button>
        )}
      </footer>
    </div>
  );
}
