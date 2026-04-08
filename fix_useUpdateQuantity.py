import sys

def process(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace("import { useInventory, useAddInventoryItem, useDeleteInventoryItem } from '@/hooks/queries';", "import { useInventory, useAddInventoryItem, useDeleteInventoryItem, useUpdateQuantity } from '@/hooks/queries';")

    with open(filepath, 'w') as f:
        f.write(content)

process('tended-web/app/inventory/page.tsx')
