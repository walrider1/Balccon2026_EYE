"""Generate a dedicated labwc input policy; does not modify the host desktop.

Usage: python3 make-kiosk-config.py HDMI-A-1 > rc.xml
The argument is the VERIFIED output carrying the terminal, from wlr-randr.
Window placement is a separate on-device setup step.
"""
import re
import sys
import xml.etree.ElementTree as ET

if len(sys.argv) != 2 or not re.fullmatch(r'[A-Za-z0-9_.-]+', sys.argv[1]):
    raise SystemExit('Supply the terminal output name reported by wlr-randr.')
output = sys.argv[1]
root = ET.Element('labwc_config')
keyboard = ET.SubElement(root, 'keyboard')
# Do not include <default/>: it enables window switching and terminal launch.
# FocusOutput consumes a key and returns focus to KOSMOS. None only clears a
# binding and may leave the key available to Chromium, so it is not used here.
keys = ['A-Tab', 'A-S-Tab', 'A-F4', 'A-space', 'A-F2', 'A-Return',
        'W-Return', 'W-d', 'W-e', 'W-r', 'W-Tab', 'Super_L', 'Super_R',
        'F11', 'F12', 'C-l', 'A-d', 'C-t', 'C-n', 'C-w', 'C-q',
        'C-S-w', 'C-S-n', 'C-S-t', 'C-S-i', 'C-S-j', 'C-S-c',
        'C-o', 'C-s', 'C-p', 'C-h', 'C-j', 'C-Tab', 'C-S-Tab',
        'A-Left', 'A-Right', 'XF86Back', 'XF86Forward',
        'XF86PowerOff', 'XF86Sleep', 'XF86Suspend']
keys += [f'C-A-F{i}' for i in range(1, 13)]
for key in keys:
    binding = ET.SubElement(keyboard, 'keybind', key=key)
    ET.SubElement(binding, 'action', name='FocusOutput', output=output)
# Explicit entries prevent fallback default desktop/window mouse bindings.
mouse = ET.SubElement(root, 'mouse')
for context, button in [('Root','Right'), ('Root','Middle'),
                        ('Frame','A-Left'), ('Frame','A-Right')]:
    ctx = ET.SubElement(mouse, 'context', name=context)
    binding = ET.SubElement(ctx, 'mousebind', button=button, action='Press')
    ET.SubElement(binding, 'action', name='FocusOutput', output=output)
ET.indent(root)
print(ET.tostring(root, encoding='unicode'))
