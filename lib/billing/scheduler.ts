export type BillingFrequency = "monthly" | "quarterly" | "annual";

export type BillingScheduleItem = {
  installmentNumber: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: number;
};

type GenerateBillingScheduleInput = {
  totalAmount: number;
  startDate: string;
  frequency?: BillingFrequency;
  installmentCount?: number;
  dueDayOffset?: number;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function defaultInstallmentsForFrequency(frequency: BillingFrequency) {
  if (frequency === "annual") return 1;
  if (frequency === "quarterly") return 4;
  return 12;
}

function monthsPerInstallment(frequency: BillingFrequency) {
  if (frequency === "annual") return 12;
  if (frequency === "quarterly") return 3;
  return 1;
}

function splitAmount(totalAmount: number, parts: number) {
  const cents = Math.round(totalAmount * 100);
  const base = Math.floor(cents / parts);
  const remainder = cents % parts;

  return Array.from({ length: parts }, (_, index) => {
    const value = base + (index < remainder ? 1 : 0);
    return value / 100;
  });
}

export function generateBillingSchedule({
  totalAmount,
  startDate,
  frequency = "monthly",
  installmentCount,
  dueDayOffset = 0,
}: GenerateBillingScheduleInput): BillingScheduleItem[] {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("totalAmount must be a positive number.");
  }

  const installments = installmentCount || defaultInstallmentsForFrequency(frequency);
  if (!Number.isInteger(installments) || installments <= 0) {
    throw new Error("installmentCount must be a positive integer.");
  }

  const start = parseIsoDate(startDate);
  const months = monthsPerInstallment(frequency);
  const amounts = splitAmount(totalAmount, installments);

  return Array.from({ length: installments }, (_, index) => {
    const periodStartDate = addMonths(start, index * months);
    const nextPeriodStartDate = addMonths(periodStartDate, months);
    const periodEndDate = addDays(nextPeriodStartDate, -1);
    const dueDate = addDays(periodStartDate, dueDayOffset);

    return {
      installmentNumber: index + 1,
      periodStart: toIsoDate(periodStartDate),
      periodEnd: toIsoDate(periodEndDate),
      dueDate: toIsoDate(dueDate),
      amount: amounts[index],
    };
  });
}

export function calculateCommissionAmount(
  writtenPremium: number,
  commissionRate: number,
) {
  if (!Number.isFinite(writtenPremium) || !Number.isFinite(commissionRate)) {
    throw new Error("writtenPremium and commissionRate must be numeric.");
  }
  return Math.round(writtenPremium * commissionRate * 100) / 100;
}
