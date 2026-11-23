#!/usr/bin/env python3
"""앱 아이콘 생성 — 16x16 픽셀 아트를 정수배로 확대해 깔끔한 PNG로 저장한다.

결과물 (저장소 루트)
  icon-192.png           192x192  purpose any
  icon-512.png           512x512  purpose any
  icon-maskable-512.png  512x512  purpose maskable (안전 영역 안쪽 60%에 그림)
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = {'icon-192.png': 192, 'icon-512.png': 512}

CREAM = (246, 240, 227, 255)
CREAM2 = (233, 223, 203, 255)
NAVY = (44, 52, 64, 255)
NAVY2 = (24, 28, 38, 255)
MINT = (46, 169, 139, 255)
MINT_L = (112, 220, 190, 255)
MINT_D = (31, 139, 113, 255)
GREEN = (74, 158, 107, 255)
GREEN_D = (46, 122, 82, 255)
AMBER = (226, 160, 60, 255)
AMBER_L = (247, 197, 106, 255)
PINK = (239, 127, 174, 255)

GRID = 16


def blank():
    img = Image.new('RGBA', (GRID, GRID), CREAM)
    return img


def rect(img, x0, y0, x1, y1, color):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < GRID and 0 <= y < GRID:
                img.putpixel((x, y), color)


def px(img, x, y, color):
    if 0 <= x < GRID and 0 <= y < GRID:
        img.putpixel((x, y), color)


def draw_scene(floor=True):
    img = blank()

    # 바닥 (옅은 띠) — maskable 아이콘은 바깥 배경과 이어지도록 생략한다
    if floor:
        rect(img, 0, 14, 15, 15, CREAM2)

    # ── 책상 ──
    rect(img, 2, 11, 13, 11, NAVY)          # 상판
    rect(img, 3, 12, 3, 13, NAVY)           # 왼쪽 다리
    rect(img, 12, 12, 12, 13, NAVY)         # 오른쪽 다리

    # ── 모니터 ──
    rect(img, 4, 2, 11, 8, NAVY)            # 본체
    rect(img, 5, 3, 10, 7, MINT)            # 화면
    rect(img, 5, 3, 10, 3, MINT_L)          # 화면 위쪽 빛
    rect(img, 5, 7, 10, 7, MINT_D)          # 화면 아래쪽 그늘

    # 화면 속 표정 (눈 · 미소)
    px(img, 6, 5, NAVY2)
    px(img, 9, 5, NAVY2)
    px(img, 7, 6, NAVY2)
    px(img, 8, 6, NAVY2)

    # 스탠드
    rect(img, 7, 9, 8, 9, NAVY)
    rect(img, 6, 10, 9, 10, NAVY)

    # ── 책상 왼쪽: 화분 ──
    rect(img, 1, 10, 2, 10, AMBER)          # 화분
    rect(img, 1, 9, 2, 9, GREEN)            # 잎
    px(img, 2, 8, GREEN_D)

    # ── 책상 오른쪽: 포스트잇 ──
    rect(img, 12, 10, 13, 10, PINK)

    return img


def scaled(img, size_per_cell):
    w = GRID * size_per_cell
    return img.resize((w, w), Image.NEAREST)


def main():
    scene = draw_scene()

    for name, size in OUT.items():
        # 16x16 → size (정수배: 192/16=12, 512/16=32)
        if size % GRID == 0:
            out = scaled(scene, size // GRID)
        else:
            out = scene.resize((size, size), Image.NEAREST)
        out.convert('RGB').save(os.path.join(ROOT, name), optimize=True)
        print('saved', name, out.size)

    # maskable: 안전 영역(가운데 60%)에 그림을 넣고 나머지는 배경색
    m = Image.new('RGBA', (512, 512), CREAM)
    inner = scaled(draw_scene(floor=False), 19)     # 16*19 = 304px (약 59%)
    m.paste(inner, ((512 - inner.width) // 2, (512 - inner.height) // 2))
    m.convert('RGB').save(os.path.join(ROOT, 'icon-maskable-512.png'), optimize=True)
    print('saved icon-maskable-512.png (inner %dpx)' % inner.width)


if __name__ == '__main__':
    main()
