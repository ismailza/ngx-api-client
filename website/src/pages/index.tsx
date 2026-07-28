import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CodeBlock from '@theme/CodeBlock';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

const configSnippet = `provideApi({
  baseUrl: 'https://api.example.com',
  prefix: 'api',
  version: 1,
  versioning: 'url',
  retry: { maxRetries: 3, initialDelay: 1000 },
});`;

const serviceSnippet = `@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);

  list(page: number, size: number) {
    return this.api.getPage<Order>('/orders', page, size);
  }
}`;

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={styles.hero}>
      <div className="container">
        <div className={styles.heroInner}>
          <p className={styles.badge}>Angular 17+ · MIT licensed · zero UI dependencies</p>

          <Heading as="h1" className={styles.title}>
            {siteConfig.title}
          </Heading>

          <p className={styles.tagline}>
            <code>HttpClient</code> gives you a request. It doesn&apos;t give you a policy. This
            library is the versioning, error normalisation, retry and loading logic every Angular
            app rewrites — extracted and made configurable.
          </p>

          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started/quick-start"
            >
              Get started
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/intro">
              Why this exists
            </Link>
          </div>

          <div className={styles.install}>
            <CodeBlock language="bash">npm install @ismailza/ngx-api-client</CodeBlock>
          </div>
        </div>
      </div>
    </header>
  );
}

function Showcase() {
  return (
    <section className={styles.showcase}>
      <div className="container">
        <Heading as="h2" className={styles.showcaseHeading}>
          Configure once, then just name the endpoint
        </Heading>
        <p className={styles.showcaseLead}>
          Where the URL comes from, what happens on a 503, and how a failure reaches the user are
          decisions you make in one place — not in every service.
        </p>

        <div className={styles.showcaseGrid}>
          <div className={styles.step}>
            <Heading as="h3" className={styles.stepTitle}>
              1. Set the policy in <code>app.config.ts</code>
            </Heading>
            <CodeBlock language="ts">{configSnippet}</CodeBlock>
          </div>

          <div className={styles.step}>
            <Heading as="h3" className={styles.stepTitle}>
              2. Write services that say nothing about it
            </Heading>
            <CodeBlock language="ts">{serviceSnippet}</CodeBlock>
          </div>
        </div>

        <div className={styles.result}>
          <p className={styles.resultText}>
            <code>list(0, 20)</code> requests
            <br />
            <code className={styles.resultUrl}>
              https://api.example.com/api/v1/orders?page=0&amp;size=20
            </code>
            <br />
            retries on a 503, normalises any failure into one <code>ApiError</code>, and toggles a
            loading signal on the way.
          </p>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className={styles.closing}>
      <div className="container">
        <Heading as="h2">Ready to drop it in?</Heading>
        <p className={styles.closingText}>
          Install the package, add <code>provideApi()</code> and pick your interceptors. Nothing
          else in your application has to change.
        </p>
        <Link className="button button--primary button--lg" to="/docs/getting-started/installation">
          Read the installation guide
        </Link>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <Showcase />
        <Closing />
      </main>
    </Layout>
  );
}
