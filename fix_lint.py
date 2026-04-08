import sys

def process(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace("import { supabase } from '../lib/supabase';", "")
    content = content.replace("import { X } from 'lucide-react';", "")

    with open(filepath, 'w') as f:
        f.write(content)

process('tended-web/components/CameraInventoryModal.tsx')
process('tended-web/components/ReceiptScanModal.tsx')
