## 🚀 Installation Guide

### 1. Start the PostgreSQL Container

Run the following command to start a PostgreSQL container named `postgres-database`:

```bash
docker run --name postgres-database \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  -d postgres
```

### 2. Create the `skillSwap` Database

Connect to the running PostgreSQL container using your preferred tool (e.g., `psql`, DBeaver, PgAdmin), and create a new database named:

```sql
CREATE DATABASE "skillSwap";
```

### 3. Configure Environment Variables

Rename the provided `.env-example` file to `.env` and update the values as needed for your local setup:

```bash
mv .env-example .env
```

### 4. Install Dependencies

Make sure you've installed project dependencies using either `npm`, `yarn`, or `bun`:

```bash
# With npm
npm install

# Or with bun
bun install
```

### 5. Run the Application

Start the app using either Node.js or Bun:

```bash
# With Node.js
node index.ts

# Or with Bun
bun index.ts
```

### 6. ✅ You're Done!

The application should now be running and ready for development or testing.

more information one-one one-many many-many [READ HERE](https://sequelize.org/docs/v6/other-topics/typescript/#the-case-of-modelinit)

## Booking email notifications

Each customer booking sends a notification to the owner and a confirmation to
the customer's supplied email address. Before testing, set these values in the
backend `.env` file (never commit that file):

```env
EMAIL=your-icloud-address@icloud.com
EMAIL_PASSWORD=your-apple-app-specific-password
CUSTOM_EMAIL=your-icloud-address@icloud.com
OWNER_NOTIFICATION_EMAILS=owner@example.com
```

For a Gmail test account, use this instead. Enable 2-Step Verification on the
Google account and create an app password; do not use the normal Gmail
password.

```env
EMAIL=your-test-address@gmail.com
EMAIL_PASSWORD=your-google-app-password
CUSTOM_EMAIL=your-test-address@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
OWNER_NOTIFICATION_EMAILS=owner-test@example.com
```

`OWNER_NOTIFICATION_EMAILS` accepts multiple comma-separated addresses. If it
is blank, the system sends owner notifications to every address in the
`userStaffs` table. The first server start adds `customerEmail` and `source`
columns to existing booking tables automatically.

---
