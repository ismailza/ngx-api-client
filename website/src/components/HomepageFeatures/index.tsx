import type { ComponentProps, ReactNode } from 'react';
import Heading from '@theme/Heading';

import styles from './styles.module.css';

type IconProps = ComponentProps<'svg'>;

/** Decorative line icons — hidden from assistive tech, the heading carries the meaning. */
const Icon = ({ children, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

type FeatureItem = {
  title: string;
  icon: ReactNode;
  description: ReactNode;
};

const features: FeatureItem[] = [
  {
    title: 'URLs from configuration',
    icon: (
      <Icon className={styles.icon}>
        <path d="M9 15 15 9" />
        <path d="M10.5 5.5 12 4a4.24 4.24 0 0 1 6 6l-1.5 1.5" />
        <path d="M13.5 18.5 12 20a4.24 4.24 0 0 1-6-6l1.5-1.5" />
      </Icon>
    ),
    description: (
      <>
        Base URL, an optional path prefix and an optional version segment, assembled once and
        overridable per request. Your services just name the endpoint.
      </>
    ),
  },
  {
    title: 'Versioning, four ways',
    icon: (
      <Icon className={styles.icon}>
        <path d="M12 3v6" />
        <path d="M5 12a7 7 0 0 1 14 0" />
        <circle cx="12" cy="15" r="3" />
        <path d="M4 20h16" />
      </Icon>
    ),
    description: (
      <>
        URL segment, query parameter, custom header or media type — with your own naming, or turned
        off entirely. Pin a single call to an older version when you need to.
      </>
    ),
  },
  {
    title: 'One error shape',
    icon: (
      <Icon className={styles.icon}>
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
        <circle cx="12" cy="12" r="9" />
      </Icon>
    ),
    description: (
      <>
        RFC 9457 <code>problem+json</code>, a plain-text proxy page and a dropped connection all
        arrive as the same typed <code>ApiError</code>. Branch on <code>code</code>, never on prose.
      </>
    ),
  },
  {
    title: 'Retry that behaves',
    icon: (
      <Icon className={styles.icon}>
        <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
        <path d="M21 4v4h-4" />
        <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
        <path d="M3 20v-4h4" />
      </Icon>
    ),
    description: (
      <>
        Exponential backoff with jitter, <code>Retry-After</code> honoured, non-idempotent methods
        skipped by default. Configurable globally and per call.
      </>
    ),
  },
  {
    title: 'Per-request options',
    icon: (
      <Icon className={styles.icon}>
        <path d="M4 6h10" />
        <path d="M18 6h2" />
        <circle cx="16" cy="6" r="2" />
        <path d="M4 12h4" />
        <path d="M12 12h8" />
        <circle cx="10" cy="12" r="2" />
        <path d="M4 18h8" />
        <path d="M16 18h4" />
        <circle cx="14" cy="18" r="2" />
      </Icon>
    ),
    description: (
      <>
        Retry, loading, error handling and messages are decided per request and carried to the
        interceptors through <code>HttpContext</code> — not through shared mutable state.
      </>
    ),
  },
  {
    title: 'No UI dependency',
    icon: (
      <Icon className={styles.icon}>
        <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
        <path d="m3 7.5 9 4.5 9-4.5" />
        <path d="M12 12v9" />
      </Icon>
    ),
    description: (
      <>
        The library renders nothing. Plug in your own error and success handlers; the peer
        dependencies stay <code>@angular/core</code>, <code>@angular/common</code> and{' '}
        <code>rxjs</code>.
      </>
    ),
  },
];

function Feature({ title, icon, description }: FeatureItem) {
  return (
    <div className={styles.card}>
      {icon}
      <Heading as="h3" className={styles.cardTitle}>
        {title}
      </Heading>
      <p className={styles.cardBody}>{description}</p>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <Heading as="h2" className={styles.sectionHeading}>
          A policy layer, not another wrapper
        </Heading>
        <p className={styles.sectionLead}>
          Everything an ad-hoc <code>ApiService</code> accumulates over a project's lifetime —
          extracted, typed and made configurable.
        </p>

        <div className={styles.grid}>
          {features.map((feature) => (
            <Feature key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
