import { useEffect } from 'react';
import { useT } from '../i18n';
import { formatNumber, formatPercent, formatSalary, humanize, titleCase } from '../lib/format';
import { useSearchStore } from '../store/useSearchStore';
import BucketBars from './charts/BucketBars';
import BucketColumns from './charts/BucketColumns';
import BucketDonut from './charts/BucketDonut';
import ChartCard from './charts/ChartCard';
import { foldTail } from './charts/fold';
import Spinner from './Spinner';
import StatCard from './StatCard';

/** Connection bands are already display-ready ("501-1000"), so they pass through. */
const asis = (value: string): string => value;

/**
 * Sentinel for the donut's folded tail. A label that cannot collide with a real
 * `job_title_role` value, so the renderer can tell the invented bucket from a
 * dataset one and translate only that.
 */
const OTHER = '\u0000other';

export default function Dashboard() {
  const t = useT();
  const stats = useSearchStore((s) => s.stats);
  const error = useSearchStore((s) => s.statsError);
  const loadStats = useSearchStore((s) => s.loadStats);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (error) {
    return (
      <div className="notice p-6 text-sm" role="alert">
        <p className="font-medium text-danger">{t('dash.errorTitle')}</p>
        <p className="mt-1 text-ink-soft">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card flex items-center justify-center gap-3 p-12 text-sm text-muted">
        <Spinner className="h-5 w-5 text-brand" />
        {t('dash.loading')}
      </div>
    );
  }

  const { totals } = stats;
  // The API returns the ten biggest buckets, not a full partition, so the donut is
  // honest only about the share *within* that ten - which is what its subtitle says.
  const roleRows = foldTail(stats.byRole, 4, OTHER);
  const roleTotal = stats.byRole.reduce((sum, row) => sum + row.count, 0);
  const topCountry = stats.byCountry[0];

  // The folded tail is the one bucket label this app invents rather than reads from
  // the dataset, so it is the one that needs translating.
  const roleLabel = (label: string) => (label === OTHER ? t('value.other') : humanize(label));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t('stat.profiles')}
          value={formatNumber(totals.profiles)}
          hint={t('stat.profilesHint')}
          hero
          className="col-span-2"
        />
        <StatCard
          label={t('stat.contactable')}
          value={formatPercent(totals.withEmail, totals.profiles)}
          hint={t('stat.contactableHint', { count: formatNumber(totals.withEmail) })}
        />
        <StatCard label={t('stat.skills')} value={formatNumber(totals.skills)} hint={t('stat.skillsHint')} />
        <StatCard label={t('stat.companies')} value={formatNumber(totals.companies)} hint={t('stat.companiesHint')} />
        <StatCard label={t('stat.countries')} value={formatNumber(totals.countries)} hint={t('stat.countriesHint')} />
        <StatCard
          label={t('stat.avgConnections')}
          value={formatNumber(totals.avgConnections === null ? null : Math.round(totals.avgConnections))}
          hint={t('stat.avgConnectionsHint')}
        />
        <StatCard
          label={t('stat.avgExperience')}
          value={
            totals.avgYearsExperience === null
              ? '-'
              : t('stat.years', { years: formatNumber(totals.avgYearsExperience) })
          }
          hint={t('stat.avgExperienceHint')}
        />
      </div>

      <ChartCard
        title={t('chart.skillsTitle')}
        subtitle={t('chart.skillsSubtitle', { count: formatNumber(stats.topSkills.length) })}
        rows={stats.topSkills}
        unit={t('unit.skill')}
        format={titleCase}
        total={totals.profiles}
      >
        <BucketBars rows={stats.topSkills} format={titleCase} labelWidth={170} total={totals.profiles} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t('chart.roleTitle')}
          subtitle={t('chart.roleSubtitle', { count: formatNumber(roleTotal) })}
          rows={roleRows}
          unit={t('unit.role')}
          format={roleLabel}
        >
          <BucketDonut rows={roleRows} format={roleLabel} />
        </ChartCard>

        <ChartCard
          title={t('chart.connectionsTitle')}
          subtitle={t('chart.connectionsSubtitle')}
          rows={stats.byConnectionBand}
          unit={t('unit.connections')}
          format={asis}
          total={totals.profiles}
        >
          <BucketColumns rows={stats.byConnectionBand} height={244} total={totals.profiles} />
        </ChartCard>

        <ChartCard
          title={t('chart.industryTitle')}
          subtitle={t('chart.industrySubtitle')}
          rows={stats.byIndustry}
          unit={t('unit.industry')}
          format={titleCase}
          total={totals.profiles}
        >
          <BucketBars rows={stats.byIndustry} format={titleCase} labelWidth={160} total={totals.profiles} />
        </ChartCard>

        <ChartCard
          title={t('chart.companyTitle')}
          subtitle={t('chart.companySubtitle')}
          rows={stats.byCompany}
          unit={t('unit.company')}
          format={titleCase}
          total={totals.profiles}
        >
          <BucketBars rows={stats.byCompany} format={titleCase} labelWidth={160} total={totals.profiles} />
        </ChartCard>

        <ChartCard
          title={t('chart.salaryTitle')}
          subtitle={t('chart.salarySubtitle')}
          rows={stats.bySalaryBand}
          unit={t('unit.band')}
          format={formatSalary}
          total={totals.profiles}
        >
          <BucketBars rows={stats.bySalaryBand} format={formatSalary} labelWidth={128} total={totals.profiles} />
        </ChartCard>

        <ChartCard
          title={t('chart.countryTitle')}
          subtitle={
            topCountry
              ? t('chart.countrySubtitle', {
                  count: formatNumber(stats.byCountry.length),
                  label: titleCase(topCountry.label),
                  share: formatPercent(topCountry.count, totals.profiles),
                })
              : t('chart.countrySubtitleFallback')
          }
          rows={stats.byCountry}
          unit={t('unit.country')}
          format={titleCase}
          total={totals.profiles}
        >
          <BucketBars rows={stats.byCountry} format={titleCase} labelWidth={148} total={totals.profiles} />
        </ChartCard>
      </div>
    </div>
  );
}
