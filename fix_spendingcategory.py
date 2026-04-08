import sys

def process(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace("type LineItem = { item: string; amount: string; category: string };", "import type { SpendingCategory } from '../types/models';\n\ntype LineItem = { item: string; amount: string; category: SpendingCategory };")

    with open(filepath, 'w') as f:
        f.write(content)

process('tended-web/components/ReceiptScanModal.tsx')
