# datagen

A CLI tool for developers to populate PostgreSQL and MongoDB databases with realistic fake data — fast, schema-driven, and reproducible.

Stop writing seed scripts by hand. Define your schema once and generate hundreds of rows in seconds.

---

## Installation

**Requires Node.js 18+**

```bash
# Clone and install dependencies
git clone https://github.com/jircik/DataGenerator-Cli-Tool.git
cd datagen
npm install

# Run during development
npx tsx src/cli/index.ts --help

# Or link globally
npm run build
npm link
datagen --help
```

---

## Quick Start

```bash
# 1. Connect to your database
datagen connect "postgresql://user:pass@localhost:5432/mydb"

# 2. Create a schema file
mkdir .datagen && touch .datagen/users.schema.yaml

# 3. Populate
datagen populate .datagen/users.schema.yaml --count 50
```

---

## Commands

### `datagen connect <connection_string>`

Saves the connection and tests it before storing. Detects the database type automatically from the URI prefix.

```bash
datagen connect "postgresql://user:pass@localhost:5432/mydb"
datagen connect "mongodb://user:pass@localhost:27017/mydb?authSource=admin"

# Force a specific type
datagen connect "mydb://localhost:5432/mydb" --type postgres
```

---

### `datagen disconnect`

Clears the active connection.

```bash
datagen disconnect
```

---

### `datagen status`

Shows the currently saved connection.

```bash
datagen status
# ℹ Connected to PostgreSQL at localhost:5432/mydb
```

---

### `datagen populate <schema_file>`

Reads a schema file, generates fake records, and inserts them into the connected database.

```bash
datagen populate .datagen/users.schema.yaml --count 100

# Preview without inserting
datagen populate .datagen/users.schema.yaml --count 10 --dry-run
```

**Flags**

| Flag | Description | Default |
|---|---|---|
| `--count <n>` | Number of records to generate | `10` |
| `--dry-run` | Print records to stdout, skip insert | — |

---

## Schema Files

Schema files live in your project's `.datagen/` folder and can be committed to version control so your whole team shares the same seed data.

### PostgreSQL

```yaml
# .datagen/users.schema.yaml
target: postgres
table: users
fields:
  id:
    type: string.uuid
    primary: true
  name: person.fullName
  email: internet.email
  age:
    type: number.int
    min: 18
    max: 80
  active:
    type: datatype.boolean
  created_at: date.past
```

### MongoDB

```yaml
# .datagen/orders.schema.yaml
target: mongo
collection: orders
fields:
  status:
    type: helpers.arrayElement
    values: ['pending', 'paid', 'shipped', 'cancelled']
  amount:
    type: number.float
    min: 10
    max: 9999
    precision: 2
```

Fields can be written as a **shorthand string** (`name: person.fullName`) or as an **object** with options (`type`, `min`, `max`, etc.).

---

## Supported Field Types

All types map directly to [Faker.js](https://fakerjs.dev/api/) methods using the format `namespace.method`.

| Type | Example output |
|---|---|
| `person.fullName` | `"John Smith"` |
| `person.firstName` | `"John"` |
| `person.lastName` | `"Smith"` |
| `internet.email` | `"john@example.com"` |
| `internet.url` | `"https://example.com"` |
| `string.uuid` | `"a1b2c3d4-..."` |
| `number.int` + `min`/`max` | `42` |
| `number.float` + `min`/`max`/`precision` | `3.14` |
| `datatype.boolean` | `true` |
| `date.past` | ISO date string |
| `date.future` | ISO date string |
| `date.recent` | ISO date string |
| `lorem.sentence` | `"Lorem ipsum..."` |
| `lorem.paragraphs` | `"Lorem ipsum..."` |
| `location.city` | `"São Paulo"` |
| `location.country` | `"Brazil"` |
| `location.streetAddress` | `"123 Main St"` |
| `commerce.productName` | `"Awesome Chair"` |
| `helpers.arrayElement` + `values` | one of the array |

---

## Stack

| | |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| CLI | Commander.js |
| Fake data | @faker-js/faker |
| Schema parsing | js-yaml + zod |
| Postgres | pg |
| MongoDB | mongodb |
| Terminal output | chalk + ora |

---

## Project Structure

```
src/
├── cli/          # Commands (connect, disconnect, status, populate)
├── core/         # Config, schema parser, generator
├── drivers/      # Postgres and MongoDB drivers
└── utils/        # Logger, validator
.datagen/         # Your schema files
```

---

## Future functionalities

- [ ] Inline field mode (`--table users --field "name:person.fullName"`)
- [ ] Relation fields (foreign key support for Postgres)
- [ ] Folder mode (populate all schemas in `.datagen/` in dependency order)
- [ ] MongoDB nested objects and arrays
- [ ] `--seed` flag for reproducible output
- [ ] `datagen schema validate` and `datagen schema list`
- [ ] `datagen list tables`