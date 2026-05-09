import { useParams, Link } from "wouter";
import { useGetAnswerKey, getGetAnswerKeyQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnswerKeyItem {
  questionId: number;
  questionText: string;
  options: string[];
  correctOption: number;
  selectedOption: number | null;
  isCorrect: boolean | null;
  explanation: string | null;
  year: number | null;
  source: string | null;
  difficulty: string;
}

export default function AnswerKey() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const isAiSession = sessionId?.startsWith("ai-");

  // For AI sessions, read from sessionStorage
  const aiAnswers: AnswerKeyItem[] | null = (() => {
    if (!isAiSession) return null;
    try {
      const stored = sessionStorage.getItem(`ai-answer-key-${sessionId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const numericSessionId = isAiSession ? 0 : Number(sessionId);
  const { data: apiAnswers, isLoading } = useGetAnswerKey(
    numericSessionId,
    { query: { enabled: !isAiSession, queryKey: getGetAnswerKeyQueryKey(numericSessionId) } }
  );

  const answers: AnswerKeyItem[] | undefined = isAiSession
    ? (aiAnswers ?? undefined)
    : (apiAnswers as AnswerKeyItem[] | undefined);

  const loading = !isAiSession && isLoading;

  return (
    <div className="min-h-[100dvh] bg-muted/30 pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/`}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft size={24} />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Answer Key</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 mt-4">
        {loading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)
        ) : (
          answers?.map((item, index) => {
            const isSkipped = item.selectedOption === null || item.selectedOption === -1 || item.selectedOption === 999;
            const statusColor = item.isCorrect ? 'bg-green-100 border-green-300 text-green-800' :
                               isSkipped ? 'bg-gray-100 border-gray-300 text-gray-800' :
                               'bg-red-100 border-red-300 text-red-800';

            return (
              <div key={item.questionId} className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                {/* Header Strip */}
                <div className={`px-6 py-3 flex items-center justify-between border-b border-white/20 ${statusColor}`}>
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
                    {item.isCorrect ? <Check size={18} /> : isSkipped ? <span className="w-4 h-0.5 bg-gray-500 rounded-full" /> : <X size={18} />}
                    Q{index + 1} - {item.isCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Wrong'}
                  </div>
                  <div className="flex gap-2">
                    {item.year && <span className="bg-white/50 px-2 py-0.5 rounded text-xs font-bold">{item.year}</span>}
                    <span className="bg-white/50 px-2 py-0.5 rounded text-xs font-bold uppercase">{item.difficulty}</span>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  {(item as AnswerKeyItem & { diagram?: string | null }).diagram && (
                    <div className="mb-5 rounded-2xl border-2 border-primary/20 bg-primary/5 overflow-x-auto">
                      <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/20">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Figure / Diagram</span>
                      </div>
                      <pre className="px-5 py-4 text-sm font-mono text-foreground leading-relaxed whitespace-pre overflow-x-auto">
                        {(item as AnswerKeyItem & { diagram?: string | null }).diagram}
                      </pre>
                    </div>
                  )}
                  <h3 className="text-xl font-extrabold text-foreground mb-6 leading-relaxed">{item.questionText}</h3>

                  <div className="space-y-3 mb-8">
                    {item.options.map((opt, idx) => {
                      const isCorrectOpt = idx === item.correctOption;
                      const isSelected = idx === item.selectedOption;

                      let optClass = "bg-muted text-muted-foreground border-transparent";
                      let icon = null;

                      if (isCorrectOpt) {
                        optClass = "bg-green-50 border-green-500 text-green-900 font-medium ring-1 ring-green-500";
                        icon = <Check size={18} className="text-green-600" />;
                      } else if (isSelected && !item.isCorrect) {
                        optClass = "bg-red-50 border-red-400 text-red-900 opacity-70 line-through";
                        icon = <X size={18} className="text-red-500" />;
                      }

                      return (
                        <div key={idx} className={`p-4 rounded-xl border-2 flex items-center justify-between ${optClass}`}>
                          <div className="flex items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${isCorrectOpt ? 'bg-green-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-background'}`}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span>{opt}</span>
                          </div>
                          {icon}
                        </div>
                      );
                    })}
                  </div>

                  {item.explanation && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                      <h4 className="font-bold text-primary mb-2 uppercase tracking-widest text-xs flex items-center">Explanation</h4>
                      <p className="text-foreground/80 leading-relaxed font-medium">{item.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
