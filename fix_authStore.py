import sys

def process(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    with open(filepath, 'w') as f:
        for i, line in enumerate(lines):
            if "setLoading: (loading: boolean) => void;" in line and i > 25:
                continue
            if "setLoading: (loading) => set({ loading })," in line and i > 35:
                continue
            f.write(line)

process('tended-web/store/authStore.ts')
