import { useEffect } from 'react';
import { formatNumber, formatSalary, humanize, titleCase } from '../lib/format';
import { useSearchStore } from '../store/useSearchStore';
import BucketBars from './charts/BucketBars';
import BucketColumns from './charts/BucketColumns';
import BucketDonut from './charts/BucketDonut';
import ChartCard from './charts/ChartCard';
import { foldTail } from './charts/fold';
import Spinner from './Spinner';
import StatCard from './StatCard';

const asis = (value: string): string => value;
const percent = (part: number, whole: number): string => (whole === 0 ? '-' : `${Math.round((part / whole) * 100)}%`);

export default function Dashboard() {
  const stats = useSearchStore((s) => s.stats);
  const error = useSearchStore((s) => s.statsError);
  const loadStats = useSearchStore((s) => s.loadStats);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (error) {
    return (
      <div className="card border-red-500/40 bg-red-500/5 p-6 text-sm" role="alert">
        <p className="font-medium text-red-300">Could not load the dashboard</p>
        <p className="mt-1 text-slate-300">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card flex items-center justify-center gap-3 p-12 text-sm text-muted">
        <Spinner className="h-5 w-5 text-brand" />
        Aggregating the dataset...
      </div>
    );
  }

  const { totals } = stats;
  // The API returns the ten biggest buckets, not a full partition, so the donut is
  // honest only about the share *within* that ten - which is what its subtitle says.
  const roleRows = foldTail(stats.byRole, 4);
  const roleTotal = stats.byRole.reduce((sum, row) => sum + row.count, 0);
  const topCountry = stats.byCountry[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Profiles indexed"
          value={formatNumber(totals.profiles)}
          hint="Parsed from the source file in ./data"
          hero
          className="col-span-2"
        />
        <StatCard
          label="Contactable"
          value={percent(totals.withEmail, totals.profiles)}
          hint={`${formatNumber(totals.withEmail)} have an email on file`}
        />
        <StatCard label="Distinct skills" value={formatNumber(totals.skills)} hint="Across all profiles" />
        <StatCard label="Companies" value={formatNumber(totals.companies)} hint="Current employers" />
        <StatCard label="Countries" value={formatNumber(totals.countries)} hint="With at least one profile" />
        <StatCard
          label="Avg connections"
          value={formatNumber(totals.avgConnections === null ? null : Math.round(totals.avgConnections))}
          hint="Mean across profiles that report a count"
        />
        <StatCard
          label="Avg experience"
          value={totals.avgYearsExperience === null ? '-' : `${totals.avgYearsExperience} yrs`}
          hint="Inferred from the work history"
        />
      </div>

      <ChartCard
        title="Most common skills"
        subtitle={`Profiles listing each skill, top ${stats.topSkills.length}`}
        rows={stats.topSkills}
        unit="Skill"
        format={titleCase}
        total={totals.profiles}
      >
        <BucketBars rows={stats.topSkills} format={titleCase} labelWidth={170} total={totals.profiles} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Role mix"
          subtitle={`Share of the ${formatNumber(roleTotal)} profiles in the ten biggest roles`}
          rows={roleRows}
          unit="Role"
          format={humanize}
        >
          <BucketDonut rows={roleRows} format={humanize} />
        </ChartCard>

        <ChartCard
          title="Network size"
          subtitle="Profiles by number of LinkedIn connections"
          rows={stats.byConnectionBand}
          unit="Connections"
          format={asis}
          total={totals.profiles}
        >
          <BucketColumns rows={stats.byConnectionBand} height={244} total={totals.profiles} />
        </ChartCard>

        <ChartCard
          title="Industries"
          subtitle="Top 10 by profile count"
          rows={stats.byIndustry}
          unit="Industry"
          format={titleCase}
          total={totals.profiles}
        >
          <BucketBars rows={stats.byIndustry} format={titleCase} labelWidth={160} total={totals.profiles} />
        </ChartCard>

        <ChartCard
          title="Employers"
          subtitle="Top 10 current companies"
          rows={stats.byCompany}
          unit="Company"
          format={titleCase}
          total={totals.profiles}
        >
          <BucketBars rows={stats.byCompany} format={titleCase} labelWidth={160} total={totals.profiles} />
        </ChartCard>

        <ChartCard
          title="Inferred salary"
          subtitle="Profiles per band, lowest first"
          rows={stats.bySalaryBand}
          unit="Band"
          format={formatSalary}
          total={totals.profiles}
        >
          <BucketBars rows={stats.bySalaryBand} format={formatSalary} unit="profiles" labelWidth={128} total={totals.profiles} />
        </ChartCard>

        <ChartCard
          title="Countries"
          subtitle={
            topCountry
              ? `Top ${stats.byCountry.length} · ${titleCase(topCountry.label)} holds ${percent(topCountry.count, totals.profiles)}`
              : 'Top 10 by profile count'
          }
          rows={stats.byCountry}
          unit="Country"
          format={titleCase}
          total={totals.profiles}
        >
          <BucketBars rows={stats.byCountry} format={titleCase} labelWidth={148} total={totals.profiles} />
        </ChartCard>
      </div>
    </div>
  );
}
