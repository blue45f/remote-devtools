import { Mail, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { useAppStore } from "@/lib/store";

import { AuthShell } from "./SignIn";

/**
 * Sign-up scaffold. Captures form intent (plan from `?plan=`) and sends a
 * waitlist toast. Wire this to a real auth + waitlist API per LAUNCH.md.
 */
export default function SignUpPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  const plan = params.get("plan") ?? "free";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setTimeout(() => {
      setPending(false);
      toast.success("You're on the list", {
        description: `We'll email ${email} when the hosted ${plan} plan ships.`,
      });
      // Drop the visitor into the demo so they can keep exploring.
      setDemoMode(true);
      navigate("/dashboard");
    }, 800);
  };

  return (
    <AuthShell>
      <div className="text-center mb-6">
        <Badge variant="accent" size="sm" className="mb-3 capitalize">
          {plan} plan
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Create your workspace
        </h1>
        <p className="text-sm text-fg-subtle">
          Sign-ups are gated to the waitlist for now — drop your email and
          we'll let you in.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
            Full name
          </span>
          <Input
            type="text"
            required
            placeholder="Jane Cooper"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leadingIcon={<User />}
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-fg-subtle mb-1.5 block">
            Work email
          </span>
          <Input
            type="email"
            required
            placeholder="you@team.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leadingIcon={<Mail />}
            autoComplete="email"
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={pending}
        >
          {pending ? "Reserving your spot…" : "Join the waitlist"}
        </Button>
      </form>

      <p className="mt-7 text-center text-xs text-fg-subtle">
        Already have an account?{" "}
        <Link
          to="/sign-in"
          className="text-fg hover:underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-[11px] text-fg-faint">
        Or skip the wait — the open-source release is{" "}
        <a
          href="https://github.com/blue45f/remote-devtools"
          target="_blank"
          rel="noreferrer"
          className="hover:text-fg-subtle underline-offset-2 hover:underline"
        >
          ready to self-host
        </a>
        .
      </p>
    </AuthShell>
  );
}
