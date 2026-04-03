# Tended 🏠✨

**Tended** is a premium, AI-powered smart home assistant designed to take the mental load out of managing your household. Now featuring a powerful **Next.js Web Dashboard** alongside our flagship **Expo Mobile App**, Tended provides a seamless cross-platform experience for managing your inventory, shopping lists, and spending.

[![Expo](https://img.shields.io/badge/Expo-54.0-000?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-DB_%26_Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 🌟 Core Features

### 📦 Intelligent Inventory
*   **AI Shelf Scanning**: Simply take a photo of your pantry or cabinet, and Tended's AI identifies items and estimates stock levels.
*   **Barcode Support**: Quick-add items by scanning barcodes using the OpenFoodFacts database.
*   **Smart Thresholds**: Set reorder points; Tended handles auto-adding to your list.

### 🧾 Seamless Spending
*   **Receipt OCR**: Scan receipts to automatically extract line items and amounts.
*   **Auto-Restock**: One-tap refill of inventory items when a purchase is detected.
*   **Visual Insights**: Categorized monthly spending breakdowns to help you optimize your budget.

### 🛒 Automated Shopping List
*   **System-Generated**: Items are added automatically when they cross depletion thresholds.
*   **Real-time Sync**: Collaborate with household members in real-time across Web and Mobile.

---

## 🛠️ Tech Stack

### Mobile App (Expo)
*   **Framework**: React Native (Expo SDK 54)
*   **Navigation**: Expo Router (File-based)
*   **State**: TanStack Query + AsyncStorage

### Web Dashboard (Next.js)
*   **Framework**: Next.js 15 (App Router)
*   **Styling**: Tailwind CSS + Shadcn/UI
*   **State**: Zustand + React Query

### Shared Backend
*   **Database**: Supabase (Postgres + Realtime)
*   **AI**: Supabase Edge Functions + OpenAI GPT-4o
*   **Deployment**: Vercel (Web) + EAS (Mobile)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- [Expo Go](https://expo.dev/go) app (for physical device testing)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/shrimpyt/Tended.git
    cd Tended
    ```

2.  **Environment Setup**
    Create a `.env` file in the root:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
    And in `tended-web/`:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

3.  **Run the Apps**
    - **Mobile**: `npx expo start`
    - **Web**: `cd tended-web && npm install && npm run dev`

---

## 📂 Project Structure

```text
├── app/                  # Expo Router (Mobile Pages)
├── components/           # Mobile components
├── tended-web/           # Next.js Web Application
│   ├── app/              # Next.js App Router Pages
│   ├── components/       # Web components
│   └── store/            # Web global state
├── supabase/             # Shared Migrations & Edge Functions
├── lib/                  # Shared logic & clients
└── types/                # Shared TypeScript models
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

**Built with ❤️ for better living.**
