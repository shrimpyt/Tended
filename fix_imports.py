import sys

def process(filepath, is_receipt):
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace("import { supabase } from '../lib/supabaseClient';", "import { supabase } from '../lib/supabase';")

    if is_receipt:
        content = content.replace("import { fuzzyMatchInventory } from '../utils/productParsers';", "import { fuzzyMatchInventory } from '../utils/fuzzyMatch';")
    else:
        content = content.replace("import { getUniqueCategories } from '../utils/productParsers';", "import { getUniqueCategories } from '../app/(tabs)/inventory';")

    with open(filepath, 'w') as f:
        f.write(content)

process('tended-web/components/CameraInventoryModal.tsx', False)
process('tended-web/components/ReceiptScanModal.tsx', True)
