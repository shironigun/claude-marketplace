# Worked API Test Cases

Concrete models for the three levels. The resource (orders) is an example; copy the format, granularity, and voice, not the domain.

---

## Contract

### Orders - Orders - Verify that the GET orders response conforms to the orderList schema.

```
Preconditions: Environment: QA | Account: 12345 | Auth: default bearer | Schema under test: orderListSchema

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Send a GET request to the orders list route for the test account | A response is returned with an HTTP status code |
| 2 | Assert the response status code | Status code is 200 |
| 3 | Assert the response Content-Type | Content-Type is application/json |
| 4 | Parse the response body against orderListSchema | The body parses successfully with no schema errors |
| 5 | Assert the items field | items is an array and each element carries a numeric id and a status string |
| 6 | Verify that the GET orders response conforms to the orderList schema | The parse succeeds and every documented field matches its declared type and nullability |
```
Actual Result:

### Orders - Orders - Verify that the GET orders response is rejected by the schema when a required field is missing.

```
Preconditions: Environment: QA | Account: 12345 | A captured/mocked response is available with the required id field removed from the first item

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Take the orders list response with items[0].id removed | The malformed body is available for validation |
| 2 | Parse the body against orderListSchema | The parse fails |
| 3 | Inspect the schema errors | The errors identify items[0].id as missing/required |
| 4 | Verify that the schema rejects a response missing a required field | Validation fails and points to the missing id field |
```
Actual Result:

---

## Endpoint — negative (auth)

### Orders - Orders - Verify that GET orders returns 401 when the bearer token is omitted.

```
Preconditions: Environment: QA | Account: 12345 | Auth: none (intentionally omitted)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Send a GET request to the orders list route with no Authorization header | A response is returned with an HTTP status code |
| 2 | Assert the response status code | Status code is 401 |
| 3 | Assert the response body | No order data is returned |
| 4 | Verify that GET orders is rejected without authentication | The endpoint returns 401 and no order data is returned |
```
Actual Result:

### Orders - Orders - Verify that POST orders returns 422 when a required field is missing.

```
Preconditions: Environment: QA | Account: 12345 | Auth: default bearer | Payload built without the required customerId field

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Send a POST request to the orders route with a payload omitting customerId | A response is returned with an HTTP status code |
| 2 | Assert the response status code | Status code is 422 (or 400 per the API contract) |
| 3 | Assert the error body | The error identifies customerId as a required field |
| 4 | Send a GET request to the orders list route | The order list is returned |
| 5 | Verify that no order was created | The order list does not contain a new order from the rejected request |
| 6 | Verify that POST orders rejects a payload missing a required field | The endpoint returns a validation error naming customerId and persists nothing |
```
Actual Result:

---

## Workflow — chaining + teardown

### Orders - Orders - Verify that an order is created, staged, and marked fulfilled successfully through chained API calls.

```
Preconditions: Environment: QA | Account: 12345 | Auth: default bearer | A valid customer exists to attach the order to

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Send a POST request to the orders route with a valid payload | Status code is 201 |
| 2 | Capture the created order id from the response | The response body contains a numeric id; record it as {orderId} |
| 3 | Send a PUT request to the order-stage route for {orderId} with stage "packed" | Status code is 200 and the order stage is "packed" |
| 4 | Send a PUT request to the order-status route for {orderId} with status "fulfilled" | Status code is 200 and the order status is "fulfilled" |
| 5 | Send a GET request to the order route for {orderId} | Status code is 200 and the response reflects status "fulfilled" |
| 6 | Send a DELETE (or archive) request for {orderId} to tear down the test data | Status code is 200/204 and the order is removed/archived |
| 7 | Verify that the order was created, staged, and fulfilled successfully through chained calls | Each step returned its expected status and the final GET showed status "fulfilled" before teardown |
```
Actual Result:

---

## What to notice

- **One request or one assertion per row** — status is its own row, schema parse its own, each field check its own.
- **Auth/seed live in Preconditions** — except when the test IS about auth (the 401 case makes the omission an explicit step).
- **Workflows capture and reuse ids** — `{orderId}` is captured in one row and fed to later rows; teardown is an explicit row before the final Verify.
- **Negative cases add a "nothing persisted" check** — a rejected create is confirmed by a follow-up GET, not assumed.
- **Every case ends on a `Verify that <title>` row** and leaves `Actual Result:` blank.
