import sys

def process(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    new_lines = []
    found = False
    for line in lines:
        if "const img = new window.Image();" in line and not found:
            new_lines.extend([
                "import Image from 'next/image';\n",
                "import { supabase } from '../lib/supabaseClient';\n",
                "import { useAuthStore } from '../store/authStore';\n",
                "import { useInventory, useAddSpendingEntry, useRestockFromReceipt } from '../hooks/queries';\n",
                "import { fuzzyMatchInventory } from '../utils/productParsers';\n",
                "import type { NewSpendingEntry, Item } from '../types/models';\n",
                "\n",
                "const CATEGORIES = ['Groceries', 'Dining', 'Household', 'Pets', 'Personal'];\n",
                "\n",
                "type Props = { visible: boolean; householdId: string; onClose: () => void };\n",
                "type Step = 'pick' | 'processing' | 'review' | 'inventoryMatch';\n",
                "type LineItem = { item: string; amount: string; category: string };\n",
                "type RestockProposal = { inventoryItem: Item; addQuantity: number; approved: boolean };\n",
                "\n",
                "const fmtQty = (num: number) => num % 1 === 0 ? num.toString() : num.toFixed(1);\n",
                "\n",
                "async function compressImageToBase64(file: File): Promise<{ base64: string, previewUrl: string }> {\n",
                "  return new Promise((resolve, reject) => {\n",
                "    const img = new window.Image();\n"
            ])
            found = True
        else:
            new_lines.append(line)

    with open(filepath, 'w') as f:
        f.writelines(new_lines)

process('tended-web/components/ReceiptScanModal.tsx')
