import sys

def process(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    with open(filepath, 'w') as f:
        skip_count = 0
        for line in lines:
            if "setLoading: (loading) =>" in line:
                if skip_count > 0:
                    continue
                skip_count += 1
            if "set({loading})," in line and skip_count == 1:
                pass
            f.write(line)

process('tended-web/store/authStore.ts')
