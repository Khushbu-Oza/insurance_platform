import { PageHeader } from "@/components/ui/PageHeader";

const payments = [
  { date: "2026-03-01", amount: 192, method: "ACH", status: "paid" },
  { date: "2026-02-01", amount: 192, method: "Card", status: "paid" },
  { date: "2026-04-01", amount: 192, method: "ACH", status: "scheduled" },
];

export default function PolicyholderPaymentsPage() {
  return (
    <main className="portal-shell">
      <PageHeader
        title="Payments"
        description="Review payment history and upcoming bill schedule."
      />

      <div className="table-wrap glass-card section-spaced">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={`${payment.date}-${payment.status}`}>
                <td>{payment.date}</td>
                <td>${payment.amount.toFixed(2)}</td>
                <td>{payment.method}</td>
                <td>{payment.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
