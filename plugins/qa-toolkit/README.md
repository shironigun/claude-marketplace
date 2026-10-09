# QA Toolkit

QA workflow automation for Claude Code — generate API and UI test cases,
convert failures to bug reports, and push test cases to your tracker.

## Skills

| Skill | Trigger | Description |
|---|---|---|
| `api-failure-to-bug` | `/qa-toolkit:api-failure-to-bug` | Convert an API failure into a structured bug report |
| `api-test-cases` | `/qa-toolkit:api-test-cases` | Generate test cases from an API spec or response |
| `testcase-to-tracker` | `/qa-toolkit:testcase-to-tracker` | Push generated test cases to your bug/issue tracker |
| `ui-test-cases` | `/qa-toolkit:ui-test-cases` | Generate UI test cases from a screen or user flow |

## Installation

Add the marketplace first:

```bash
claude plugin marketplace add shironigun/claude-marketplace
```

Then install this plugin:

```bash
claude plugin install qa-toolkit
```

## Usage

In any Claude Code session, invoke a skill by name:

```
/qa-toolkit:api-test-cases
```
