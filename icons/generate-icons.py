"""Rasterise icons/icon.svg to the maskable PNG sizes without third-party deps."""

import struct
import zlib
from pathlib import Path

BG = (0x67, 0x50, 0xA4)
FG = (0xFF, 0xFF, 0xFF)
SS = 4  # supersampling factor

# x, y, w, h, radius, opacity — in the 512 unit design space
SHAPES = [
    (104, 326, 304, 20, 10, 0.55),
    (104, 222, 88, 88, 22, 0.85),
    (212, 166, 88, 88, 22, 1.0),
    (320, 222, 88, 88, 22, 0.85),
]


def render(size):
    scale = size / 512
    big = size * SS
    cover = [0.0] * (size * size)

    for x, y, w, h, r, opacity in SHAPES:
        x, y, w, h, r = (v * scale for v in (x, y, w, h, r))
        x0 = max(0, int(x * SS) - SS)
        y0 = max(0, int(y * SS) - SS)
        x1 = min(big, int((x + w) * SS) + SS)
        y1 = min(big, int((y + h) * SS) + SS)
        inner_x0, inner_x1 = x + r, x + w - r
        inner_y0, inner_y1 = y + r, y + h - r
        r2 = r * r
        weight = opacity / (SS * SS)

        for py in range(y0, y1):
            sy = (py + 0.5) / SS
            cy = min(max(sy, inner_y0), inner_y1)
            dy = sy - cy
            row = (py // SS) * size
            for px in range(x0, x1):
                sx = (px + 0.5) / SS
                cx = min(max(sx, inner_x0), inner_x1)
                dx = sx - cx
                if dx * dx + dy * dy <= r2:
                    cover[row + px // SS] += weight

    raw = bytearray()
    for row in range(size):
        raw.append(0)  # PNG filter type: none
        base = row * size
        for col in range(size):
            a = min(1.0, cover[base + col])
            raw += bytes(round(b + (f - b) * a) for b, f in zip(BG, FG))
    return bytes(raw)


def chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def write_png(path, size):
    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", header)
           + chunk(b"IDAT", zlib.compress(render(size), 9))
           + chunk(b"IEND", b""))
    path.write_bytes(png)
    print(f"{path.name}: {len(png)} bytes")


if __name__ == "__main__":
    out = Path(__file__).resolve().parent
    for size in (128, 192, 512):
        write_png(out / f"icon-{size}.png", size)
