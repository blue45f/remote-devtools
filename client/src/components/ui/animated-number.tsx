import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className,
  duration = 800,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    damping: 30,
    stiffness: 120,
    duration: duration / 1000,
  });
  const display = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return (
    <motion.span className={cn("tabular-nums", className)}>
      {display}
    </motion.span>
  );
}
