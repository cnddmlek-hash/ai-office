/* 내 AI 오피스 — 픽셀 아트 렌더러
 * 외부 라이브러리 없이 canvas 2D의 fillRect만으로 그린다.
 * (픽셀 아트 느낌 + 미리보기/검증 스크립트에서 그대로 재사용하기 위함)
 */
(function (root) {
  'use strict';

  var W = 720, H = 416, T = 16;

  /* ---------------- 색상 팔레트 ---------------- */
  var C = {
    wallTop: '#e3d5bd', wall: '#cbbb9f', wallDark: '#a5947a', wallLine: '#8b7b61',
    floorA: '#f8eeda', floorB: '#f1e4cb', floorLine: 'rgba(120,95,60,0.07)',
    meetingA: '#e7eef0', meetingB: '#dfe8eb',
    breakA: '#f5ebdd', breakB: '#eee0cf',
    rug: '#e6dac0', rugDark: '#d2c3a6', rugLine: '#d9cdb4',
    woodTop: '#e2b57e', woodLight: '#f0cf9f', wood: '#d3a469', woodDark: '#b0824c', woodShade: '#8f6738',
    screen: '#5ad3b8', screenGlow: '#9af3dd', screenDark: '#2b3542', frame: '#39434f',
    chair: '#5d6b7a', chairDark: '#48545f', chairLight: '#74828f',
    sofa: '#8fb0c4', sofaDark: '#6d90a6', sofaLight: '#a9c6d7',
    leaf: '#5aa46c', leafDark: '#468a58', leafLight: '#77bd88',
    pot: '#d0825f', potDark: '#a9654a',
    paper: '#fffdf6', paperLine: 'rgba(120,110,90,0.35)',
    cork: '#cda06a', corkDark: '#a97f4f',
    metal: '#9aa5b1', metalDark: '#6f7b88',
    glass: '#bfe3ec', glassLine: '#8fc4d3',
    skin: '#f7d5b5', skinDark: '#e5b691', hairDark: '#2c2b2f',
    water: '#8fd0f0',
    white: '#fffdf6', red: '#e2665c', yellow: '#eab04a', blue: '#4a86e8', green: '#4a9e6b'
  };

  function P(ctx, x, y, w, h, color) {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function shadow(ctx, x, y, w, h) {
    P(ctx, x, y, w, h, 'rgba(60,45,25,0.10)');
    P(ctx, x + 2, y + 1, w - 4, h - 1, 'rgba(60,45,25,0.08)');
  }

  function tiles(ctx, x, y, w, h, c1, c2, size, line) {
    size = size || 16;
    for (var ty = y; ty < y + h; ty += size) {
      for (var tx = x; tx < x + w; tx += size) {
        var cx = Math.floor((tx - x) / size), cy = Math.floor((ty - y) / size);
        var col = ((cx + cy) % 2 === 0) ? c1 : c2;
        P(ctx, tx, ty, Math.min(size, x + w - tx), Math.min(size, y + h - ty), col);
      }
    }
    if (line !== false) {
      var lg = line || C.floorLine;
      for (var gx = x; gx <= x + w; gx += size) P(ctx, gx, y, 1, h, lg);
      for (var gy = y; gy <= y + h; gy += size) P(ctx, x, gy, w, 1, lg);
    }
  }

  /* ---------------- 가구 ---------------- */

  function desk(ctx, x, y, w, h, opts) {
    opts = opts || {};
    shadow(ctx, x + 3, y + h + 1, w, 5);
    // 다리
    P(ctx, x + 4, y + h, 6, 8, C.woodShade);
    P(ctx, x + w - 10, y + h, 6, 8, C.woodShade);
    // 상판
    P(ctx, x, y, w, h, C.wood);
    P(ctx, x, y, w, 3, C.woodLight);
    P(ctx, x, y, 3, h, C.woodLight);
    P(ctx, x, y + h - 3, w, 3, C.woodDark);
    // 모니터 (왼쪽)
    var mx = x + 6, my = y + 5;
    P(ctx, mx + 2, my + 2, 32, 18, 'rgba(40,45,55,0.18)');
    P(ctx, mx, my, 30, 18, C.screenDark);
    P(ctx, mx + 2, my + 2, 26, 13, opts.screen || C.screen);
    P(ctx, mx + 3, my + 3, 10, 3, 'rgba(255,255,255,0.45)');
    P(ctx, mx + 12, my + 18, 8, 4, C.frame);
    P(ctx, mx + 6, my + 21, 20, 2, C.frame);
    // 키보드
    P(ctx, x + 10, y + 24, 26, 6, '#efe9dc');
    P(ctx, x + 11, y + 25, 24, 4, '#dcd4c4');
    // 서류
    P(ctx, x + w - 30, y + 6, 16, 12, C.paper);
    P(ctx, x + w - 28, y + 9, 12, 1, C.paperLine);
    P(ctx, x + w - 28, y + 12, 9, 1, C.paperLine);
    // 머그컵 / 화분
    if (!opts.noMug) {
      P(ctx, x + w - 16, y + 20, 7, 7, opts.mug || '#e9e3d4');
      P(ctx, x + w - 9, y + 22, 2, 3, opts.mug || '#e9e3d4');
      P(ctx, x + w - 15, y + 21, 5, 2, '#7a5b3a');
    }
    if (opts.nameplate) {
      P(ctx, x + w / 2 - 12, y + h - 8, 24, 6, '#fdf8ea');
      P(ctx, x + w / 2 - 10, y + h - 6, 20, 2, '#c9bda6');
    }
  }

  function chair(ctx, cx, cy, opts) {
    opts = opts || {};
    shadow(ctx, cx - 11, cy + 4, 22, 4);
    // 등받이
    P(ctx, cx - 10, cy - 10, 20, 6, C.chairDark);
    P(ctx, cx - 10, cy - 10, 20, 2, C.chairLight);
    // 좌판
    P(ctx, cx - 10, cy - 4, 20, 10, C.chair);
    P(ctx, cx - 10, cy + 4, 20, 2, C.chairDark);
    // 다리
    P(ctx, cx - 6, cy + 6, 2, 4, C.chairDark);
    P(ctx, cx + 4, cy + 6, 2, 4, C.chairDark);
  }

  function plant(ctx, x, y, scale) {
    var s = scale || 1;
    shadow(ctx, x - 9 * s, y - 2, 18 * s, 4);
    // 화분
    P(ctx, x - 8 * s, y - 12 * s, 16 * s, 12 * s, C.pot);
    P(ctx, x - 8 * s, y - 12 * s, 16 * s, 3 * s, C.potDark);
    P(ctx, x - 10 * s, y - 14 * s, 20 * s, 4 * s, C.potDark);
    // 잎
    P(ctx, x - 2 * s, y - 30 * s, 4 * s, 18 * s, C.leafDark);
    P(ctx, x - 10 * s, y - 27 * s, 9 * s, 8 * s, C.leaf);
    P(ctx, x + 2 * s, y - 30 * s, 9 * s, 8 * s, C.leaf);
    P(ctx, x - 7 * s, y - 35 * s, 8 * s, 8 * s, C.leafLight);
    P(ctx, x + 1 * s, y - 38 * s, 7 * s, 8 * s, C.leaf);
    P(ctx, x - 4 * s, y - 32 * s, 4 * s, 5 * s, C.leafLight);
  }

  function whiteboard(ctx, x, y, w, h) {
    P(ctx, x, y, w, h, '#f7f4ea');
    P(ctx, x, y, w, 2, '#ffffff');
    P(ctx, x, y + h - 2, w, 2, C.metal);
    P(ctx, x + 6, y + 5, 22, 2, '#6f8fd6');
    P(ctx, x + 6, y + 10, 30, 2, '#d68a6f');
    P(ctx, x + 6, y + 15, 16, 2, '#6f8fd6');
    P(ctx, x + w - 22, y + 6, 12, 10, '#cfe3c9');
    P(ctx, x + w - 26, y + h - 6, 14, 2, '#e2665c');
  }

  function sofa(ctx, x, y, w, h) {
    shadow(ctx, x + 2, y + h, w - 4, 5);
    P(ctx, x, y, w, h, C.sofa);
    P(ctx, x, y, w, 8, C.sofaLight);
    P(ctx, x, y + h - 4, w, 4, C.sofaDark);
    P(ctx, x, y + 8, 8, h - 12, C.sofaDark);
    P(ctx, x + w - 8, y + 8, 8, h - 12, C.sofaDark);
    P(ctx, x + 10, y + 12, w - 22, h - 18, C.sofaLight);
    P(ctx, x + 10, y + 4, w - 22, 3, '#c3dbe8');
    // 쿠션
    P(ctx, x + 14, y + 14, 14, 12, '#f2d9a8');
    P(ctx, x + w - 30, y + 14, 14, 12, '#e7b7a6');
  }

  function rug(ctx, x, y, w, h) {
    P(ctx, x, y, w, h, C.rugDark);
    P(ctx, x + 3, y + 3, w - 6, h - 6, C.rug);
    for (var i = 8; i < w - 8; i += 14) {
      P(ctx, x + i, y + 5, 7, 2, C.rugLine);
      P(ctx, x + i, y + h - 7, 7, 2, C.rugLine);
    }
    for (var j = 10; j < h - 10; j += 18) {
      P(ctx, x + 5, y + j, 2, 8, C.rugLine);
      P(ctx, x + w - 7, y + j, 2, 8, C.rugLine);
    }
  }

  function pEllipse(ctx, cx, cy, rx, ry, color, step) {
    step = step || 2;
    for (var dy = -ry; dy <= ry; dy += step) {
      var t = 1 - (dy * dy) / (ry * ry);
      if (t <= 0) continue;
      var dx = Math.sqrt(t) * rx;
      P(ctx, cx - dx, cy + dy, dx * 2, step, color);
    }
  }

  /* ---------------- 사무실 배경 ---------------- */

  function drawWallBand(ctx, x, y, w, h) {
    P(ctx, x, y, w, h, C.wall);
    P(ctx, x, y, w, 4, C.wallTop);
    P(ctx, x, y + h - 5, w, 5, C.wallDark);
    P(ctx, x, y + h - 1, w, 1, C.wallLine);
  }

  function drawBackground(ctx, state) {
    var t = state.time || 0;

    // 전체 바탕(벽 바깥)
    P(ctx, 0, 0, W, H, '#d9cbb2');

    // 바닥
    tiles(ctx, 18, 18, 446, 380, C.floorA, C.floorB, 16);
    tiles(ctx, 480, 18, 222, 174, C.meetingA, C.meetingB, 16);
    tiles(ctx, 480, 208, 222, 190, C.breakA, C.breakB, 16);

    // 카펫
    rug(ctx, 40, 36, 128, 84);
    rug(ctx, 34, 128, 270, 164);
    rug(ctx, 486, 226, 150, 104);

    // 벽
    drawWallBand(ctx, 0, 0, W, 18);
    drawWallBand(ctx, 0, 0, 18, H);
    drawWallBand(ctx, W - 18, 0, 18, H);
    drawWallBand(ctx, 0, H - 18, W, 18);

    // 파티션 (사무실 ↔ 회의실·휴게실)
    P(ctx, 464, 18, 16, 380, C.wall);
    P(ctx, 464, 18, 3, 380, C.wallTop);
    P(ctx, 477, 18, 3, 380, C.wallDark);
    P(ctx, 463, 18, 1, 380, C.wallLine);
    P(ctx, 479, 18, 1, 380, C.wallLine);
    // 회의실 ↔ 휴게실
    P(ctx, 480, 192, 222, 16, C.wall);
    P(ctx, 480, 192, 222, 3, C.wallTop);
    P(ctx, 480, 205, 222, 3, C.wallDark);
    P(ctx, 480, 207, 222, 1, C.wallLine);

    // 문 (파티션 뚫기)
    tiles(ctx, 464, 88, 16, 32, C.meetingA, C.meetingB, 16, false);
    tiles(ctx, 464, 268, 16, 40, C.breakA, C.breakB, 16, false);
    tiles(ctx, 528, 192, 40, 16, C.breakA, C.breakB, 16, false);
    P(ctx, 464, 86, 16, 2, C.wallLine);
    P(ctx, 464, 120, 16, 2, C.wallLine);
    P(ctx, 464, 266, 16, 2, C.wallLine);
    P(ctx, 464, 308, 16, 2, C.wallLine);
    P(ctx, 526, 192, 2, 16, C.wallLine);
    P(ctx, 568, 192, 2, 16, C.wallLine);
    // 문 앞 매트
    P(ctx, 466, 92, 12, 24, '#cdbfa6');
    P(ctx, 468, 96, 8, 16, '#bfae92');
    P(ctx, 466, 276, 12, 24, '#cdbfa6');
    P(ctx, 468, 280, 8, 16, '#bfae92');

    // 벽 장식: 게시판
    P(ctx, 226, 1, 134, 16, C.corkDark);
    P(ctx, 228, 2, 130, 14, C.cork);
    var notes = [
      [234, 4, '#fdf3c4'], [256, 6, '#d9ecf7'], [278, 3, '#fbd8d2'],
      [300, 6, '#e2f0d8'], [322, 4, '#fdf3c4']
    ];
    for (var i = 0; i < notes.length; i++) {
      P(ctx, notes[i][0], notes[i][1], 16, 10, notes[i][2]);
      P(ctx, notes[i][0] + 7, notes[i][1] + 2, 2, 2, '#c25a4f');
    }

    // 창문
    var wx = 384;
    P(ctx, wx - 2, 1, 74, 16, '#b9a98c');
    P(ctx, wx, 2, 70, 14, C.glassLine);
    P(ctx, wx + 2, 3, 66, 12, C.glass);
    P(ctx, wx + 33, 3, 2, 12, C.glassLine);
    P(ctx, wx + 2, 9, 66, 2, C.glassLine);
    P(ctx, wx + 8, 5, 14, 3, 'rgba(255,255,255,0.8)');
    P(ctx, wx + 42, 8, 12, 3, 'rgba(255,255,255,0.6)');

    // 벽시계 (바늘은 drawDynamic에서)
    P(ctx, 53, 2, 14, 14, '#8b7b61');
    P(ctx, 54, 3, 12, 12, '#fffdf6');
    P(ctx, 59, 5, 2, 1, '#6b6257');
    P(ctx, 59, 6, 1, 4, '#6b6257');

    // 회의실 화이트보드 (위쪽 벽)
    P(ctx, 516, 2, 104, 14, '#b9a98c');
    P(ctx, 518, 3, 100, 12, '#fbf9f1');
    P(ctx, 522, 6, 22, 2, '#6f8fd6');
    P(ctx, 522, 10, 30, 2, '#d68a6f');
    P(ctx, 566, 6, 16, 2, '#6f8fd6');
    P(ctx, 592, 6, 12, 6, '#cfe3c9');

    // 걸레받이
    P(ctx, 18, 18, 446, 2, 'rgba(120,100,70,0.18)');
    P(ctx, 480, 18, 222, 2, 'rgba(120,100,70,0.18)');
    P(ctx, 480, 208, 222, 2, 'rgba(120,100,70,0.18)');
  }

  function furniture(ctx, state, workingId) {
    var items = [];
    function add(baseY, fn) { items.push({ y: baseY, fn: fn }); }

    // ── 팀장 충의 자리
    add(100, function () {
      desk(ctx, 52, 48, 104, 40, {
        nameplate: true,
        screen: workingId === 'michael' ? C.screenGlow : C.screen,
        mug: '#e4d8c2'
      });
      P(ctx, 74, 56, 60, 9, '#fdf8ea');
      P(ctx, 76, 58, 56, 6, '#e6dcc6');
      P(ctx, 82, 60, 44, 2, '#bfb3a0');
      P(ctx, 138, 78, 16, 8, '#cdd8e2');
      P(ctx, 138, 74, 16, 4, '#e3ecf3');
      chair(ctx, 104, 96);
    });

    // ── 직원 책상 4개
    var desks = [
      { id: 'minsu', x: 52, y: 144 },
      { id: 'jiyeon', x: 200, y: 144 },
      { id: 'hyunwoo', x: 52, y: 240 },
      { id: 'dayoung', x: 200, y: 240 }
    ];
    for (var i = 0; i < desks.length; i++) {
      (function (d) {
        add(d.y + 34, function () {
          desk(ctx, d.x, d.y, 80, 32, {
            screen: workingId === d.id ? C.screenGlow : C.screen,
            mug: d.id === 'jiyeon' ? '#f3c9d8' : (d.id === 'hyunwoo' ? '#cfd8c2' : '#e9e3d4')
          });
          chair(ctx, d.x + 40, d.y + 44);
        });
      })(desks[i]);
    }

    // ── 게시판(서 있는 안내판)
    add(392, function () {
      shadow(ctx, 110, 388, 60, 5);
      P(ctx, 116, 374, 4, 16, C.metalDark);
      P(ctx, 160, 374, 4, 16, C.metalDark);
      P(ctx, 108, 344, 64, 32, C.corkDark);
      P(ctx, 110, 346, 60, 28, C.cork);
      P(ctx, 114, 350, 24, 16, '#fdf3c4');
      P(ctx, 142, 352, 22, 12, '#d9ecf7');
      P(ctx, 143, 366, 20, 8, '#fbd8d2');
    });

    // ── 서가 (위쪽 벽)
    add(84, function () {
      shadow(ctx, 296, 82, 74, 5);
      P(ctx, 298, 40, 72, 44, '#c39a6b');
      P(ctx, 298, 40, 72, 4, '#dcb98e');
      P(ctx, 300, 44, 68, 16, '#8f6738');
      P(ctx, 300, 62, 68, 16, '#8f6738');
      var books = ['#c25a4f', '#4a86e8', '#4a9e6b', '#eab04a', '#8f6cf0', '#e2665c'];
      for (var b = 0; b < 6; b++) {
        P(ctx, 303 + b * 11, 46, 8, 14, books[b]);
        P(ctx, 303 + b * 11, 46, 8, 2, 'rgba(255,255,255,0.35)');
      }
      for (var b2 = 0; b2 < 5; b2++) {
        P(ctx, 303 + b2 * 12, 64, 9, 14, books[(b2 + 2) % 6]);
        P(ctx, 303 + b2 * 12, 64, 9, 2, 'rgba(255,255,255,0.35)');
      }
      P(ctx, 300, 78, 68, 3, '#a97f4f');
    });

    // ── 수납장
    add(292, function () {
      shadow(ctx, 168, 290, 82, 5);
      P(ctx, 170, 264, 78, 28, '#cfd8df');
      P(ctx, 170, 264, 78, 4, '#e7eef3');
      P(ctx, 170, 288, 78, 3, '#aab6c0');
      P(ctx, 174, 268, 32, 18, '#dde6ec');
      P(ctx, 210, 268, 32, 18, '#dde6ec');
      P(ctx, 186, 276, 6, 3, C.metalDark);
      P(ctx, 222, 276, 6, 3, C.metalDark);
      P(ctx, 176, 268, 28, 4, '#eab04a');
    });

    // ── 상담 테이블 (둥근 테이블 + 의자 2개)
    add(196, function () {
      shadow(ctx, 320, 196, 64, 5);
      chair(ctx, 352, 146);
      pEllipse(ctx, 352, 176, 36, 20, C.woodDark, 2);
      pEllipse(ctx, 352, 173, 33, 17, C.wood, 2);
      pEllipse(ctx, 352, 171, 29, 14, C.woodLight, 2);
      P(ctx, 338, 166, 10, 8, C.paper);
      P(ctx, 340, 168, 6, 1, C.paperLine);
      P(ctx, 358, 168, 8, 7, '#e9e3d4');
      P(ctx, 356, 170, 5, 2, '#7a5b3a');
      chair(ctx, 352, 206);
    });

    // ── 복합기 + 서류 캐비닛
    add(268, function () {
      shadow(ctx, 384, 264, 46, 5);
      P(ctx, 388, 236, 42, 28, '#e9edf1');
      P(ctx, 388, 236, 42, 5, '#f7fafc');
      P(ctx, 388, 258, 42, 6, '#c6ced6');
      P(ctx, 396, 242, 22, 10, '#cdd7df');
      P(ctx, 400, 245, 14, 3, '#8fa0af');
      P(ctx, 392, 250, 8, 5, '#b9c4cd');
      P(ctx, 416, 248, 8, 3, '#e2665c');
    });
    add(356, function () {
      shadow(ctx, 390, 352, 46, 5);
      P(ctx, 392, 300, 42, 54, '#c9d3dd');
      P(ctx, 392, 300, 42, 4, '#e3ebf2');
      P(ctx, 394, 306, 38, 20, '#dce5ed');
      P(ctx, 394, 330, 38, 20, '#dce5ed');
      P(ctx, 410, 314, 6, 3, C.metalDark);
      P(ctx, 410, 338, 6, 3, C.metalDark);
      // 택배 상자
      P(ctx, 332, 330, 34, 24, '#d5b083');
      P(ctx, 332, 330, 34, 4, '#e2c096');
      P(ctx, 346, 330, 6, 24, '#c39b6d');
      P(ctx, 336, 336, 8, 5, '#f6efdf');
    });

    // ── 화분 · 휴지통
    add(60, function () { plant(ctx, 434, 54, 1); });
    add(382, function () { plant(ctx, 34, 374, 1.1); });
    add(214, function () {
      P(ctx, 156, 200, 14, 14, '#b7c0c8');
      P(ctx, 157, 201, 12, 3, '#cdd5db');
      P(ctx, 158, 198, 10, 2, '#9aa5b1');
    });

    // ── 회의실
    add(76, function () {
      chair(ctx, 560, 70); chair(ctx, 596, 66); chair(ctx, 632, 70);
    });
    add(158, function () {
      pEllipse(ctx, 596, 112, 58, 30, '#c99a63', 2);
      pEllipse(ctx, 596, 109, 56, 27, C.wood, 2);
      pEllipse(ctx, 596, 107, 52, 24, C.woodLight, 2);
      P(ctx, 566, 100, 22, 14, C.frame);
      P(ctx, 568, 102, 18, 10, C.screen);
      P(ctx, 600, 96, 20, 14, C.paper);
      P(ctx, 602, 99, 16, 1, C.paperLine);
      P(ctx, 602, 102, 12, 1, C.paperLine);
      P(ctx, 628, 104, 10, 10, '#e9e3d4');
      P(ctx, 596, 120, 8, 10, '#e8f2f6');
      chair(ctx, 560, 158); chair(ctx, 600, 162); chair(ctx, 636, 158);
    });

    // ── 휴게실
    add(272, function () {
      shadow(ctx, 498, 268, 114, 5);
      sofa(ctx, 500, 232, 112, 38);
    });
    add(304, function () {
      P(ctx, 512, 282, 92, 22, C.woodDark);
      P(ctx, 512, 282, 92, 5, C.woodLight);
      P(ctx, 512, 300, 92, 4, C.woodShade);
      P(ctx, 524, 286, 8, 7, '#fdf8ea');
      P(ctx, 538, 286, 8, 7, '#e8dcc6');
      P(ctx, 526, 284, 4, 2, '#7a5b3a');
      P(ctx, 540, 284, 4, 2, '#7a5b3a');
      // 화분 (작은)
      P(ctx, 580, 286, 10, 9, C.pot);
      P(ctx, 582, 280, 6, 7, C.leaf);
      P(ctx, 584, 277, 4, 5, C.leafLight);
    });
    add(258, function () {
      // 카운터 + 커피머신
      shadow(ctx, 634, 252, 62, 5);
      P(ctx, 636, 222, 60, 28, '#e2d6c4');
      P(ctx, 636, 222, 60, 4, '#f2e9da');
      P(ctx, 636, 246, 60, 4, '#cbbda7');
      P(ctx, 648, 192, 32, 30, C.frame);
      P(ctx, 651, 196, 26, 9, '#3a4a58');
      P(ctx, 653, 198, 6, 4, '#e2665c');
      P(ctx, 662, 198, 6, 4, '#eab04a');
      P(ctx, 654, 208, 20, 5, C.metal);
      P(ctx, 660, 213, 8, 5, '#f4f0e6');
      P(ctx, 660, 219, 8, 3, '#d8d2c4');
      // 컵
      P(ctx, 678, 236, 6, 7, '#e8f2f6');
      P(ctx, 686, 236, 6, 7, '#e8f2f6');
      P(ctx, 644, 234, 24, 8, '#f6efdf');
      P(ctx, 646, 236, 20, 4, '#e6dcc6');
    });
    add(370, function () {
      // 정수기
      shadow(ctx, 488, 368, 26, 4);
      P(ctx, 490, 330, 22, 38, '#e9edf1');
      P(ctx, 490, 330, 22, 4, '#f7fafc');
      P(ctx, 493, 334, 16, 12, C.water);
      P(ctx, 496, 350, 10, 4, '#9aa5b1');
      P(ctx, 498, 356, 6, 3, '#5f6b79');
    });
    add(384, function () { plant(ctx, 678, 384, 1.15); });

    return items;
  }

  /* ---------------- 캐릭터 ---------------- */

  var LOOKS = {
    michael: { skin: C.skin, hair: '#241f2b', shirt: '#2f6f5e', shirtLight: '#3d8a75', pants: '#2c3a44', style: 'short', tie: C.yellow },
    minsu: { skin: C.skin, hair: '#2c2b2f', shirt: '#4a86e8', shirtLight: '#6ba0f2', pants: '#31394a', style: 'short' },
    jiyeon: { skin: C.skin, hair: '#6b4426', shirt: '#ef7fae', shirtLight: '#f7a1c6', pants: '#4a3b52', style: 'long' },
    hyunwoo: { skin: C.skin, hair: '#3f2e3a', shirt: '#eda34a', shirtLight: '#f5bd76', pants: '#3a3f4a', style: 'long' },
    dayoung: { skin: C.skin, hair: '#7a4a2a', shirt: '#8f6cf0', shirtLight: '#a98cf5', pants: '#3f3550', style: 'bun' }
  };

  function eyes(ctx, cx, cy, look, facing, blink) {
    if (facing === 'up') return;
    var off = facing === 'left' ? -2 : (facing === 'right' ? 2 : 0);
    if (blink) {
      P(ctx, cx - 6 + off, cy, 4, 1, '#3a3038');
      P(ctx, cx + 2 + off, cy, 4, 1, '#3a3038');
    } else {
      P(ctx, cx - 6 + off, cy - 1, 3, 3, '#3a3038');
      P(ctx, cx + 3 + off, cy - 1, 3, 3, '#3a3038');
      P(ctx, cx - 6 + off, cy - 1, 1, 1, '#ffffff');
      P(ctx, cx + 3 + off, cy - 1, 1, 1, '#ffffff');
    }
    // 볼
    P(ctx, cx - 9 + off, cy + 3, 3, 2, 'rgba(238,150,140,0.45)');
    P(ctx, cx + 6 + off, cy + 3, 3, 2, 'rgba(238,150,140,0.45)');
  }

  function hair(ctx, cx, top, style, color) {
    P(ctx, cx - 9, top, 18, 8, color);
    P(ctx, cx - 9, top + 4, 2, 6, color);
    P(ctx, cx + 7, top + 4, 2, 6, color);
    if (style === 'long') {
      P(ctx, cx - 10, top + 6, 3, 16, color);
      P(ctx, cx + 7, top + 6, 3, 16, color);
    } else if (style === 'bun') {
      P(ctx, cx - 3, top - 4, 7, 5, color);
      P(ctx, cx - 10, top + 6, 2, 8, color);
      P(ctx, cx + 8, top + 6, 2, 8, color);
    } else if (style === 'cap') {
      P(ctx, cx - 10, top - 2, 20, 4, '#33465a');
      P(ctx, cx - 8, top - 4, 16, 4, '#3d5570');
    }
    P(ctx, cx - 4, top - 1, 8, 2, 'rgba(255,255,255,0.18)');
  }

  function drawStanding(ctx, c, look, t) {
    var x = Math.round(c.x * T), y = Math.round(c.y * T);
    var walk = c.walking ? Math.sin(c.phase) : 0;
    var legOff = Math.round(walk * 3);

    P(ctx, x - 10, y - 3, 21, 4, 'rgba(60,45,25,0.16)');
    P(ctx, x - 8, y - 2, 17, 2, 'rgba(60,45,25,0.12)');

    // 다리
    P(ctx, x - 7, y - 12, 6, 10 - Math.abs(legOff) / 2, look.pants);
    P(ctx, x + 2, y - 12, 6, 10 - Math.abs(legOff) / 2, look.pants);
    P(ctx, x - 7 + (legOff > 0 ? 0 : 1), y - 4, 6, 3, '#2b333c');
    P(ctx, x + 2 + (legOff > 0 ? 1 : 0), y - 4, 6, 3, '#2b333c');

    // 몸통
    P(ctx, x - 9, y - 27, 18, 16, look.shirt);
    P(ctx, x - 9, y - 27, 18, 3, look.shirtLight);
    P(ctx, x - 9, y - 13, 18, 2, 'rgba(0,0,0,0.12)');
    if (look.tie) {
      P(ctx, x - 1, y - 25, 3, 10, look.tie);
    }
    // 팔
    P(ctx, x - 13, y - 26, 5, 13, look.shirt);
    P(ctx, x + 8, y - 26, 5, 13, look.shirt);
    P(ctx, x - 13, y - 15, 5, 4, look.skin);
    P(ctx, x + 8, y - 15, 5, 4, look.skin);

    // 머리
    P(ctx, x - 8, y - 42, 16, 15, look.skin);
    P(ctx, x - 8, y - 28, 16, 2, look.skin);
    hair(ctx, x, y - 43, look.style, look.hair);
    eyes(ctx, x, y - 34, look, c.facing, c.blink);
    P(ctx, x - 2, y - 30, 4, 1, '#c98b7f');
  }

  function drawSeated(ctx, c, look, t) {
    var x = Math.round(c.x * T), y = Math.round(c.y * T);
    var bob = Math.round(Math.sin(t * 1.8 + x) * 1);
    var typing = c.status === '일하는 중' ? Math.round(Math.abs(Math.sin(t * 8)) * 2) : 0;
    y += bob;

    // 몸통 (좌석에 앉은 모습: 엉덩이가 좌판에 닿는다)
    P(ctx, x - 9, y - 21, 18, 19, look.shirt);
    P(ctx, x - 9, y - 21, 18, 3, look.shirtLight);
    P(ctx, x - 9, y - 4, 18, 2, 'rgba(0,0,0,0.10)');
    if (look.tie) P(ctx, x - 1, y - 19, 3, 9, look.tie);
    // 팔 (책상 쪽으로)
    P(ctx, x - 14, y - 19 - typing, 5, 12, look.shirt);
    P(ctx, x + 9, y - 19 - typing, 5, 12, look.shirt);
    P(ctx, x - 14, y - 9 - typing, 5, 4, look.skin);
    P(ctx, x + 9, y - 9 - typing, 5, 4, look.skin);
    // 머리
    P(ctx, x - 8, y - 37, 16, 15, look.skin);
    hair(ctx, x, y - 38, look.style, look.hair);
    eyes(ctx, x, y - 29, look, c.facing || 'down', c.blink);
    P(ctx, x - 2, y - 25, 4, 1, '#c98b7f');
  }

  /* ---------------- 메인 ---------------- */

  function drawStatic(ctx, state) {
    state = state || {};
    drawBackground(ctx, state);
    var items = furniture(ctx, state, '');
    items.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < items.length; i++) items[i].fn();

    // 출입구 (맨 앞)
    P(ctx, 236, 398, 76, 18, '#c9b795');
    P(ctx, 240, 400, 68, 14, '#8f7b5c');
    P(ctx, 244, 402, 60, 10, '#b09a78');
    P(ctx, 262, 404, 24, 6, '#cfbba0');
    P(ctx, 266, 406, 16, 2, '#8f7b5c');
    P(ctx, 250, 384, 48, 12, '#f6f1e2');
    P(ctx, 252, 386, 44, 8, '#e8dfcc');
    P(ctx, 258, 388, 6, 4, '#8a8271');
    P(ctx, 268, 388, 6, 4, '#8a8271');
    P(ctx, 278, 388, 6, 4, '#8a8271');
  }

  var DESK_POS = {
    michael: [52, 48], minsu: [52, 144], jiyeon: [200, 144],
    hyunwoo: [52, 240], dayoung: [200, 240]
  };

  function drawDynamic(ctx, state) {
    state = state || {};
    var t = state.time || 0;
    var chars = state.chars || [];
    var workingId = '';
    for (var i = 0; i < chars.length; i++) {
      if (chars[i].status === '일하는 중') workingId = chars[i].id;
    }

    // 시계 초침
    var ang = ((t / 60) % 1) * Math.PI * 2;
    var hx = Math.cos(ang) * 3.6, hy = Math.sin(ang) * 3.6;
    P(ctx, 60 + (hx > 0 ? 0 : hx), 9 + (hy > 0 ? 0 : hy), Math.abs(hx) + 1, Math.abs(hy) + 1, '#c25a4f');
    P(ctx, 60, 9, 2, 2, '#6b6257');

    // 일하는 직원 화면 밝게
    if (workingId && DESK_POS[workingId]) {
      var d = DESK_POS[workingId];
      P(ctx, d[0] + 10, d[1] + 7, 28, 13, '#8ff0d8');
      P(ctx, d[0] + 12, d[1] + 9, 12, 3, 'rgba(255,255,255,0.55)');
      P(ctx, d[0] + 10, d[1] + 7, 28, 2, 'rgba(255,255,255,0.35)');
    }

    var items = [];
    for (var j = 0; j < chars.length; j++) {
      (function (c) {
        items.push({
          y: c.y * T,
          fn: function () {
            var look = LOOKS[c.id] || LOOKS.minsu;
            if (c.sitting) drawSeated(ctx, c, look, t);
            else drawStanding(ctx, c, look, t);
          }
        });
      })(chars[j]);
    }
    items.sort(function (a, b) { return a.y - b.y; });
    for (var k = 0; k < items.length; k++) items[k].fn();
  }

  function draw(ctx, state) {
    drawStatic(ctx, state);
    drawDynamic(ctx, state);
  }

  var api = { W: W, H: H, T: T, draw: draw, drawStatic: drawStatic, drawDynamic: drawDynamic, LOOKS: LOOKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OfficeArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
