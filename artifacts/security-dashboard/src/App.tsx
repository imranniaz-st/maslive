import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Tools from "@/pages/tools";
import ToolDetail from "@/pages/tool-detail";
import Scans from "@/pages/scans";
import ScanDetail from "@/pages/scan-detail";
import CronJobs from "@/pages/cron-jobs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tools" component={Tools} />
        <Route path="/tools/:id" component={ToolDetail} />
        <Route path="/scans" component={Scans} />
        <Route path="/scans/:id" component={ScanDetail} />
        <Route path="/cron-jobs" component={CronJobs} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  // Ensure dark mode is applied
  if (typeof window !== "undefined") {
    document.documentElement.classList.add("dark");
  }

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