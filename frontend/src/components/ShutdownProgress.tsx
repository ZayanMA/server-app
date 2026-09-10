import { PowerOff } from "lucide-react";
import { LogPanel } from "./LogPanel";
import { Stepper } from "./Stepper";

const STEPS = ["Shutdown command sent", "Waiting for the server to power off"];

interface ShutdownProgressProps {
  log: string[];
}

export function ShutdownProgress({ log }: ShutdownProgressProps) {
  return (
    <div className="flex flex-col gap-3">
      <Stepper icon={PowerOff} title="Shutting Down" accent="red" steps={STEPS} currentIndex={1} />
      <LogPanel lines={log} autoScroll emptyText="Waiting for log output…" />
    </div>
  );
}
