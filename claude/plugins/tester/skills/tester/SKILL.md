---
name: tester
description: "This skill should be used when the user asks to \"write a test\", \"add tests\", \"write unit tests\", \"write a failing test\", \"test this function\", \"how should I test\", \"review my tests\", \"fix this test\", \"my test is failing\", \"testing approach\", \"TDD\", \"red green\", \"test pyramid\", \"test setup is complicated\", \"hard to test\", \"refactor for testability\", \"dependency injection for tests\", \"mock this\", \"test to interface\", or any question about testing strategy, test quality, test naming, or test failure messages. Acts as an expert testing coach and executor enforcing disciplined TDD and clean test design across any language or framework."
version: 0.1.0
---

# Tester

An expert testing coach and executor. Apply this skill whenever writing, reviewing, or advising on tests. The principles here are universal — language and framework details vary, but the discipline does not.

## Red/Green TDD — The Non-Negotiable Starting Point

Always follow red/green TDD. Never write implementation code before a covering test exists.

**The sequence:**
1. Write the test. Run it. Confirm it fails (red). If it passes without implementation, the test is wrong — fix it.
2. Write the minimum code to make the test pass (green). No more.
3. Refactor if needed, keeping tests green throughout.

Do not skip or abbreviate this sequence. A test written after the fact proves nothing; it was never red.

### Bug Fix Protocol: Replicate → Fix → Invert

For reported bugs, follow this exact three-step protocol — do not shortcut:

1. **Replicate:** Write a test that asserts the buggy behavior *exists*. Run it — it must pass. This confirms the test reaches the broken code path.
2. **Fix:** Implement the fix. The replication test now fails (the bug is gone). This is expected and is the red signal.
3. **Invert:** Flip the assertion so it asserts the correct behavior. The test now passes and acts as a permanent regression guard.

Never commit a test that asserts buggy behavior. The final committed test must assert correct behavior.

## The Test Pyramid

Shape the test suite deliberately:

- **Unit tests** — the broad base. Fast, isolated, numerous. Test one unit of behavior with all dependencies injected or mocked. Run in milliseconds. These should be written first and written often.
- **Integration tests** — the middle tier. Test that collaborating components work together. Slower than units; write fewer of them.
- **E2E tests** — the narrow top. Verify end-to-end user flows. Slowest; write the fewest. Never use E2E to cover what a unit test can cover.

Speed is a feature. A test suite that runs slowly gets run less often and written less often. Optimize aggressively for unit test speed.

## Code Design for Testability

Complicated test setup is a code smell. When a test requires extensive scaffolding to get the unit under test into a testable state, the problem is in the production code, not the test. Refactor the code.

**Design principles that make code testable:**

**Dependency Injection:** Never let a unit construct its own dependencies. Pass them in. This makes every dependency swappable in tests. Constructor injection is preferred; parameter injection is acceptable. Property injection is a last resort.

**Test to interfaces, not implementations:** Program against abstractions. Tests should bind to an interface or contract, not a concrete class. This decouples tests from implementation details and makes it easy to substitute fakes, stubs, and mocks.

**Layering and encapsulation:** Keep layers thin and well-separated. Business logic should not depend on I/O, frameworks, or infrastructure. A pure function with no side effects is the easiest thing in the world to test — aim for that shape wherever possible.

**Mocking:** Mock at the boundary. Inject a mock or stub for any collaborator that crosses an I/O boundary (network, filesystem, database, clock). Do not mock internal implementation details — that produces brittle tests that break on refactors without catching bugs.

When the test fight is real, stop. The fight is information: the code is not well-shaped. Refactor first, test second.

## Test Quality Standards

### Naming: Behavior Statements

Name every test as a precise statement of the behavior being verified. A reader should understand exactly what is being tested — and exactly what broke — from the test name alone, without reading the body.

**Patterns that work:**
- `returns_empty_list_when_cart_is_empty`
- `throws_validation_error_when_email_is_missing`
- `calculates_total_with_applied_discount`
- `does_not_send_email_when_user_is_unverified`

**Patterns to avoid:**
- `test1`, `testCart`, `test_it_works` — say nothing
- `testCartTotalIsCorrect` — vague about what "correct" means
- `verifyEmailBehavior` — describes nothing specific

A test suite whose names read like a specification is a test suite that pays dividends at 2am when something breaks in production.

### Failure Messages: Specific and Actionable

When a test fails it must tell the reader exactly what broke: what was expected, what was received, and ideally where to look. Generic assertion failures like `AssertionError: false is not true` are noise.

Use assertion libraries and matchers that produce human-readable output:
- Prefer `expect(result).toEqual({ id: 1, name: 'Alice' })` over `assert(result !== null)`
- Prefer `expect(fn).toThrow('Invalid email')` over `assert(threw)`
- Prefer `expect(spy).toHaveBeenCalledWith({ orderId: 42 })` over `assert(spy.called)`

Include context in custom assertion messages when the built-in output is ambiguous:
- `expect(statusCode, 'expected redirect after login').toBe(302)`

A good test failure is self-diagnosing. It tells you what broke and where to start fixing, without requiring you to re-run the test suite under a debugger.

### Readability

Tests should be easy to read and easy to write. Apply the Arrange/Act/Assert (AAA) structure:

```
// Arrange: set up the preconditions
const cart = new Cart();
cart.add(item({ price: 10 }));
cart.add(item({ price: 5 }));

// Act: exercise the behavior
const total = cart.total();

// Assert: verify the outcome
expect(total).toBe(15);
```

Keep each section lean. If the Arrange section is long, the code under test probably needs refactoring. If there are multiple Act/Assert pairs, split into multiple tests — one assertion of behavior per test.

Do not share state between tests. Each test must be independent and runnable in isolation. Shared mutable state is the most common source of order-dependent flakiness.

## When to Refactor vs. When to Test Around

If writing a test for existing code is difficult, evaluate the two paths:

1. **Refactor the code** to introduce injection points, extract pure functions, or flatten the dependency graph — then test the refactored code. This is almost always the right path.
2. **Test at a higher level** (integration or E2E) as a temporary measure while refactoring. Document it explicitly so it doesn't become permanent.

Never write a test that reaches into private internals, bypasses access control, or relies on specific execution order to pass. These are the most fragile tests in any codebase and actively harm maintainability.

## Anti-Patterns to Flag and Fix

Identify and correct these patterns on sight:

**Testing implementation, not behavior.** A test that breaks every time you rename a private method is not testing behavior — it's testing structure. Rewrite the test to assert observable outputs, not internal state or call order.

**Magic setup.** A test that requires reading three other files to understand what state it's running against is too complex. Extract a named builder or factory that communicates intent: `buildExpiredSubscription()` is better than a 12-line object literal.

**Assertion-free tests.** A test that calls a function but asserts nothing is not a test — it's a smoke screen. Every test must assert a specific, observable outcome.

**The omnibus test.** A single test that exercises five behaviors and asserts ten things will report one failure even when five things break. Split it: one behavior, one test, one clear failure signal.

**Mocking everything.** Over-mocking disconnects tests from real system behavior. If every collaborator is mocked, the test can pass while the real integration is broken. Mock at the boundary only — real collaborators within the same layer should be real.

**Ignoring flakiness.** A flaky test is a broken test. Do not mark it as skip/xfail and move on. Flakiness signals a real problem: shared state, time coupling, or a non-deterministic dependency. Fix it.

**Long-lived test data.** Shared fixtures that accumulate state across tests are a dependency on execution order. Create fresh data per test; clean up in teardown.

## Applying These Principles

When writing any test:
1. Confirm a failing state exists (red) before implementing
2. Name it as a behavior statement
3. Keep setup minimal — if it's not minimal, fix the code
4. Assert with specific, readable matchers
5. Confirm it passes (green) after implementation
6. Verify it belongs at the right pyramid level (prefer unit)

When reviewing tests:
- Flag any test without a behavior-statement name
- Flag any test with a long or complex setup block
- Flag any test that asserts on implementation details rather than behavior
- Flag any assertion that would produce a useless failure message
- Flag any test that cannot run in isolation

For detailed patterns by language and framework, see `references/patterns.md`.
