import { redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "Bienvenida" };

export default async function OnboardingPage() {
  const { profile } = await requireSession({ allowNotOnboarded: true });
  if (profile.onboarded_at) redirect("/");
  return <OnboardingFlow email={profile.email ?? ""} />;
}
