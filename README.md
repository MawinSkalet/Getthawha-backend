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

New bookings send a confirmation to the customer and a notice to the owner.
Set these values in the backend `.env` file before enabling email delivery:

```env
EMAIL=your-sender-address@example.com
EMAIL_PASSWORD=your-app-specific-password
CUSTOM_EMAIL=your-sender-address@example.com
OWNER_NOTIFICATION_EMAILS=owner@example.com
SMTP_HOST=smtp.mail.me.com
SMTP_PORT=587
SMTP_SECURE=false
```

For Gmail, use `SMTP_HOST=smtp.gmail.com` and an app password. Multiple owner
addresses can be separated with commas. If `OWNER_NOTIFICATION_EMAILS` is
empty, notifications go to the email addresses in the `userStaffs` table.
Existing booking tables receive the customer email, name, guest count, and
booking source columns on startup.

---
