# Testing Patterns Reference

Detailed patterns by context. These supplement the core principles in SKILL.md.

## Naming Conventions by Language

### TypeScript/JavaScript (Jest/Vitest)
```ts
describe('Cart', () => {
  describe('total()', () => {
    it('returns 0 when cart is empty', () => { ... });
    it('sums item prices without discount', () => { ... });
    it('applies percentage discount to subtotal', () => { ... });
    it('throws when discount exceeds 100%', () => { ... });
  });
});
```

### Python (pytest)
```python
def test_returns_empty_list_when_no_items_match():
def test_raises_value_error_when_email_is_blank():
def test_calculates_total_with_applied_discount():
```

### Go
```go
func TestCart_Total_ReturnsZeroWhenEmpty(t *testing.T) {}
func TestCart_Total_SumsItemPrices(t *testing.T) {}
func TestCart_AddItem_ReturnsErrorWhenPriceIsNegative(t *testing.T) {}
```

## Dependency Injection Patterns

### Constructor injection (preferred)
```ts
class OrderService {
  constructor(
    private readonly repo: OrderRepository,  // interface, not concrete class
    private readonly mailer: Mailer,
    private readonly clock: Clock,
  ) {}
}

// In test:
const service = new OrderService(fakeRepo, fakeMailer, fakeClock);
```

### Parameter injection (when constructor injection is impractical)
```ts
function processOrder(order: Order, clock: Clock = systemClock): Result {}

// In test:
processOrder(order, fixedClock('2024-01-01'));
```

### Module-level injection (for framework-constrained code)
```ts
// Expose a factory or setter that tests can use
export function createHandler(deps: Deps) { ... }
```

## Mocking Strategy

**Mock at the boundary.** The boundary is any I/O operation:
- HTTP calls → mock the HTTP client, not the business logic
- Database reads/writes → inject a repository interface, use a fake implementation
- Filesystem → inject an abstraction; use a real temp directory in integration tests
- Clock/time → inject a `Clock` interface; pass a fixed clock in tests
- Random/UUID → inject a generator; pass a deterministic one in tests

**Do NOT mock:**
- Pure functions — just call them
- Data transfer objects — construct them directly
- Internal collaborators within the same bounded context

## Assertion Quality Examples

### TypeScript/Vitest
```ts
// Bad — useless on failure
expect(result).toBeTruthy();

// Good — self-documenting failure
expect(result).toEqual({ id: 1, status: 'active', name: 'Alice' });
expect(result.errors).toHaveLength(2);
expect(result.errors[0]).toMatchObject({ field: 'email', code: 'REQUIRED' });

// With context message
expect(response.status, 'expected redirect after successful login').toBe(302);
```

### Python
```python
# Bad
assert result

# Good
assert result == {'id': 1, 'status': 'active'}
assert len(result.errors) == 2, f"expected 2 errors, got {result.errors}"
```

## AAA Template

```ts
it('applies discount to cart total', () => {
  // Arrange
  const cart = new Cart(stubRepo());
  cart.add(item({ price: 100 }));
  const discount = new PercentageDiscount(10);

  // Act
  const total = cart.applyDiscount(discount).total();

  // Assert
  expect(total).toBe(90);
});
```

Each section should be clearly separated (blank lines). Never mix Act and Assert steps. If multiple asserts are needed, check whether multiple behaviors are being tested — if so, split into multiple tests.

## Flakiness Prevention

Common causes and fixes:

| Cause | Fix |
|---|---|
| Shared mutable state between tests | `beforeEach` to reset; never use module-level mutable singletons |
| Time-dependent assertions | Inject a fixed clock; never use `Date.now()` in logic under test |
| Network calls | Mock at the HTTP client level |
| File system | Use temp directories with cleanup in `afterEach` |
| Random data | Inject a seeded RNG or fixed value generator |
| Async leaks | Ensure all timers/promises are awaited or cleared in teardown |

## Test Pyramid Enforcement

Use this heuristic to decide where a test belongs:

| Question | Unit | Integration | E2E |
|---|---|---|---|
| Tests a single function or class? | ✅ | | |
| Tests collaboration between 2+ real components? | | ✅ | |
| Tests a complete user flow through the UI/API? | | | ✅ |
| Runs in < 10ms? | ✅ | | |
| Requires a running process (DB, server)? | | ✅ | ✅ |
| Can be replaced by a lower-level test? | | Move down | Move down |

If an E2E test is the only thing covering a specific branch of business logic, that's a sign the business logic needs to be extracted and unit-tested directly.
