import sys

def process(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace("import { getUniqueCategories } from '../app/(tabs)/inventory';", "const getUniqueCategories = (items: any[]) => Array.from(new Set(items.map(i => i.category).filter(Boolean)));")

    with open(filepath, 'w') as f:
        f.write(content)

process('tended-web/components/CameraInventoryModal.tsx')
