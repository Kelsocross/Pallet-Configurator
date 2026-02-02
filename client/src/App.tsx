import Home from "./pages/Home";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <Switch>
        <Route path="/" component={Home} />
        <Route>404 Page Not Found</Route>
      </Switch>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
