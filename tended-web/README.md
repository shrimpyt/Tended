# Tended Web Dashboard 🌐🏠

**Tended Web Dashboard** is the powerful companion web application to the Tended Expo Mobile App. Built with **Next.js 15**, it provides a seamless cross-platform experience for managing your household inventory, shopping lists, and spending from any browser.

## 🌟 Key Features

*   **Intelligent Inventory Management**: View, add, edit, and organize your household items with ease.
*   **Real-time Shopping List**: Collaborate and sync your shopping list with household members in real-time.
*   **Spending Insights**: Track your expenses and view categorized monthly spending breakdowns.
*   **Cross-Platform Sync**: Every action taken on the web dashboard instantly syncs with the mobile app via our Supabase backend.

## 🛠️ Tech Stack

*   **Framework**: Next.js 15 (App Router)
*   **Styling**: Tailwind CSS + Shadcn/UI
*   **State Management**: Zustand + React Query
*   **Database & Auth**: Supabase (Postgres + Realtime)
*   **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (LTS recommended)
- `npm`, `yarn`, `pnpm`, or `bun`
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local backend development)

### Environment Setup

Create a `.env.local` (or `.env`) file in the `tended-web` directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

*(These keys are shared with the mobile app and can be found in your Supabase project settings.)*

### Installation & Running

1.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

3.  **Open your browser:**
    Navigate to [http://localhost:3000](http://localhost:3000) to see the dashboard in action!

## 📂 Project Structure

*   `app/`: Next.js App Router pages and layouts.
*   `components/`: Reusable React components (including Shadcn UI).
*   `hooks/`: Custom React hooks (e.g., for data fetching and real-time updates).
*   `store/`: Zustand global state management.
*   `lib/`: Utility functions and shared clients (e.g., Supabase client).
*   `types/`: TypeScript interfaces and type definitions.

## 🔗 Related Resources

*   [Next.js Documentation](https://nextjs.org/docs)
*   [Supabase Documentation](https://supabase.com/docs)
*   [Tailwind CSS](https://tailwindcss.com/docs)
*   [Shadcn UI](https://ui.shadcn.com/)

---

**Built with ❤️ for better living.**
