# Contributing to @ismailza/ngx-api-client

First of all, thank you for your interest in contributing to **@ismailza/ngx-api-client**! 🎉

Contributions of all kinds are welcome, including bug fixes, new features, documentation improvements, tests, and performance enhancements. Every contribution helps make the project better.

## Ways to Contribute

You can contribute by:

- Reporting bugs
- Suggesting new features
- Improving documentation
- Fixing bugs
- Adding or improving tests
- Enhancing performance
- Refactoring existing code
- Reviewing pull requests
- Participating in discussions

## Before You Start

Before working on a contribution, please:

1. Search existing issues and pull requests to avoid duplicate work.
2. For significant changes or new features, create a **Feature Request** using the appropriate GitHub issue template.
3. Wait for feedback before starting a large implementation.

Small bug fixes, documentation improvements, and typo fixes can generally be submitted directly as a pull request.

## Development Setup

### Prerequisites

Make sure you have the following installed:

- Node.js `^22.22.3`, `^24.15.0` or newer — the floor comes from the Angular CLI
  the workspace builds with, and an older release will refuse to run `ng`
- npm
- Git

### 1. Fork the Repository

Fork this repository to your GitHub account.

### 2. Clone Your Fork

```bash
git clone https://github.com/<your-github-username>/ngx-api-client.git
cd ngx-api-client
```

### 3. Configure the Upstream Remote

Add the original repository as the upstream remote.

```bash
git remote add upstream https://github.com/ismailza/ngx-api-client.git
```

Verify your remotes:

```bash
git remote -v
```

### 4. Install Dependencies

```bash
npm install
```

## Development Workflow

### Keep Your Fork Up to Date

Before starting new work, synchronize your fork with the upstream repository.

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### Create a Branch

Create a new branch from the latest `main` branch.

```bash
git checkout -b feat/your-feature-name
```

Use a descriptive branch name, for example:

- `feat/request-timeout`
- `fix/problem-details-parser`
- `docs/update-readme`
- `test/retry-interceptor`

### Make Your Changes

Please:

- Keep changes focused on a single concern.
- Follow the existing project architecture and coding style.
- Write clean, readable, and maintainable code.
- Add or update tests when appropriate.
- Update documentation when behavior changes.

### Validate Your Changes

Before opening a pull request, ensure the project builds successfully.

Build the project:

```bash
npm run build
```

Run the tests:

```bash
npm test
```

Run the linter:

```bash
npm run lint
```

### Compatibility Checks

The package supports a range of Angular majors, so a change that compiles
against the workspace's Angular can still break consumers on an older one. CI
runs these on every push; run them locally when you touch the public API, the
build setup or `peerDependencies`.

Verify the packaged artifact contains everything it should:

```bash
npm run build
npm run verify:package
```

Verify the package against every supported Angular major — this installs each
one into a throwaway project, so expect it to take a few minutes:

```bash
npm run compat
```

To check a single version while iterating:

```bash
npm run compat -- 17
```

See [`compat/README.md`](compat/README.md) for what each check covers and how to
extend the fixture. When you add a public export, reference it there — an export
no fixture touches is an export the matrix does not cover.

## Commit Messages

This project follows the **Conventional Commits** specification.

Using Conventional Commits helps us:

- Generate release notes automatically.
- Produce accurate changelogs.
- Support semantic versioning.
- Maintain a clear and searchable Git history.
- Automate the release process.

Use the appropriate commit type for your changes.

| Type       | Description                                 |
| ---------- | ------------------------------------------- |
| `feat`     | Introduces a new feature                    |
| `fix`      | Fixes a bug                                 |
| `docs`     | Documentation-only changes                  |
| `refactor` | Code improvements without changing behavior |
| `test`     | Adds or updates tests                       |
| `build`    | Changes to the build system or dependencies |
| `ci`       | Changes to CI/CD workflows                  |
| `chore`    | Project maintenance tasks                   |

Examples:

```text
feat: add timeout interceptor
fix: prevent duplicate retry requests
docs: improve installation guide
refactor: simplify request pipeline
test: add unit tests for retry interceptor
ci: update GitHub Actions workflow
chore: update development dependencies
```

## Pull Requests

Before submitting a pull request, please ensure that:

- The project builds successfully.
- All tests pass.
- Linting passes.
- Documentation has been updated when necessary.
- Your pull request focuses on a single logical change.

When opening a pull request:

- Provide a clear summary of your changes.
- Explain the motivation behind the change.
- Link the related issue when applicable (for example, `Closes #123`).
- Mention any breaking changes.

Please respond promptly to review feedback to help keep the review process efficient.

## Reporting Bugs

If you've found a bug, please use the **Bug Report** issue template.

Before creating a new issue, search existing issues to avoid duplicates. The template will guide you through providing the information needed to investigate the problem efficiently.

## Feature Requests

Have an idea for a new feature or enhancement?

Please use the **Feature Request** issue template and clearly describe:

- The problem you're trying to solve.
- Your proposed solution.
- Alternative approaches you've considered.
- Any additional context that may help.

## Security

If you discover a security vulnerability, **do not open a public GitHub issue**.

Please follow the instructions in [**SECURITY.md**](./SECURITY.md) to report it privately using GitHub's Private Vulnerability Reporting feature.

## Code of Conduct

By participating in this project, you agree to follow our [**CODE_OF_CONDUCT.md**](./CODE_OF_CONDUCT.md).

Please help us maintain a welcoming, respectful, and inclusive community.

## Questions

If you have a question that is not covered by the documentation, feel free to open a GitHub Discussion.

Thank you for contributing to **@ismailza/ngx-api-client**. Your contributions help improve the project for everyone.
