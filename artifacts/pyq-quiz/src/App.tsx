import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import QuizSetup from "@/pages/quiz-setup";
import Quiz from "@/pages/quiz";
import Results from "@/pages/results";
import AnswerKey from "@/pages/answer-key";
import Profile from "@/pages/profile";

const queryClient = new QueryClient();

function ResultsRoute() {
  return <Results />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/quiz-setup" component={QuizSetup} />
      <Route path="/quiz/:sessionId" component={Quiz} />
      <Route path="/results/:sessionId" component={ResultsRoute} />
      <Route path="/answer-key/:sessionId" component={AnswerKey} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
