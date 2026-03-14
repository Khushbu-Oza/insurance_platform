export type RatingInput = {
  basePremium: number;
  factors: Record<string, string | number | boolean>;
};

export type RatingRule = {
  id: string;
  key: string;
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "in";
  value: string | number | boolean | Array<string | number | boolean>;
  adjustmentType: "multiplier" | "flat";
  adjustmentValue: number;
  priority: number;
};

export type RatingResult = {
  basePremium: number;
  finalPremium: number;
  appliedRules: Array<{
    id: string;
    key: string;
    adjustmentType: "multiplier" | "flat";
    adjustmentValue: number;
  }>;
};

function evaluateRule(
  currentValue: string | number | boolean | undefined,
  rule: RatingRule,
) {
  if (typeof currentValue === "undefined") return false;

  switch (rule.operator) {
    case "eq":
      return currentValue === rule.value;
    case "gt":
      return Number(currentValue) > Number(rule.value);
    case "gte":
      return Number(currentValue) >= Number(rule.value);
    case "lt":
      return Number(currentValue) < Number(rule.value);
    case "lte":
      return Number(currentValue) <= Number(rule.value);
    case "in":
      return Array.isArray(rule.value) && rule.value.includes(currentValue);
    default:
      return false;
  }
}

export function calculatePremium(
  input: RatingInput,
  rules: RatingRule[],
): RatingResult {
  let premium = input.basePremium;
  const appliedRules: RatingResult["appliedRules"] = [];

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const currentValue = input.factors[rule.key];
    if (!evaluateRule(currentValue, rule)) continue;

    if (rule.adjustmentType === "multiplier") {
      premium = premium * rule.adjustmentValue;
    } else {
      premium = premium + rule.adjustmentValue;
    }

    appliedRules.push({
      id: rule.id,
      key: rule.key,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
    });
  }

  return {
    basePremium: input.basePremium,
    finalPremium: Math.max(0, Number(premium.toFixed(2))),
    appliedRules,
  };
}
