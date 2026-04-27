import { motion } from "framer-motion";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 size-20 rounded-full bg-accent/10 blur-2xl animate-pulse [animation-duration:3s]" />
        <div className="relative flex size-20 items-center justify-center rounded-3xl bg-bg-subtle border border-border">
          <Compass className="size-9 text-fg-subtle" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.2em] font-semibold text-fg-faint mb-3">
          <span className="h-px w-6 bg-border" />
          404
          <span className="h-px w-6 bg-border" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-fg mb-2">
          Lost in the network
        </h1>
        <p className="text-sm text-fg-subtle max-w-sm mb-6 mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get
          you back to a known route.
        </p>

        <div className="flex items-center justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/sessions">
              <ArrowLeft />
              All sessions
            </Link>
          </Button>
          <Button asChild variant="primary">
            <Link to="/dashboard">
              <Home />
              Dashboard
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
