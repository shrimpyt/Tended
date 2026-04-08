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
                "import { useInventory, useAddInventoryItem } from '../hooks/queries';\n",
                "import { getUniqueCategories } from '../utils/productParsers';\n",
                "import type { NewItem } from '../types/models';\n",
                "\n",
                "type Props = { visible: boolean; householdId: string; onClose: () => void };\n",
                "type Step = 'pick' | 'analyzing' | 'review' | 'saving';\n",
                "type IdentifiedItem = { name: string; category: string; quantity: number; max_quantity: number; threshold: number; unit: string | null; checked: boolean };\n",
                "\n",
                "async function compressImageToBase64(file: File): Promise<string> {\n",
                "  return new Promise((resolve, reject) => {\n",
                "    const img = new window.Image();\n"
            ])
            found = True
        else:
            new_lines.append(line)

    with open(filepath, 'w') as f:
        f.writelines(new_lines)

process('tended-web/components/CameraInventoryModal.tsx')
