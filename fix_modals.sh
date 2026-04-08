#!/bin/bash
git log -p -n 20 tended-web/components/CameraInventoryModal.tsx | grep -B 30 -A 10 "const img = new window.Image();" > modal1_history.txt
git log -p -n 20 tended-web/components/ReceiptScanModal.tsx | grep -B 30 -A 10 "const img = new window.Image();" > modal2_history.txt
