import { Power } from "lucide-react";
import type { PowerPhase } from "../api";
import { Stepper } from "./Stepper";

const PHASES: PowerPhase[] = ["offline", "booting", "starting", "online"];

const STEPS = [
  "Waiting for the server to respond",
  "Booting — replying to ping",
  "Starting up — SSH coming online",
  "Online",
];

interface BootProgressProps {
  phase: PowerPhase;
}

export function BootProgress({ phase }: BootProgressProps) {
  return <Stepper icon={Power} title="Waking Up" accent="sky" steps={STEPS} currentIndex={PHASES.indexOf(phase)} />;
}
