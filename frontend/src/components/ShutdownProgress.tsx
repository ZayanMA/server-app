import { PowerOff } from "lucide-react";
import { Stepper } from "./Stepper";

const STEPS = ["Shutdown command sent", "Waiting for the server to power off"];

export function ShutdownProgress() {
  return <Stepper icon={PowerOff} title="Shutting Down" accent="red" steps={STEPS} currentIndex={1} />;
}
