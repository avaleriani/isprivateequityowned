#!/usr/bin/env python3
"""Generates the extension icons. Stdlib only — no Pillow required.

Draws a dark rounded square with three ascending bars, supersampled at 8x and
box-filtered down so the edges stay smooth at 16px.

Usage: python3 tools/gen_icons.py
"""

import os
import struct
import zlib

SIZES = (16, 32, 48, 128)
SS = 8  # supersampling factor

BG = (26, 29, 36, 255)       # charcoal
BAR = (240, 242, 246, 255)   # off-white
ACCENT = (192, 57, 43, 255)  # the "yes" red, on the tallest bar


def rounded_square_mask(n, radius):
    """Returns a set-like grid of booleans for a rounded square covering n x n."""
    mask = bytearray(n * n)
    r = radius
    for y in range(n):
        for x in range(n):
            inside = True
            for cx, cy in ((r, r), (n - 1 - r, r), (r, n - 1 - r), (n - 1 - r, n - 1 - r)):
                if (x < r and y < r and (cx, cy) == (r, r)) or \
                   (x > n - 1 - r and y < r and (cx, cy) == (n - 1 - r, r)) or \
                   (x < r and y > n - 1 - r and (cx, cy) == (r, n - 1 - r)) or \
                   (x > n - 1 - r and y > n - 1 - r and (cx, cy) == (n - 1 - r, n - 1 - r)):
                    if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
                        inside = False
            mask[y * n + x] = 1 if inside else 0
    return mask


def render(n):
    """Renders an n x n RGBA image as a flat bytearray."""
    px = bytearray(n * n * 4)
    mask = rounded_square_mask(n, max(1, round(n * 0.22)))

    # Bar geometry as fractions of the canvas.
    bars = [
        (0.22, 0.62, 0.16, BAR),     # x, top, width, color
        (0.42, 0.46, 0.16, BAR),
        (0.62, 0.28, 0.16, ACCENT),
    ]
    bottom = 0.78

    for y in range(n):
        for x in range(n):
            i = (y * n + x) * 4
            if not mask[y * n + x]:
                continue  # stays transparent
            color = BG
            fx, fy = x / n, y / n
            for bx, btop, bw, bcolor in bars:
                if bx <= fx < bx + bw and btop <= fy < bottom:
                    color = bcolor
                    break
            px[i:i + 4] = bytes(color)
    return px


def downsample(src, n, factor):
    """Box-filters an (n*factor) square down to n, averaging premultiplied RGBA."""
    big = n * factor
    out = bytearray(n * n * 4)
    area = factor * factor
    for y in range(n):
        for x in range(n):
            r = g = b = a = 0
            for dy in range(factor):
                for dx in range(factor):
                    i = ((y * factor + dy) * big + (x * factor + dx)) * 4
                    alpha = src[i + 3]
                    r += src[i] * alpha
                    g += src[i + 1] * alpha
                    b += src[i + 2] * alpha
                    a += alpha
            o = (y * n + x) * 4
            if a == 0:
                out[o:o + 4] = b"\x00\x00\x00\x00"
            else:
                out[o] = r // a
                out[o + 1] = g // a
                out[o + 2] = b // a
                out[o + 3] = a // area
    return out


def write_png(path, pixels, n):
    raw = bytearray()
    for y in range(n):
        raw.append(0)  # filter type: none
        raw += pixels[y * n * 4:(y + 1) * n * 4]

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size in SIZES:
        big = render(size * SS)
        small = downsample(big, size, SS)
        path = os.path.join(out_dir, f"icon{size}.png")
        write_png(path, small, size)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
