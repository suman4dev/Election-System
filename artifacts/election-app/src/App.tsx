import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import NotFound from '@/pages/not-found';
import VotePage from '@/pages/vote';
import AdminPage from '@/pages/admin';
import ResultsPage from '@/pages/results';

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/results" />
      </Route>
      <Route path="/vote/:boothId" component={VotePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/results" component={ResultsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
