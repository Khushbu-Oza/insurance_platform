import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

const clients = [
  { name: "Emma Carter", policies: 2, status: "active" },
  { name: "Noah Wilson", policies: 1, status: "active" },
  { name: "Sophia Brooks", policies: 3, status: "quote" },
];

export default function AgentClientsPage() {
  return (
    <main className="portal-shell">
      <PageHeader
        title="Client Portfolio"
        description="Track customer policy status and action priorities."
      />

      <section className="kpi-grid">
        <StatCard label="Clients" value={`${clients.length}`} helper="Assigned accounts" />
        <StatCard label="Active Books" value="6" helper="In-force policies" />
      </section>

      <div className="table-wrap glass-card section-spaced">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Policies</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.name}>
                <td>{client.name}</td>
                <td>{client.policies}</td>
                <td>{client.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
