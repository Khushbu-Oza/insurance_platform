type NumericRecord = Record<string, unknown>;

export type ExecutiveMetrics = {
  writtenPremium: number;
  earnedPremium: number;
  incurredLosses: number;
  paidLosses: number;
  outstandingReserves: number;
  billedAmount: number;
  collectedAmount: number;
  lossRatio: number;
  expenseRatio: number;
  combinedRatio: number;
  collectionRate: number;
  monthlyRecurringRevenue: number;
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function asNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function sumBy<T extends NumericRecord>(rows: T[], key: keyof T) {
  return round(rows.reduce((sum, row) => sum + asNumber(row[key]), 0));
}

export function calculateLossRatio(incurredLosses: number, earnedPremium: number) {
  if (!earnedPremium) return 0;
  return round((incurredLosses / earnedPremium) * 100);
}

export function calculateExpenseRatio(operatingExpense: number, earnedPremium: number) {
  if (!earnedPremium) return 0;
  return round((operatingExpense / earnedPremium) * 100);
}

export function calculateCombinedRatio(lossRatio: number, expenseRatio: number) {
  return round(lossRatio + expenseRatio);
}

export function calculateCollectionRate(collectedAmount: number, billedAmount: number) {
  if (!billedAmount) return 0;
  return round((collectedAmount / billedAmount) * 100);
}

export function calculateMonthlyRecurringRevenue(
  collectedAmount: number,
  daysInWindow: number,
) {
  if (!collectedAmount || !daysInWindow) return 0;
  const daily = collectedAmount / daysInWindow;
  return round(daily * 30);
}

type BuildExecutiveMetricsInput = {
  policies: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  expenseRatioAssumption?: number;
  daysInWindow?: number;
};

export function buildExecutiveMetrics({
  policies,
  claims,
  invoices,
  payments,
  expenseRatioAssumption = 0.28,
  daysInWindow = 30,
}: BuildExecutiveMetricsInput): ExecutiveMetrics {
  const writtenPremium = sumBy(policies, "written_premium");
  const earnedPremium = sumBy(invoices, "total_amount");
  const incurredLosses = sumBy(claims, "incurred_amount");
  const paidLosses = sumBy(claims, "paid_amount");
  const outstandingReserves = sumBy(claims, "reserve_amount");
  const billedAmount = earnedPremium;
  const collectedAmount = payments
    .filter((payment) => payment.status === "posted")
    .reduce((sum, payment) => sum + asNumber(payment.amount), 0);
  const roundedCollected = round(collectedAmount);

  const lossRatio = calculateLossRatio(incurredLosses, earnedPremium);
  const expenseRatio = round(expenseRatioAssumption * 100);
  const combinedRatio = calculateCombinedRatio(lossRatio, expenseRatio);
  const collectionRate = calculateCollectionRate(roundedCollected, billedAmount);
  const monthlyRecurringRevenue = calculateMonthlyRecurringRevenue(
    roundedCollected,
    daysInWindow,
  );

  return {
    writtenPremium,
    earnedPremium,
    incurredLosses,
    paidLosses,
    outstandingReserves,
    billedAmount,
    collectedAmount: roundedCollected,
    lossRatio,
    expenseRatio,
    combinedRatio,
    collectionRate,
    monthlyRecurringRevenue,
  };
}
