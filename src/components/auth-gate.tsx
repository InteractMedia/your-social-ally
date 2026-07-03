import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createInitialUser, hasAnyUser } from "@/lib/auth.functions";
import logoAsset from "@/assets/logo-zoetbezorgen.avif.asset.json";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  return <>{children}</>;
}

function AuthScreen() {
  const check = useServerFn(hasAnyUser);
  const createUser = useServerFn(createInitialUser);
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    check().then((r) => setNeedsBootstrap(!r.exists)).catch(() => setNeedsBootstrap(false));
  }, [check]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (needsBootstrap) {
        await createUser({ data: { email, password } });
        toast.success("Account aangemaakt — je wordt ingelogd.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-border/60 shadow-lg">
        <CardHeader className="items-center text-center">
          <img src={logoAsset.url} alt="" className="mb-2 h-12 w-12 rounded-md object-contain" />
          <CardTitle className="text-lg">
            {needsBootstrap ? "Account aanmaken" : "Log in op SocialCockpit"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {needsBootstrap
              ? "Je bent de eerste gebruiker — maak nu je beheerder-account aan."
              : "Alleen genodigde gebruikers hebben toegang."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                autoComplete={needsBootstrap ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {needsBootstrap && (
                <p className="text-[11px] text-muted-foreground">Minimaal 8 tekens.</p>
              )}
            </div>
            <Button type="submit" className="w-full gap-1.5" disabled={busy || needsBootstrap === null}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {needsBootstrap ? "Account maken & inloggen" : "Inloggen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
