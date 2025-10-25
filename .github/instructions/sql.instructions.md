---
applyTo: "**/*.sql"
description: SQL coding standards for Oracle Database
---

# SQL Guidelines for Oracle Database

## Formatting
- Write SQL keywords in UPPERCASE: SELECT, FROM, WHERE, JOIN, ORDER BY
- Use lowercase for table and column names
- Indent subqueries and JOIN clauses
- One clause per line for complex queries
- Example:
  ```sql
  SELECT e.employee_id, e.first_name, d.department_name
  FROM employees e
  JOIN departments d ON e.department_id = d.department_id
  WHERE e.hire_date >= ADD_MONTHS(SYSDATE, -12)
  ORDER BY e.hire_date DESC
  FETCH FIRST 100 ROWS ONLY
  ```

## Table Aliases
- Use meaningful aliases (e.g., `e` for employees, `d` for departments)
- Avoid single letters unless they're obvious (avoid `t1`, `t2`)
- Use aliases consistently throughout the query

## Column Selection
- Avoid SELECT * - specify columns explicitly
- Include table aliases for clarity in JOINs
- Use column aliases for computed columns
- Example: `SELECT e.salary * 12 as annual_salary`

## Result Limits
- Always limit results for large tables
- Prefer FETCH FIRST n ROWS ONLY over ROWNUM
- Use appropriate WHERE clauses
- Example: `FETCH FIRST 1000 ROWS ONLY`

## Performance
- Add WHERE clauses to limit scans
- Use indexes when available (consult DBA)
- Avoid functions on indexed columns in WHERE
- Use EXISTS instead of IN for subqueries when possible

## Date Handling
- Use SYSDATE for current date/time
- Use ADD_MONTHS, ADD_DAYS for date arithmetic
- Format dates with TO_CHAR when needed
- Example: `WHERE hire_date >= ADD_MONTHS(SYSDATE, -6)`

## Joins
- Use explicit JOIN syntax (not implicit with WHERE)
- Specify join type: INNER JOIN, LEFT JOIN, RIGHT JOIN
- Put join conditions in ON clause, filters in WHERE
- Example:
  ```sql
  SELECT e.name, d.dept_name
  FROM employees e
  LEFT JOIN departments d ON e.dept_id = d.id
  WHERE e.active = 'Y'
  ```

## Aggregations
- Always include GROUP BY for aggregate functions
- Use HAVING for filtering aggregates
- Order results with ORDER BY
- Example:
  ```sql
  SELECT department_id, COUNT(*) as emp_count
  FROM employees
  GROUP BY department_id
  HAVING COUNT(*) > 10
  ORDER BY emp_count DESC
  ```

## Comments
- Use -- for single-line comments
- Use /* */ for multi-line explanations
- Document complex logic
- Example:
  ```sql
  -- Get employees hired in last 6 months
  SELECT * FROM employees
  WHERE hire_date >= ADD_MONTHS(SYSDATE, -6)
  ```

## Common Functions
- String: UPPER(), LOWER(), SUBSTR(), CONCAT(), TRIM()
- Numeric: ROUND(), TRUNC(), MOD(), ABS()
- Date: TO_DATE(), TO_CHAR(), SYSDATE, ADD_MONTHS()
- Conditional: CASE WHEN, NVL(), COALESCE(), DECODE()

## Best Practices
- Test queries before deployment
- Check execution plans for slow queries
- Use bind variables (MCP server handles this)
- Never use DDL commands (DROP, CREATE, ALTER)
- Only SELECT statements allowed (read-only user)
