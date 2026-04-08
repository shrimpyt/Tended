import sys

def process(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace("import { motion } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';")

    with open(filepath, 'w') as f:
        f.write(content)

process('tended-web/app/inventory/page.tsx')
