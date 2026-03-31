# Tended 🏠✨

**Tended** is a premium, AI-powered smart home assistant designed to take the mental load out of managing your household. It tracks your inventory, manages your shopping list, and keeps your spending in check with cutting-edge AI integrations.

[![Expo](https://img.shields.io/badge/Expo-54.0-000?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-DB_%26_Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 🌟 Core Features

### 📦 Intelligent Inventory
*   **AI Shelf Scanning**: Simply take a photo of your pantry or cabinet, and Tended's AI (GPT-4o) will identify items and estimate their stock levels automatically.
*   **Barcode Support**: Quick-add items by scanning their EAN/UPC barcodes using the OpenFoodFacts database.
*   **Smart Thresholds**: Set reorder points for every item. When stock drops, Tended handles the rest.

### 🧾 Seamless Spending
*   **Receipt OCR**: Scan any receipt to automatically extract line items and amounts.
*   **Auto-Restock**: When a receipt match is found for an inventory item, Tended offers to automatically "refill" your stock levels in one tap.
*   **Visual Insights**: Beautifully categorized monthly spending breakdowns to help you optimize your budget.

### 🛒 Automated Shopping List
*   **System-Generated**: Tended automatically adds items to your list when they cross their depletion threshold.
*   **Real-time Sync**: Collaborate with your household members in real-time using Supabase's realtime engine.

### 📱 Premium Experience
*   **Midnight Dark Design**: A bespoke, high-end "Midnight Dark" theme optimized for OLED displays and modern aesthetics.
*   **Offline-First**: Full persistence via TanStack Query and AsyncStorage. Use the app anywhere, even with poor connectivity.
*   **Native Performance**: Built with Expo Router and React Native Reanimated for butter-smooth transitions.

---

## 🛠️ Tech Stack

*   **Frontend**: React Native (Expo SDK 54)
*   **Navigation**: Expo Router (File-based routing)
*   **State Management**: TanStack Query v5 (React Query)
*   **Database & Auth**: Supabase (PostgreSQL, RLS Policies)
*   **AI/Backend**: Supabase Edge Functions (Deno) + OpenAI GPT-4o
*   **Styling**: Custom Design System + React Native Reanimated
*   **Testing**: TestSprite E2E Suite

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- [Expo Go](https://expo.dev/go) app (for physical device testing)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for backend modifications)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/shrimpyt/Tended.git
    cd Tended
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # If on macOS, install pods for local dev
    cd ios && pod install && cd ..
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Launch the app**
    ```bash
    npx expo start
    ```

---

## 🧪 Testing

Tended uses **TestSprite** for robust end-to-end testing. The test suite covers core flows including:
- Authentication & Onboarding
- Inventory item lifecycle
- AI Camera & Barcode scanning flows
- Receipt processing logic

To view the latest test results, see: [testsprite-mcp-test-report.md](./testsprite_tests/testsprite-mcp-test-report.md)

---

## 📂 Project Structure

```text
├── app/                  # Expo Router pages (Tabs & Modals)
├── components/           # Reusable UI components & AI Wizards
├── hooks/                # Custom React Query & Logic hooks
├── lib/                  # Third-party service clients (Supabase)
├── supabase/             # Edge Functions & Database Migrations
├── store/                # Global state (Auth, UI preferences)
├── types/                # TypeScript models & interfaces
└── utils/                # Helper functions (Fuzzy matching, Notifications)
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Built with ❤️ for better living.**
