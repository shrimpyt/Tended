import sys

def process(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace("import React, { useState, useMemo } from 'react';", "import React, { useState, useMemo, useCallback } from 'react';")

    with open(filepath, 'w') as f:
        f.write(content)

process('tended-web/app/inventory/page.tsx')
