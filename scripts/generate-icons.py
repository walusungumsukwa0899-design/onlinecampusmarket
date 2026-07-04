"""
Wolf Business Platform — Python Icon Generator (no dependencies)
Usage: python3 scripts/generate-icons.py
Produces the same branded icons as generate-icons.cjs but without npm canvas.
"""
import struct, zlib, math, os

def make_png(width, height, pixels, path):
    rows = []
    for y in range(height):
        row = bytearray([0])
        for x in range(width):
            r, g, b, a = pixels[y][x]
            row += bytes([r, g, b, a])
        rows.append(bytes(row))
    raw = b''.join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)

def make_icon(size, path, maskable=False):
    px = [[(0,0,0,0)]*size for _ in range(size)]
    cx, cy = size//2, size//2
    corner = size * 0.22

    for y in range(size):
        for x in range(size):
            in_shape = maskable
            if not maskable:
                ox, oy = x - cx, y - cy
                cr = corner
                ax = abs(ox) - (size//2 - cr)
                ay = abs(oy) - (size//2 - cr)
                if ax <= 0 and ay <= 0: in_shape = True
                elif ax <= 0 or ay <= 0: in_shape = max(ax,0)**2 + max(ay,0)**2 <= cr**2
                else: in_shape = ax**2 + ay**2 <= cr**2

            if not in_shape: continue

            t = (x + y) / (2 * size)
            r = int(10 + 16 * t)
            g = int(26 + 32 * t)
            b = int(14 + 18 * t)
            px[y][x] = (r, g, b, 255)

    # Orange glow
    glow_cy = cy - int(size * 0.03)
    for y in range(size):
        for x in range(size):
            if px[y][x][3] == 0: continue
            d = math.sqrt((x-cx)**2 + (y-glow_cy)**2)
            if d < size * 0.35:
                alpha = max(0, 1 - d/(size*0.35)) * 0.25
                pr, pg, pb, pa = px[y][x]
                px[y][x] = (int(pr*(1-alpha)+232*alpha), int(pg*(1-alpha)+99*alpha), int(pb*(1-alpha)+10*alpha), pa)

    # W lettermark
    stroke = max(2, size // 18)
    def draw_line(x0, y0, x1, y1):
        steps = max(abs(x1-x0), abs(y1-y0), 1) * 4
        for i in range(steps+1):
            t = i / steps
            x = int(x0 + (x1-x0)*t)
            y = int(y0 + (y1-y0)*t)
            for dy in range(-stroke, stroke+1):
                for dx in range(-stroke, stroke+1):
                    if dx*dx + dy*dy <= stroke*stroke:
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < size and 0 <= ny < size and px[ny][nx][3] > 0:
                            px[ny][nx] = (232, 99, 10, 255)

    s = size
    draw_line(int(s*.22), int(s*.28), int(s*.36), int(s*.66))
    draw_line(int(s*.36), int(s*.66), int(s*.50), int(s*.52))
    draw_line(int(s*.50), int(s*.52), int(s*.64), int(s*.66))
    draw_line(int(s*.64), int(s*.66), int(s*.78), int(s*.28))

    # Dot
    dot_r = max(2, size//22)
    dot_y = int(size * 0.79)
    for y in range(size):
        for x in range(size):
            if px[y][x][3] == 0: continue
            if (x-cx)**2 + (y-dot_y)**2 <= dot_r**2:
                px[y][x] = (232, 99, 10, 255)

    make_png(size, size, px, path)
    print(f'✅ {os.path.basename(path)} ({size}x{size})')

pub = os.path.join(os.path.dirname(__file__), '../public')
os.makedirs(pub, exist_ok=True)
print('Generating Wolf Business Platform icons (Python)...')
make_icon(16,  os.path.join(pub, 'favicon-16.png'))
make_icon(32,  os.path.join(pub, 'favicon-32.png'))
make_icon(180, os.path.join(pub, 'apple-touch-icon.png'))
make_icon(192, os.path.join(pub, 'icon-192.png'))
make_icon(512, os.path.join(pub, 'icon-512.png'))
make_icon(512, os.path.join(pub, 'icon-maskable-512.png'), maskable=True)
print('\nDone!')
