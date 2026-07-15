
export type PlanKey = "free" | "starter" | "pro";

export interface Plan {
  key: PlanKey;
  name: string;
  price: number;
  priceLabel: string;
  generations: number;
  generationsLabel: string;
  voiceProfiles: number;
  features: string[];
  popular: boolean;
  priceId: string | null;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0",
    generations: 3,
    generationsLabel: "3 total generations",
    voiceProfiles: 1,
    features: [
      "3 total generations",
      "LinkedIn posts & Twitter threads",
      "1 voice profile",
      "Basic content extraction",
    ],
    popular: false,
    priceId: null,
  },
  starter: {
    key: "starter",
    name: "Starter",
    price: 19,
    priceLabel: "$19/mo",
    generations: 30,
    generationsLabel: "30 generations/month",
    voiceProfiles: 3,
    features: [
      "30 generations per month",
      "All output formats (Posts, Threads, Carousels)",
      "3 voice profiles",
      "YouTube + Blog + Podcast extraction",
      "Generation history",
      "Chrome extension",
    ],
    popular: true,
    priceId: null,
  },
  pro: {
    key: "pro",
    name: "Pro",
    price: 49,
    priceLabel: "$49/mo",
    generations: -1,
    generationsLabel: "Unlimited generations",
    voiceProfiles: -1,
    features: [
      "Unlimited generations",
      "All output formats",
      "Unlimited voice profiles",
      "Priority generation speed",
      "Chrome extension",
      "Export to Markdown",
      "Advanced tone matching",
    ],
    popular: false,
    priceId: null,
  },
};

export function getPlan(key: PlanKey): Plan {
  return PLANS[key];
}

export function canGenerate(plan: PlanKey, used: number): boolean {
  const planData = PLANS[plan];
  if (planData.generations === -1) return true;
  return used < planData.generations;
}

export function getRemainingGenerations(plan: PlanKey, used: number): number {
  const planData = PLANS[plan];
  if (planData.generations === -1) return Infinity;
  return Math.max(0, planData.generations - used);
}

export function getUsagePercentage(plan: PlanKey, used: number): number {
  const planData = PLANS[plan];
  if (planData.generations === -1) return 0;
  return Math.min(100, Math.round((used / planData.generations) * 100));
}