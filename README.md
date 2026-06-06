# Nexora

Nexora is a modern personal wishlist and shopping intelligence app built with React, TypeScript, and Supabase. It helps you organize products, compare value, and track spending with a clean, mobile-friendly experience.

## Why Nexora

Buying decisions are easier when your product data is organized in one place. Nexora combines product management, category pages, price-per-unit calculations, and monthly spending tracking so you can plan purchases with confidence.

## Core Features

### Product Management
- Add, edit, and delete products
- Store product details: name, price, original price, image URL, product link, category, company, notes, and tags
- Group products into custom pages
- View recent products quickly

### Search and Smart Filtering
- Search by product name, company, or tags
- Filter by category, page, company, and tag
- Instant filtered totals in INR

### Price Tracker
- Select a product and calculate price per gram, kilogram, milliliter, or liter
- Override stored price for one-off purchase comparisons
- Copy calculated unit rate directly

### Monthly Expenses
- Log monthly purchases with date, product linkage, notes, and amount
- View month-wise totals and historical month summaries
- Isolated expense tracking per user

### Authentication and Profile
- Username/password signup and login
- Cross-device account persistence via Supabase `user_accounts`
- Editable profile: profile picture URL, name, email, bio, and password
- Username is intentionally read-only

### UX Highlights
- Responsive layout for desktop and mobile
- Organized sidebar navigation with custom pages
- Empty states, loading placeholders, and inline error handling

## Tech Stack

- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS
- Backend/Data: Supabase (PostgreSQL + client SDK)
- Icons: Lucide React
- Tooling: ESLint

## Project Structure

```
src/
	components/
		ProductsView.tsx
		ProductModal.tsx
		ProductsHeader.tsx
		PriceTracker.tsx
		MonthlyExpenses.tsx
		ProfilePage.tsx
		LoginPage.tsx
		SignupPage.tsx
		Sidebar.tsx
	hooks/
		useData.ts
	lib/
		supabase.ts
	types/
		index.ts
supabase/
	migrations/
```

## Getting Started

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd Nexora
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Database Migrations

Apply SQL files from `supabase/migrations` to your Supabase project, including the `user_accounts` migration used for shared login/profile data.

### 5. Start Development Server

```bash
npm run dev
```

App runs at `http://localhost:5173` by default.

## Available Scripts

```bash
npm run dev       # Start local dev server
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
npm run typecheck # TypeScript checks
```

## Deployment (Vercel)

1. Import the repository into Vercel.
2. Add environment variables:
	 - `VITE_SUPABASE_URL`
	 - `VITE_SUPABASE_ANON_KEY`
3. Ensure Supabase migrations are applied in the target Supabase project.
4. Deploy.

Important: Use the same Supabase project (or equivalent migrated schema/data) for both local and deployed environments if you want consistent login and product behavior.

## Data Notes

- Products and pages are stored in Supabase tables.
- Product tags are stored in a separate relation for flexible filtering.
- User accounts and profile updates are stored in `user_accounts`.
- Monthly expenses are currently persisted in browser local storage per username.

## Future Enhancements

- Cloud sync for monthly expenses
- Product price history and alerts
- File upload for profile images
- Export reports (CSV/PDF)

## License

This project is currently private. Add a license file if you plan to make it public.
