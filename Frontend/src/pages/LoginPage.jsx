import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {useTheme} from "@/context/ThemeContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      // Determine existing theme preference or system preference if not set
      // (This logic might already be in a ThemeProvider, but ensuring the class is correct helps)
      navigate("/dashboard");
    } catch (err) {
      console.log("error", err);
      setError("Invalid credentials. Please checking your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
        <Card className="border-border/50 shadow-xl bg-card/50 dark:bg-zinc-900/90 backdrop-blur-sm dark:border-zinc-800 dark:shadow-2xl dark:shadow-black/20">
          <CardHeader className="space-y-4 flex flex-col items-center pb-2">
            <div className="w-auto h-20 mb-4">
              <img
                src= {theme === "dark" ? "/images/logo_full_dark.png" : "/images/logo_full.png"}
                alt="InteliPark Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Welcome back
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your credentials to access the admin panel
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. admin@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) {
                      setError(null);
                    }
                  }}
                  required
                  className="bg-background/50"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    required
                    placeholder="Enter your password"
                    className="bg-background/50 pr-10"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>
              {error && (
                <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-0 pb-6">
            <div className="text-center text-xs text-muted-foreground">
              <span className="opacity-70">Powered by</span>{" "}
              <span className="font-semibold text-foreground/80">
                Intelisparkz
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
