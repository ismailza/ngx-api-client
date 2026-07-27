# Security Policy

## Supported Versions

The following versions of `@ismailza/ngx-api-client` currently receive security updates.

| Version | Supported |
| :------ | :-------: |
| Latest stable release | ✅ |
| Older releases | ❌ |

We recommend always upgrading to the latest stable version to receive security fixes.

## Reporting a Vulnerability

If you believe you have found a security vulnerability, **please do not open a public GitHub issue**.

Instead, use GitHub's **Private vulnerability reporting** feature by clicking **Security** → **Report a vulnerability** in this repository.

When submitting a report, please include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- A proof of concept (if applicable)
- Suggested remediation (optional)

## Our Commitment

We will:

- Acknowledge receipt of your report as soon as reasonably possible.
- Investigate the reported issue.
- Keep you informed of our progress.
- Release a fix if the vulnerability is confirmed.
- Credit you for your responsible disclosure, unless you prefer to remain anonymous.

## Scope

Examples of security issues include:

- Exposure of sensitive information (e.g. authentication tokens, API keys, or personally identifiable information) through the library.
- Vulnerabilities that allow HTTP headers or requests to be modified in an unintended or insecure way.
- Security flaws in authentication or authorization helper features provided by the library.
- Vulnerabilities introduced by request retry, caching, or interceptor behavior that could compromise application security.
- Dependency vulnerabilities that affect the security of the library.
- Any issue that could allow an attacker to bypass intended security guarantees provided by the library.

General bugs, feature requests, configuration questions, and documentation improvements should be reported through GitHub Issues.

## Disclosure Policy

We follow a coordinated vulnerability disclosure process. Please avoid publicly disclosing security vulnerabilities until a fix has been released or a coordinated disclosure timeline has been agreed upon.
