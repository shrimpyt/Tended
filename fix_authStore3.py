import sys

def process(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace("    set({loading}),", "", 1)

    with open(filepath, 'w') as f:
        f.write(content)

process('tended-web/store/authStore.ts')
