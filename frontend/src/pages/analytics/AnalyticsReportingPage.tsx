import {
  BarChart3,
  BrainCircuit,
  Database,
  Download,
  FileText,
  GitMerge,
  Server,
} from 'lucide-react'

const workflowSteps = [
  {
    icon: Database,
    title: 'PostgreSQL',
    text: 'Agrégations SQL des volumes, fraudes, statuts et méthodes de paiement.',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  {
    icon: BrainCircuit,
    title: 'FastAPI IA',
    text: 'GET /api/v1/metrics : précision, rappel, F1-score et transactions analysées.',
    tone: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  },
  {
    icon: GitMerge,
    title: 'Agrégation',
    text: 'NestJS consolide les résultats métier et les métriques de détection de fraude.',
    tone: 'border-primary-500/40 bg-primary-500/10 text-primary-300',
  },
  {
    icon: BarChart3,
    title: 'Rendu React',
    text: 'Les KPIs, tendances et alertes sont affichés dans les graphiques du dashboard.',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
]

export default function AnalyticsReportingPage() {
  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-500/10 p-2 text-primary-400">
            <LineChartIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-50">Analytics & Reporting</h1>
            <p className="mt-1 text-dark-400">Workflow de consolidation, visualisation et export des rapports.</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <Server size={17} />
          <span>Workflow prêt côté interface. Les endpoints Reporting et Export NestJS restent à connecter.</span>
        </div>
      </header>

      <section aria-labelledby="workflow-title">
        <div className="mb-4 flex items-center gap-2">
          <GitMerge size={19} className="text-primary-400" />
          <h2 id="workflow-title" className="text-lg font-semibold text-dark-50">Workflow Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <article key={step.title} className="relative rounded-xl border border-dark-700 bg-dark-800 p-5">
                <span className="absolute right-4 top-4 text-xs font-semibold text-dark-500">0{index + 1}</span>
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg border ${step.tone}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-dark-100">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-dark-400">{step.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="reporting-title" className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-dark-700 bg-dark-800 p-6">
          <div className="flex items-center gap-3">
            <FileText className="text-primary-400" size={20} />
            <h2 id="reporting-title" className="font-semibold text-dark-50">Reporting</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-dark-400">Les rapports regroupent les flux financiers par canal, les statuts d'opération et les indicateurs de fraude.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {['Mobile Money', 'Carte', 'Virement', 'QR'].map((channel) => (
              <div key={channel} className="rounded-lg border border-dark-700 bg-dark-900/50 px-3 py-2 text-dark-300">{channel}</div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-dark-700 bg-dark-800 p-6">
          <div className="flex items-center gap-3">
            <Download className="text-emerald-400" size={20} />
            <h2 className="font-semibold text-dark-50">Export de rapports</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-dark-400">Le Service Export préparera un téléchargement sécurisé au format CSV ou PDF.</p>
          <div className="mt-5 flex gap-3">
            <button type="button" disabled className="rounded-lg border border-dark-600 px-4 py-2 text-sm text-dark-500">Exporter CSV</button>
            <button type="button" disabled className="rounded-lg border border-dark-600 px-4 py-2 text-sm text-dark-500">Exporter PDF</button>
          </div>
        </article>
      </section>
    </div>
  )
}

function LineChartIcon() {
  return <BarChart3 size={22} />
}