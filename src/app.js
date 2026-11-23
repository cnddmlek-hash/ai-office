/* 내 AI 오피스 — 앱 로직 (외부 라이브러리 없음) */
(function () {
  'use strict';

  /* =========================================================
     1. 공통 도우미
     ========================================================= */
  function $(id) { return document.getElementById(id); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function clockText(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function oneLine(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function clip(s, n) { var t = oneLine(s); return t.length > n ? t.slice(0, n) + '…' : t; }
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function isToday(ts) {
    var a = new Date(ts), b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function logStamp(ts) {
    var d = new Date(ts);
    return (isToday(ts) ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ') + clockText(d);
  }
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* =========================================================
     2. 저장소 (localStorage · 예외 방어)
     ========================================================= */
  var K = {
    api: 'aiOffice.apiKey.v1',
    model: 'aiOffice.model.v1',
    cards: 'aiOffice.cards.v1',
    logs: 'aiOffice.logs.v1',
    results: 'aiOffice.results.v1',
    draft: 'aiOffice.draft.v1'
  };
  var storageOK = true;
  var LS = {
    get: function (k, d) {
      try {
        var v = window.localStorage.getItem(k);
        if (v == null) return d;
        return JSON.parse(v);
      } catch (e) { storageOK = false; return d; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch (e) { storageOK = false; return false; }
    },
    del: function (k) {
      try { window.localStorage.removeItem(k); } catch (e) { /* 무시 */ }
    }
  };

  /* =========================================================
     3. 직원 정의 (지침은 확정본 그대로 내장)
     ========================================================= */
  var STAFF = {
    michael: { name: '충의', role: '팀장', short: '업무 배정', color: '#2f6f5e', initial: '충' },
    minsu: { name: '상준', role: '주문·반품 정리', short: '주문·반품 정리', color: '#4a86e8', initial: '상' },
    jiyeon: { name: '아름', role: '수금·정산 체크', short: '수금·정산', color: '#ef7fae', initial: '아' },
    hyunwoo: { name: '다영', role: '거래처 소통', short: '연락 문구', color: '#eda34a', initial: '다' },
    dayoung: { name: '재희', role: '홍보·영상 기획', short: '홍보·영상', color: '#8f6cf0', initial: '재' }
  };
  var WORKERS = ['minsu', 'jiyeon', 'hyunwoo', 'dayoung'];

  var FORMAT_RULES = `

[출력 형식]
- 답변은 바로 복사해서 쓸 수 있는 마크다운으로만 정리해.
- 표는 | 항목 | 내용 | 형태의 마크다운 표로 만들어.
- 인사말, 자기소개, 부연 설명은 넣지 마.
- 모든 답변은 한국어로 써.`;

  var PROMPTS = {
    minsu: `너는 제약·의료 영업(의원급 거래처) 주문과 반품 메모를 정리하는 AI 직원 '상준'야.

[하는 일]
- 내가 거래처에서 받은 카톡 주문 쪽지, 반품 요청, 통화 메모를 그대로 던지면 CRM에 바로 옮겨 적기 좋게 표로 정리해 줘.
- 항목은 [거래처명 / 품목명 / 규격 / 수량(박스·낱개 구분) / 냉장·회수 등 특이사항]으로 나눠 줘.
- 같은 거래처의 이전 단가·수량 조건을 같이 붙여 넣으면 이번에 달라진 점(수량 미달, 할인 차이 등)을 맨 위에 따로 짚어 줘.

[지킬 규칙]
1. 쪽지에 없는 규격, 수량, 단가는 절대 추측해서 채우지 말고 '확인 필요'라고 표시해.
2. 반품 건은 '재고 미소진 여부'와 '택배 회수 필요 여부'를 확인 항목으로 꼭 남겨 줘.
3. 설명 길게 하지 말고 정리된 표와 확인 질문(있을 때만 1~2줄)만 바로 보여 줘.`,

    jiyeon: `너는 거래처 회전일, 미수 잔고, 정산서 대조를 담당하는 AI 직원 '아름'이야.

[하는 일]
- 내가 엑셀 표나 거래원장·정산서 내용을 올리면 핵심만 골라 요약해 줘.
- 수금 표에서는 [회전일 100일 이상 / 80~99일 / 잔고 큰 순서]로 우선순위를 나눠 표로 보여 줘.
- 정산서와 내 기록을 같이 주면 금액·수수료율(%)이 다른 항목, 빠진 품목, 소액 기준 미달 의심 건만 따로 뽑아 줘.

[지킬 규칙]
1. 합계, 잔액, 날짜는 내가 준 자료에 있는 숫자만 그대로 계산해. 불확실하면 절대 어림잡지 마.
2. 대외비 자료가 섞여 있으면 외부 공유용 문구는 쓰지 말고, 내가 내부 확인만 하기 좋은 표로 줘.
3. 마지막에 '오늘 먼저 연락하거나 문의할 곳 Top 3'를 이유 한 줄씩 붙여서 정리해 줘.`,

    hyunwoo: `너는 의원급 거래처(원장님·실장님)와 본사·협력사 연락 문구를 대신 써 주는 AI 직원 '다영'야.

[하는 일]
- 내가 상황만 짧게 던지면(예: 수금 안내, 품절·입고 지연, 정산 이의 문의) 바로 복사해서 보낼 수 있는 카톡·문자·메일 초안을 써 줘.
- 거래처용은 정중하고 부담 없게, 본사·정산 문의용은 핵심 숫자와 날짜가 딱 보이게 써 줘.

[지킬 규칙]
1. 한 번에 [짧은 카톡용]과 [정식 안내·메일용] 두 가지 버전만 딱 줘.
2. 너무 딱딱하거나 AI 티 나는 인사말('항상 건강하시길 바라며...' 같은 장황한 표현)은 빼고 자연스럽게 써 줘.
3. 거래처명, 금액, 날짜 중 내가 안 적어 준 빈칸은 [거래처명], [금액]처럼 표시해서 실수 없이 채워 넣게 해 줘.`,

    dayoung: `너는 제품 홍보물, 원내 안내문, 짧은 홍보 영상(릴스·쇼츠) 초안을 만드는 AI 직원 '재희'이야.

[하는 일]
- 내가 제품 정보나 홍보하고 싶은 주제를 던지면, 원장님용 핵심 소구 포인트 3줄과 바로 쓸 수 있는 홍보물 문구를 만들어 줘.
- 영상으로 만들고 싶다고 하면 30초 분량의 [장면 순서 / 화면 자막 / 내레이션] 표로 짜 줘.

[지킬 규칙]
1. 전문 의학·약학 용어는 설명이 필요할 때만 쉬운 말로 한 번 풀어서 써 줘.
2. 허위·과장처럼 보일 수 있는 효능 단정 표현('100% 완치', '무조건 효과' 등)은 절대 쓰지 말고, 사실 기반 장점으로만 정리해 줘.
3. 첫 줄은 시선을 끄는 한 문장으로 시작하고, 군더더기 없이 바로 쓸 수 있게 줘.`
  };

  /* =========================================================
     4. Gemini API 설정
     ========================================================= */
  var API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var DEFAULT_MODEL = 'gemini-3.6-flash';
  // 실제로 무료 등급에서 안정적으로 응답하는 모델을 앞에 둔다
  var MODELS = [
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (권장 · 무료)' },
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (빠름 · 무료)' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (가벼움 · 무료)' },
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (혼잡할 수 있음 · 무료)' },
    { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (혼잡할 수 있음 · 무료)' }
  ];
  // 혼잡(500·503)·한도(429)로 막히면 이 순서로 자동 재시도한다
  var FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  var RETRY_KINDS = { server: true, quota: true };

  function ApiError(kind, user, detail) {
    this.kind = kind;
    this.user = user;
    this.detail = detail || '';
    this.message = user + (detail ? ' / ' + detail : '');
  }

  function requestGemini(opts) {
    var key = opts.key;
    var model = opts.model || DEFAULT_MODEL;
    var url = API_BASE + encodeURIComponent(model) + ':generateContent';
    var body = {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: 'user', parts: [{ text: opts.text }] }]
    };
    var payload = JSON.stringify(body);
    var ctl = null;
    try { ctl = new AbortController(); } catch (e) { ctl = null; }
    var timer = setTimeout(function () { try { if (ctl) ctl.abort(); } catch (e) {} }, opts.timeoutMs || 120000);

    function doFetch(withHeader) {
      var headers = { 'Content-Type': 'application/json' };
      var u = url;
      if (withHeader) headers['x-goog-api-key'] = key;
      else u = url + '?key=' + encodeURIComponent(key);
      return fetch(u, {
        method: 'POST',
        headers: headers,
        body: payload,
        signal: ctl ? ctl.signal : undefined
      });
    }

    var p;
    try {
      p = doFetch(true);
    } catch (e) {
      p = Promise.reject(e);
    }

    return p.catch(function (e) {
      if (e && e.name === 'AbortError') throw new ApiError('timeout', '응답이 너무 오래 걸려서 멈췄어요(2분). 잠시 뒤 다시 시도해 주세요.');
      // 헤더가 막히는 환경이면 키를 주소에 붙여 한 번 더 시도
      return doFetch(false).catch(function () {
        throw new ApiError('network', '인터넷 연결을 확인해 주세요.', '브라우저에서 파일을 직접 열었다면 크롬이나 엣지로 열어 보세요.');
      });
    }).then(function (res) {
      return res.json().then(function (data) {
        return { res: res, data: data };
      }, function () {
        return { res: res, data: null };
      });
    }).then(function (r) {
      clearTimeout(timer);
      var res = r.res, data = r.data;
      if (!res.ok) {
        var errObj = data && data.error;
        var msg = (errObj && errObj.message) ? String(errObj.message) : '';
        var reason = '';
        if (errObj && errObj.details && errObj.details.length) {
          for (var di = 0; di < errObj.details.length; di++) {
            if (errObj.details[di] && errObj.details[di].reason) { reason = String(errObj.details[di].reason); break; }
          }
        }
        var status = res.status;
        if (reason === 'API_KEY_INVALID' || /API key not valid/i.test(msg)) {
          throw new ApiError('auth', 'API 키가 올바르지 않아요. AI Studio에서 키를 다시 복사해서 넣어 주세요.', msg);
        }
        if (reason === 'SERVICE_DISABLED' || reason === 'API_KEY_SERVICE_BLOCKED' || /has not been used|is disabled|not enabled/i.test(msg)) {
          throw new ApiError('service', '이 키로 Gemini API를 쓸 수 없어요. aistudio.google.com에서 새 키를 만들어 보세요.', msg);
        }
        if (status === 400) {
          throw new ApiError('bad_request', '요청을 처리하지 못했어요. 입력이 너무 길거나 형식이 맞지 않을 수 있어요.', msg);
        }
        if (status === 402) {
          throw new ApiError('billing', '이 프로젝트는 선불 크레딧이 0원이라 막혀 있어요. 결제 연동 없는 무료 등급(Free Tier) 프로젝트나 다른 구글 계정으로 새 키를 받거나, AI Studio에서 선불 크레딧을 확인해 주세요.', msg);
        }
        if (status === 401 || status === 403) {
          throw new ApiError('auth', 'API 키가 올바르지 않거나 이 모델을 쓸 권한이 없어요. AI Studio에서 키를 다시 확인해 주세요.', msg);
        }
        if (status === 404) {
          throw new ApiError('model', '이 모델을 지금 키로 쓸 수 없어요. 설정에서 다른 모델로 바꿔 보세요.', msg);
        }
        if (status === 429) {
          throw new ApiError('quota', '무료 사용량 한도를 넘었어요. 1분쯤 뒤에 다시 시도해 주세요.', msg);
        }
        if (status >= 500) {
          throw new ApiError('server', '구글 쪽이 잠시 바빠요. 1분 뒤에 다시 시도해 주세요.', msg);
        }
        throw new ApiError('http', '요청이 실패했어요. (오류 ' + status + ')', msg);
      }
      var block = data && data.promptFeedback && data.promptFeedback.blockReason;
      if (block) {
        throw new ApiError('blocked', '이 내용은 AI가 답할 수 없다고 판단했어요. 표현을 조금 바꿔서 다시 보내 주세요.', 'blockReason: ' + block);
      }
      var cand = data && data.candidates && data.candidates[0];
      var parts = (cand && cand.content && cand.content.parts) || [];
      var text = '';
      for (var i = 0; i < parts.length; i++) {
        if (typeof parts[i].text === 'string' && !parts[i].thought) text += parts[i].text;
      }
      text = text.trim();
      var finish = cand && cand.finishReason;
      if (!text) {
        if (finish === 'MAX_TOKENS') throw new ApiError('long', '답변이 길어서 잘렸어요. 입력을 조금 줄이거나 나눠서 보내 주세요.');
        if (finish === 'SAFETY' || finish === 'RECITATION') throw new ApiError('blocked', '이 내용은 답변으로 만들 수 없다고 판단했어요. 표현을 바꿔 다시 보내 주세요.');
        throw new ApiError('empty', 'AI가 빈 답변을 보냈어요. 다시 한 번 시도해 주세요.');
      }
      var used = (data && data.modelVersion) || model;
      var usage = (data && data.usageMetadata) || {};
      return { text: text, model: used, finish: finish, usage: usage };
    }).catch(function (e) {
      clearTimeout(timer);
      if (e instanceof ApiError) throw e;
      throw new ApiError('network', '인터넷 연결을 확인해 주세요.', e && e.message ? String(e.message) : '');
    });
  }

  // 고른 모델 → 안정 모델 순서. 이미 앞에 있는 모델은 중복해서 넣지 않는다.
  function fallbackChain(first) {
    var chain = [first || DEFAULT_MODEL];
    for (var i = 0; i < FALLBACK_MODELS.length; i++) {
      if (chain.indexOf(FALLBACK_MODELS[i]) === -1) chain.push(FALLBACK_MODELS[i]);
    }
    return chain;
  }

  // 혼잡(500·503)·한도(429)면 다음 안정 모델로 스스로 넘어가 이어서 처리한다.
  // auth·billing·blocked·timeout·bad_request 등은 재시도하지 않고 바로 알린다.
  function requestGeminiWithFallback(opts) {
    var chain = fallbackChain(opts.model);
    var idx = 0;
    function attempt() {
      var o = {};
      for (var k in opts) { if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k]; }
      o.model = chain[idx];
      return requestGemini(o).then(function (r) {
        r.requestedModel = chain[0];
        r.attemptedModel = chain[idx];
        r.fellBack = idx > 0;
        r.attempted = chain.slice(0, idx + 1);
        return r;
      }).catch(function (e) {
        var kind = e && e.kind;
        if (RETRY_KINDS[kind] && idx + 1 < chain.length) {
          idx++;
          return attempt();
        }
        if (RETRY_KINDS[kind]) {
          e.tried = chain.slice(0, idx + 1);
          var note = '시도한 모델: ' + e.tried.join(', ');
          e.detail = e.detail ? (e.detail + ' / ' + note) : note;
          e.user += ' (모델 ' + e.tried.length + '개가 모두 응답하지 못했어요)';
          e.message = e.user + (e.detail ? ' / ' + e.detail : '');
        }
        throw e;
      });
    }
    return attempt();
  }

  /* =========================================================
     5. 상태
     ========================================================= */
  var state = {
    key: '',
    model: DEFAULT_MODEL,
    demo: false,
    cards: [],
    logs: [],
    results: [],
    activeResult: null,
    activeCardId: '',
    submitting: false
  };

  /* =========================================================
     6. 캐릭터 & 애니메이션
     ========================================================= */
  var HOME = {
    michael: { x: 6.5, y: 6.1 },
    minsu: { x: 5.75, y: 12.15 },
    jiyeon: { x: 15, y: 12.15 },
    hyunwoo: { x: 5.75, y: 18.15 },
    dayoung: { x: 15, y: 18.15 }
  };
  var AISLE = 10.45;

  var chars = {};
  Object.keys(STAFF).forEach(function (id) {
    chars[id] = {
      id: id,
      x: HOME[id].x,
      y: HOME[id].y,
      path: [],
      onArrive: null,
      speed: 3.1,
      status: '쉬는 중',
      facing: 'down',
      sitting: true,
      walking: false,
      phase: 0,
      blink: false,
      blinkTimer: 2 + Math.random() * 3
    };
  });

  function pathMichaelTo(id) {
    var base = [{ x: AISLE, y: 6.6 }];
    if (id === 'minsu') return base.concat([{ x: AISLE, y: 13.4 }, { x: 8.2, y: 13.4 }]);
    if (id === 'jiyeon') return base.concat([{ x: AISLE, y: 13.4 }, { x: 13.6, y: 13.4 }]);
    if (id === 'hyunwoo') return base.concat([{ x: AISLE, y: 19.4 }, { x: 8.2, y: 19.4 }]);
    return base.concat([{ x: AISLE, y: 19.4 }, { x: 13.6, y: 19.4 }]);
  }
  function pathHome(id) {
    return [{ x: AISLE, y: id === 'michael' ? 6.6 : (HOME[id].y > 15 ? 19.6 : 13.6) }, { x: HOME[id].x, y: HOME[id].y }];
  }
  function pathToReport(id) {
    var h = HOME[id];
    var out = [{ x: h.x, y: h.y > 15 ? 19.9 : 13.9 }, { x: AISLE, y: h.y > 15 ? 19.9 : 13.9 }];
    if (h.y > 15) out.push({ x: AISLE, y: 13.9 });
    out.push({ x: AISLE, y: 6.3 });
    out.push({ x: 10.6, y: 6.3 });
    return out;
  }

  function walkTo(id, pts, speed) {
    var c = chars[id];
    if (c.onArrive) { var old = c.onArrive; c.onArrive = null; old(); }
    return new Promise(function (resolve) {
      if (!pts || !pts.length) { resolve(); return; }
      c.path = pts.map(function (p) { return { x: p.x, y: p.y }; });
      c.speed = speed || 3.1;
      c.sitting = false;
      c.onArrive = resolve;
    });
  }

  function updateChars(dt) {
    Object.keys(chars).forEach(function (id) {
      var c = chars[id];
      if (c.path && c.path.length) {
        var tgt = c.path[0];
        var dx = tgt.x - c.x, dy = tgt.y - c.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var step = c.speed * dt;
        if (dist <= step || dist < 0.001) {
          c.x = tgt.x; c.y = tgt.y; c.path.shift();
        } else {
          c.x += dx / dist * step;
          c.y += dy / dist * step;
        }
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          if (Math.abs(dx) > Math.abs(dy)) c.facing = dx > 0 ? 'right' : 'left';
          else c.facing = dy > 0 ? 'down' : 'up';
        }
        c.walking = true;
        c.phase += dt * 11;
        if (!c.path.length) {
          c.walking = false;
          c.phase = 0;
          var cb = c.onArrive;
          c.onArrive = null;
          if (cb) cb();
        }
      } else {
        c.walking = false;
      }
      c.blinkTimer -= dt;
      if (c.blinkTimer <= 0) {
        c.blink = true;
        if (c.blinkTimer < -0.13) { c.blink = false; c.blinkTimer = 2.2 + Math.random() * 3.6; }
      }
    });
  }

  /* =========================================================
     7. 캔버스 렌더링
     ========================================================= */
  var canvas = $('office');
  var ctx = canvas.getContext('2d');
  var bgCanvas = document.createElement('canvas');
  var bgReady = false;

  function setupCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(720 * dpr);
    canvas.height = Math.round(416 * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (!bgReady) {
      bgCanvas.width = 720;
      bgCanvas.height = 416;
      var bctx = bgCanvas.getContext('2d');
      bctx.imageSmoothingEnabled = false;
      OfficeArt.drawStatic(bctx, { time: 0 });
      bgReady = true;
    }
  }

  var lastFrame = 0;
  function frame(t) {
    var dt = lastFrame ? Math.min(0.06, (t - lastFrame) / 1000) : 0.016;
    lastFrame = t;
    updateChars(dt);
    if (window.OfficeArt) {
      ctx.clearRect(0, 0, 720, 416);
      if (bgReady) ctx.drawImage(bgCanvas, 0, 0);
      OfficeArt.drawDynamic(ctx, {
        time: t / 1000,
        chars: Object.keys(chars).map(function (id) { return chars[id]; })
      });
    }
    updateOverlay();
    requestAnimationFrame(frame);
  }

  /* =========================================================
     8. 이름표 · 말풍선
     ========================================================= */
  var tagEls = {};
  var bubbles = {};
  var tagSize = { w: 76, h: 34 };

  function measureTags() {
    var probe = tagEls.michael;
    if (!probe) return;
    var w = probe.offsetWidth, h = probe.offsetHeight;
    if (w) tagSize.w = w;
    if (h) tagSize.h = h;
  }

  function buildOverlay() {
    var layer = $('tagLayer');
    Object.keys(STAFF).forEach(function (id) {
      var el = document.createElement('div');
      el.className = 'tag';
      el.setAttribute('data-id', id);
      var nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = STAFF[id].name;
      var st = document.createElement('div');
      st.className = 'st st-idle';
      st.textContent = '쉬는 중';
      el.appendChild(nm);
      el.appendChild(st);
      layer.appendChild(el);
      tagEls[id] = el;
    });
  }

  var STATUS_CLASS = {
    '쉬는 중': 'st-idle',
    '배정 중': 'st-assign',
    '일하는 중': 'st-work',
    '검토 보고': 'st-review',
    '검토 중': 'st-check',
    '완료': 'st-done'
  };

  function setStatus(id, st) {
    if (!chars[id]) return;
    chars[id].status = st;
    var el = tagEls[id];
    if (!el) return;
    var box = el.querySelector('.st');
    box.className = 'st ' + (STATUS_CLASS[st] || 'st-idle');
    box.textContent = '';
    if (st === '일하는 중') {
      var dot = document.createElement('span');
      dot.className = 'pulse';
      box.appendChild(dot);
    }
    box.appendChild(document.createTextNode(st));
  }

  function makeBubble() {
    var el = document.createElement('div');
    el.className = 'bubble';
    $('bubbleLayer').appendChild(el);
    return { el: el, token: 0 };
  }

  function bubble(id, text, ms) {
    var b = bubbles[id] || (bubbles[id] = makeBubble());
    b.token += 1;
    var mine = b.token;
    b.el.textContent = text;
    b.el.classList.add('show');
    setTimeout(function () {
      if (b.token === mine) b.el.classList.remove('show');
    }, ms || 2400);
  }

  function updateOverlay() {
    var list = [];
    Object.keys(chars).forEach(function (id) {
      var c = chars[id];
      list.push({ id: id, px: c.x * 16, py: c.y * 16 - 46 });
    });
    list.sort(function (a, b) { return a.py - b.py; });
    var placed = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var top = it.py;
      for (var guard = 0; guard < 6; guard++) {
        var hit = false;
        for (var j = 0; j < placed.length; j++) {
          if (Math.abs(placed[j].px - it.px) < tagSize.w && Math.abs(placed[j].top - top) < tagSize.h + 2) {
            top = placed[j].top - (tagSize.h + 2);
            hit = true;
          }
        }
        if (!hit) break;
      }
      placed.push({ px: it.px, top: top });
      var el = tagEls[it.id];
      if (el) {
        el.style.left = (it.px / 720 * 100).toFixed(3) + '%';
        el.style.top = (top / 416 * 100).toFixed(3) + '%';
      }
      it.top = top;
      it.tagEl = el;
    }
    // 말풍선은 해당 캐릭터 이름표 위에
    for (var k = 0; k < list.length; k++) {
      var b = bubbles[list[k].id];
      if (!b) continue;
      b.el.style.left = (list[k].px / 720 * 100).toFixed(3) + '%';
      b.el.style.top = ((list[k].top - 6) / 416 * 100).toFixed(3) + '%';
    }
  }

  /* =========================================================
     9. 업무 로그
     ========================================================= */
  function logEl(rec, prepend) {
    var li = document.createElement('li');
    var time = document.createElement('time');
    time.textContent = logStamp(rec.t);
    li.appendChild(time);
    if (rec.who) {
      var nm = document.createElement('span');
      nm.className = 'nm';
      var color = '#6b7280';
      Object.keys(STAFF).forEach(function (id) { if (STAFF[id].name === rec.who) color = STAFF[id].color; });
      nm.style.color = color;
      nm.textContent = rec.who;
      li.appendChild(nm);
    }
    var tx = document.createElement('span');
    tx.className = 'tx' + (rec.c ? ' ' + rec.c : '');
    tx.textContent = rec.msg;
    li.appendChild(tx);
    if (prepend && $('logList').firstChild) $('logList').insertBefore(li, $('logList').firstChild);
    else $('logList').appendChild(li);
    return li;
  }

  function addLog(who, msg, cls) {
    var rec = { t: Date.now(), who: who || '', msg: msg, c: cls || '' };
    state.logs.push(rec);
    if (state.logs.length > 200) state.logs = state.logs.slice(-200);
    logEl(rec, false);
    var list = $('logList');
    list.scrollTop = list.scrollHeight;
    saveLogs();
  }

  function renderLogs() {
    var list = $('logList');
    list.innerHTML = '';
    if (!state.logs.length) {
      var li = document.createElement('li');
      li.className = 'log-empty';
      li.textContent = '아직 기록이 없어요.';
      list.appendChild(li);
      return;
    }
    for (var i = 0; i < state.logs.length; i++) logEl(state.logs[i], false);
    list.scrollTop = list.scrollHeight;
  }

  function saveLogs() { LS.set(K.logs, state.logs.slice(-150)); }

  /* =========================================================
     10. 칸반
     ========================================================= */
  var STATUS_LABEL = { todo: '할 일', doing: '하는 중', review: '검토', done: '완료' };

  function addCard(text, assignee, status) {
    var card = {
      id: uid('card'),
      text: text,
      assignee: assignee || 'auto',
      status: status || 'todo',
      note: '',
      createdAt: Date.now(),
      startedAt: 0,
      doneAt: 0
    };
    state.cards.push(card);
    if (state.cards.length > 40) state.cards = state.cards.slice(-40);
    saveCards();
    renderKanban();
    return card;
  }

  function getCard(id) {
    for (var i = 0; i < state.cards.length; i++) if (state.cards[i].id === id) return state.cards[i];
    return null;
  }

  function setCardStatus(id, status, note) {
    var c = getCard(id);
    if (!c) return;
    c.status = status;
    if (note != null) c.note = note;
    if (status === 'doing') c.startedAt = Date.now();
    if (status === 'done') c.doneAt = Date.now();
    saveCards();
    renderKanban();
  }

  function saveCards() { LS.set(K.cards, state.cards.slice(-40)); }

  function cardEl(c) {
    var el = document.createElement('div');
    el.className = 'kcard ' + c.status;
    el.setAttribute('data-id', c.id);

    var who = document.createElement('div');
    who.className = 'who';
    var person = STAFF[c.assignee] || null;
    if (person) {
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.style.background = person.color;
      chip.textContent = person.initial;
      who.appendChild(chip);
      who.appendChild(document.createTextNode(person.name));
    } else {
      if (c.status === 'todo') {
        var chip2 = document.createElement('span');
        chip2.className = 'chip';
        chip2.style.background = '#9aa5b1';
        chip2.textContent = '?';
        who.appendChild(chip2);
        who.appendChild(document.createTextNode('배정 전'));
      } else {
        who.appendChild(document.createTextNode('충의'));
      }
    }
    el.appendChild(who);

    var txt = document.createElement('div');
    txt.className = 'txt';
    txt.textContent = clip(c.text, 70);
    el.appendChild(txt);

    var meta = document.createElement('div');
    meta.className = 'meta';
    var bits = [];
    var d = new Date(c.createdAt);
    bits.push(pad2(d.getHours()) + ':' + pad2(d.getMinutes()));
    if (c.status === 'doing' && c.startedAt) bits.push(Math.max(0, Math.round((Date.now() - c.startedAt) / 1000)) + '초째');
    if (c.status === 'done' && c.doneAt) bits.push('완료 ' + clockText(new Date(c.doneAt)));
    if (c.note) bits.push(c.note);
    meta.textContent = bits.join(' · ');
    el.appendChild(meta);
    return el;
  }

  function renderKanban() {
    ['todo', 'doing', 'review', 'done'].forEach(function (st) {
      var box = document.querySelector('[data-cards="' + st + '"]');
      var cnt = document.querySelector('[data-count="' + st + '"]');
      if (!box) return;
      box.innerHTML = '';
      var n = 0;
      for (var i = 0; i < state.cards.length; i++) {
        var c = state.cards[i];
        if (c.status !== st) continue;
        n++;
        if (n <= 6) box.appendChild(cardEl(c));
      }
      if (n === 0) {
        var e = document.createElement('div');
        e.className = 'kempty';
        e.textContent = '—';
        box.appendChild(e);
      }
      if (n > 6) {
        var more = document.createElement('div');
        more.className = 'kempty';
        more.textContent = '+' + (n - 6) + '개 더';
        box.appendChild(more);
      }
      if (cnt) cnt.textContent = String(n);
    });
  }

  /* =========================================================
     11. 마크다운 렌더러 (안전한 이스케이프 + 표 파서)
     ========================================================= */
  function inlineMd(s) {
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }

  var TABLE_SEP = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/;

  function isTableRow(line) {
    var s = line.trim();
    if (s.charAt(0) !== '|') return false;
    return s.indexOf('|', 1) > -1;
  }

  function splitRow(line) {
    var s = line.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
    return s.split('|').map(function (cell) { return inlineMd(esc(cell.trim())); });
  }

  function buildTable(head, rows) {
    var html = '<div class="tw"><table><thead><tr>';
    head.forEach(function (c) { html += '<th>' + c + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>';
      for (var i = 0; i < head.length; i++) html += '<td>' + (r[i] == null ? '' : r[i]) + '</td>';
      html += '</tr>';
    });
    return html + '</tbody></table></div>';
  }

  function renderMarkdown(md) {
    var lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i++; continue; }

      if (/^\s*```/.test(line)) {
        i++;
        var code = [];
        while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
        continue;
      }

      if (isTableRow(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1].trim())) {
        var head = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && isTableRow(lines[i])) { rows.push(splitRow(lines[i])); i++; }
        out.push(buildTable(head, rows));
        continue;
      }

      var h = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
      if (h) {
        var lv = h[1].length;
        out.push('<h' + lv + '>' + inlineMd(esc(h[2])) + '</h' + lv + '>');
        i++;
        continue;
      }

      if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      if (/^\s*>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          q.push(inlineMd(esc(lines[i].replace(/^\s*>\s?/, ''))));
          i++;
        }
        out.push('<blockquote>' + q.join('<br>') + '</blockquote>');
        continue;
      }

      if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
        var ordered = /^\s*\d+[.)]\s+/.test(line);
        var items = [];
        while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
          var m = /^\s*([-*•]|\d+[.)])\s+(.*)$/.exec(lines[i]);
          var t = m[2];
          i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
            t += ' ' + lines[i].trim();
            i++;
          }
          items.push('<li>' + inlineMd(esc(t)) + '</li>');
        }
        out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }

      var para = [];
      while (i < lines.length && lines[i].trim()
        && !/^(#{1,4})\s+/.test(lines[i])
        && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])
        && !/^\s*>\s?/.test(lines[i])
        && !isTableRow(lines[i])
        && !/^\s*```/.test(lines[i])
        && !/^\s*(---+|\*\*\*+|___+)\s*$/.test(lines[i])) {
        para.push(inlineMd(esc(lines[i])));
        i++;
      }
      if (para.length) out.push('<p>' + para.join('<br>') + '</p>');
      else i++;
    }
    return out.join('');
  }

  /* =========================================================
     12. 결과 패널 · 이력
     ========================================================= */
  function pushResult(rec) {
    state.results.unshift(rec);
    if (state.results.length > 30) state.results = state.results.slice(0, 30);
    saveResults();
    showResult(rec);
    renderHistory();
  }

  function saveResults() {
    LS.set(K.results, state.results.slice(0, 30).map(function (r) {
      var copy = {};
      for (var k in r) if (Object.prototype.hasOwnProperty.call(r, k)) copy[k] = r[k];
      if (copy.md && copy.md.length > 20000) copy.md = copy.md.slice(0, 20000);
      return copy;
    }));
  }

  function showResult(rec) {
    state.activeResult = rec;
    var banner = $('resBanner');
    var body = $('resBody');
    var meta = $('resMeta');
    var copyBtn = $('btnCopy');
    var retry = $('retryRow');

    if (!rec) {
      banner.className = 'banner hidden';
      retry.classList.add('hidden');
      meta.textContent = '아직 결과가 없어요';
      copyBtn.disabled = true;
      body.className = 'res-body empty';
      body.innerHTML = '<span class="big">🗂️</span>아직 결과가 없어요.<br>왼쪽에서 일을 맡기면 여기에 정리된 결과가 나옵니다.';
      return;
    }

    retry.classList.toggle('hidden', !rec.error);

    if (rec.error) {
      banner.className = 'banner err';
      banner.textContent = '⚠️ ' + rec.error;
    } else if (rec.demo) {
      banner.className = 'banner';
      banner.textContent = '데모 예시 · 실제 AI 응답을 받으려면 상단에서 무료 API 키를 넣어 주세요';
    } else {
      banner.className = 'banner hidden';
    }

    var who = STAFF[rec.who] ? STAFF[rec.who].name : '-';
    meta.innerHTML = '<b>' + esc(who) + '</b> · ' + esc(rec.timeText || '') +
      '<span class="mchip">' + esc(rec.demo ? '데모 예시' : (rec.model || '-')) + '</span>';

    copyBtn.disabled = !!rec.error;
    body.className = 'res-body md';
    body.innerHTML = rec.error
      ? '<p class="muted">' + esc(rec.md || '') + '</p>'
      : renderMarkdown(rec.md || '_(빈 답변)_');
    body.scrollTop = 0;
    var wrap = document.querySelector('.res-wrap');
    if (wrap) wrap.scrollTop = 0;
  }

  function renderHistory() {
    var box = $('histList');
    var wrap = $('resHist');
    if (!box) return;
    box.innerHTML = '';
    var list = state.results.slice(1, 9);
    $('histCount').textContent = state.results.length > 1 ? '(' + (state.results.length - 1) + ')' : '';
    if (!state.results.length) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    list.forEach(function (r) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hist-item';
      var nm = STAFF[r.who] ? STAFF[r.who].name : '-';
      var span = document.createElement('span');
      span.textContent = nm + ' · ' + clip(r.task || r.md || '', 26);
      b.appendChild(span);
      var t = document.createElement('span');
      t.className = 't';
      t.textContent = r.timeText || '';
      b.appendChild(t);
      b.addEventListener('click', function () { showResult(r); });
      box.appendChild(b);
    });
  }

  /* =========================================================
     13. 자동 배정 (충의 팀장의 판단)
     ========================================================= */
  var ROUTE_WORDS = {
    minsu: ['주문', '반품', '수량', '낱개', '박스', '갑수', '단가', '품목', '출고', '냉장', '회수', '미소진', '쪽지', '메모', '발주', '입고 요청', '카톡 주문'],
    jiyeon: ['수금', '회전일', '미수', '잔고', '잔액', '정산', '수수료', '거래원장', '입금', '세금계산서', '대조', '미청구', '연체', '청구', '매출'],
    hyunwoo: ['문자', '메일', '안내', '공지', '연락', '초안', '원장님', '실장님', '본사', '협력사', '품절', '입고 지연', '이의', '답장', '회신', '보낼'],
    dayoung: ['홍보', '광고', '영상', '릴스', '쇼츠', '대본', '문구', '배너', '안내문', '제품 소개', '캠페인', '카드뉴스', '콘텐츠', '스토리', '인스타']
  };

  function autoAssign(text) {
    var t = String(text || '');
    var scores = {};
    var hits = {};
    WORKERS.forEach(function (id) {
      scores[id] = 0;
      hits[id] = [];
      ROUTE_WORDS[id].forEach(function (w) {
        var idx = t.indexOf(w);
        if (idx > -1) {
          var weight = w.length >= 3 ? 2 : 1;
          // 같은 단어가 여러 번 나오면 최대 3회까지만 반영
          var cnt = 0, from = 0;
          while (cnt < 3) {
            var p = t.indexOf(w, from);
            if (p < 0) break;
            cnt++; from = p + w.length;
          }
          scores[id] += weight * cnt;
          hits[id].push(w);
        }
      });
    });

    var best = '', bestScore = 0;
    WORKERS.forEach(function (id) {
      if (scores[id] > bestScore) { bestScore = scores[id]; best = id; }
    });

    if (!best) {
      // 단어가 하나도 없을 때: 표/숫자면 아름, 짧은 부탁이면 다영, 나머지는 상준
      var hasTable = /\|/.test(t) || /\t/.test(t);
      var hasMoney = /[0-9][0-9,]{3,}\s*원/.test(t);
      if (hasTable && hasMoney) best = 'jiyeon';
      else if (oneLine(t).length < 40 && /(써|작성|보내|문구)/.test(t)) best = 'hyunwoo';
      else best = 'minsu';
      return { id: best, reason: '내용을 봤는데 확실한 단서가 없어서 ' + STAFF[best].name + '에게 먼저 맡길게요. (직접 선택도 가능해요)' };
    }

    var words = hits[best].slice(0, 2).map(function (w) { return "'" + w + "'"; }).join(', ');
    return { id: best, reason: words + ' 같은 말이 보여서 ' + STAFF[best].name + '에게 맡길게요.' };
  }

  /* =========================================================
     14. 데모(체험 모드) 답변
     ========================================================= */
  function demoAnswer(who, text) {
    var req = clip(text, 46);
    var md = '';
    if (who === 'minsu') {
      md = '> 데모 예시입니다. 실제 AI가 만든 답은 아니에요.\n\n' +
        '**요청 요약** — ' + req + '\n\n' +
        '| 거래처명 | 품목명 | 규격 | 수량 | 특이사항 |\n' +
        '|---|---|---|---|---|\n' +
        '| 푸른내과의원 | 에이원주 | 5mg/1ml | 10갑 | 확인 필요 |\n' +
        '| 푸른내과의원 | 비오정 | 확인 필요 | 4갑 | 확인 필요 |\n' +
        '| 푸른내과의원 | 세이프키트 | 250ml | 3갑 | 냉장 · 아이스박스 요청 |\n' +
        '| 푸른내과의원 | 에이쓰리겔 | 1박스 | 1박스 | 반품 취소 · 재고 미소진(그대로 사용) |\n\n' +
        '**확인 필요**\n' +
        '- 쪽지에 규격이 없던 품목은 `확인 필요`로 비워 뒀습니다.\n' +
        '- 반품 건은 택배 회수 없이 종결 처리하면 됩니다.';
    } else if (who === 'jiyeon') {
      md = '> 데모 예시입니다. 실제 AI가 만든 답은 아니에요.\n\n' +
        '**요약** — 회전일 100일 이상 2곳, 80~99일 1곳, 잔고 300만 원 이상 3곳\n\n' +
        '| 우선순위 | 거래처 | 회전일 | 미수잔고 | 판단 |\n' +
        '|---|---|---|---|---|\n' +
        '| 1 | 해솔한의원 | 128일 | 640,000원 | 100일 초과 · 금액은 작지만 장기 연체 |\n' +
        '| 2 | 푸른내과의원 | 112일 | 3,240,000원 | 100일 초과 · 금액 큼 |\n' +
        '| 3 | 행복통증의학과의원 | 96일 | 8,150,000원 | 잔고 최대 · 100일 진입 임박 |\n' +
        '| 4 | 중앙가정의원 | 74일 | 1,980,000원 | 안정권 |\n' +
        '| 5 | 새봄내과의원 | 41일 | 4,320,000원 | 잔고 크지만 회전 양호 |\n\n' +
        '**오늘 먼저 연락할 곳 Top 3**\n' +
        '1. 해솔한의원 — 128일로 가장 오래됐어요. 금액이 작아 미루기 쉬운 건입니다.\n' +
        '2. 푸른내과의원 — 112일 + 324만 원, 이번 주 안에 입금 일정을 잡는 게 좋아요.\n' +
        '3. 행복통증의학과의원 — 잔고 815만 원으로 가장 큽니다. 96일이라 지금 잡아야 해요.';
    } else if (who === 'hyunwoo') {
      md = '> 데모 예시입니다. 실제 AI가 만든 답은 아니에요.\n\n' +
        '### [짧은 카톡용]\n' +
        '실장님, 한빛제약 충의입니다. 9월분 [금액] 입금이 아직 확인되지 않아 연락드렸어요. 이번 주 금요일까지 입금 부탁드려도 될까요? 확인되면 바로 말씀드리겠습니다.\n\n' +
        '### [정식 안내·메일용]\n' +
        '안녕하세요, 한빛제약 영업1팀 김충의입니다.\n\n' +
        '[거래처명] 9월분 거래대금 [금액]의 입금이 아직 확인되지 않아 안내드립니다.\n' +
        '- 거래월: [연월]\n' +
        '- 청구금액: [금액]\n' +
        '- 입금 예정일: [날짜]\n\n' +
        '이번 주 금요일([날짜])까지 입금 부탁드리며, 이미 입금하셨다면 이 메일은 무시해 주세요. 확인 후 연락드리겠습니다.\n\n' +
        '한빛제약 영업1팀 김충의 드림';
    } else {
      md = '> 데모 예시입니다. 실제 AI가 만든 답은 아니에요.\n\n' +
        '**한 줄로 잡는 첫 문장** — "회전이 빠른 치료, 단가는 부담 없이."\n\n' +
        '**원장님용 핵심 소구 포인트**\n' +
        '1. 처방 후 회복이 빠른 흐름을 원내 진료에 바로 붙일 수 있습니다.\n' +
        '2. 비슷한 효과 대비 단가 부담이 적어 처방 구성이 편합니다.\n' +
        '3. 냉장 유통 관리가 단순해 보관·재고 부담이 줄어듭니다.\n\n' +
        '**바로 쓰는 홍보 문구**\n' +
        '- "진료는 빠르게, 회복도 빠르게 — 원내에서 가장 자주 찾는 선택"\n' +
        '- "단가는 가볍게, 관리는 단순하게. 매일 쓰는 제품이라 더 신경 썼습니다."\n\n' +
        '**30초 릴스 대본**\n\n' +
        '| 장면 순서 | 화면 자막 | 내레이션 |\n' +
        '|---|---|---|\n' +
        '| 1 (0~5초) | 요즘 원내에서 가장 먼저 찾는 것 | "바쁜 진료실, 환자분은 빠른 회복을 원하시죠." |\n' +
        '| 2 (5~12초) | 회전 빠른 처방 | "자주 쓰는 제품일수록 회전이 빨라야 합니다." |\n' +
        '| 3 (12~20초) | 단가 부담은 가볍게 | "부담 없는 단가로 처방 구성이 편해집니다." |\n' +
        '| 4 (20~27초) | 냉장 관리도 단순하게 | "보관과 재고 관리까지 단순해집니다." |\n' +
        '| 5 (27~30초) | 한빛제약 에이쓰리겔 | "자세한 내용은 담당자에게 문의해 주세요." |';
    }
    return wait(1200).then(function () {
      return { text: md, model: 'demo', demo: true };
    });
  }

  /* =========================================================
     15. 업무 실행 흐름
     ========================================================= */
  var queue = [];
  var running = false;

  function updateQueueBadge() {
    var el = $('queueInfo');
    if (!el) return;
    if (queue.length) {
      el.textContent = '⏳ 대기 ' + queue.length + '개';
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function enqueue(text, assignee) {
    var clean = String(text || '').trim();
    if (!clean) { toast('먼저 할 일을 적어 주세요'); $('taskInput').focus(); return; }
    var card = addCard(clean, assignee || 'auto', 'todo');
    queue.push({ cardId: card.id, text: clean, assignee: assignee || 'auto' });
    addLog('나', '업무를 맡겼습니다 — ' + clip(clean, 42), 'me');
    updateQueueBadge();
    if (queue.length > 1 || running) addLog('충의', '앞 업무가 끝나면 바로 시작할게요. (대기 ' + queue.length + '개)');
    pump();
  }

  function pump() {
    if (running) return;
    var job = queue.shift();
    updateQueueBadge();
    if (!job) return;
    running = true;
    runTask(job).catch(function (e) {
      console.error(e);
      addLog('시스템', '업무 처리 중 문제가 생겼어요. 다시 시도해 주세요.', 'err');
    }).then(function () {
      running = false;
      pump();
    });
  }

  var REPORT_LINES = {
    minsu: '정리 다 했습니다! 표 확인해 주세요.',
    jiyeon: '우선순위 뽑았습니다. Top 3부터 보세요.',
    hyunwoo: '두 가지 버전으로 써 왔습니다.',
    dayoung: '문구랑 30초 대본 완성했습니다.'
  };

  function runTask(job) {
    var card = getCard(job.cardId);
    if (!card) return Promise.resolve();
    var text = job.text;

    return Promise.resolve().then(function () {
      // 1) 충의가 요청을 읽는다
      setStatus('michael', '배정 중');
      addLog('충의', '요청을 읽고 있어요…');
      return wait(600);
    }).then(function () {
      // 2) 담당자 결정
      var who = job.assignee;
      var reason = '';
      if (!who || who === 'auto') {
        var pick = autoAssign(text);
        who = pick.id;
        reason = pick.reason;
      } else {
        reason = '대표님이 ' + STAFF[who].name + '에게 직접 맡기셨으니 바로 넘길게요.';
      }
      card.assignee = who;
      card.startedAt = 0;
      saveCards();
      renderKanban();
      addLog('충의', reason);
      bubble('michael', reason, 2800);
      job.who = who;
      return wait(1400);
    }).then(function () {
      // 3) 담당자 책상으로 걸어가 일을 넘긴다
      return walkTo('michael', pathMichaelTo(job.who), 3.4);
    }).then(function () {
      bubble('michael', STAFF[job.who].name + ' 씨, 이 ' + STAFF[job.who].short + ' 부탁해요!', 2200);
      addLog('충의', STAFF[job.who].name + '에게 업무를 넘겼습니다.');
      return wait(1200);
    }).then(function () {
      // 4) 직원이 일을 시작 (여기서 실제 API 호출)
      setStatus(job.who, '일하는 중');
      setStatus('michael', '쉬는 중');
      setCardStatus(card.id, 'doing');
      state.activeCardId = card.id;
      addLog(STAFF[job.who].name, '일을 시작했어요 — ' + clip(text, 30));
      walkTo('michael', [{ x: AISLE, y: 6.6 }, HOME.michael], 3.2).then(function () {
        chars.michael.sitting = true;
        chars.michael.facing = 'down';
      });

      var started = Date.now();
      var apiPromise = callEmployee(job.who, text).catch(function (e) { return { err: e }; });
      return Promise.all([apiPromise, wait(2400)]).then(function (r) {
        var res = r[0];
        if (res && res.err) throw res.err;
        res.elapsed = Math.round((Date.now() - started) / 1000);
        return res;
      });
    }).then(function (res) {
      // 5) 충의 자리로 가서 보고
      setStatus(job.who, '검토 보고');
      setCardStatus(card.id, 'review');
      addLog(STAFF[job.who].name, '작업을 마치고 충의에게 보고하러 갑니다.');
      return walkTo(job.who, pathToReport(job.who), 3.3).then(function () {
        bubble(job.who, REPORT_LINES[job.who] || '다 했습니다!', 2200);
        return wait(900);
      }).then(function () {
        setStatus('michael', '검토 중');
        addLog('충의', '결과를 확인하고 있어요…');
        return wait(1100);
      }).then(function () {
        setStatus('michael', '쉬는 중');
        setStatus(job.who, '완료');
        setCardStatus(card.id, 'done');
        state.activeCardId = '';
        addLog(STAFF[job.who].name, '완료! 결과를 오른쪽에 띄웠어요.', 'ok');
        pushResult({
          id: uid('res'),
          who: job.who,
          model: res.model,
          demo: !!res.demo,
          ts: Date.now(),
          timeText: clockText(new Date()),
          md: res.text,
          task: text
        });
        bubble('michael', '확인했습니다. 결과 보세요!', 2400);
        return wait(1600);
      }).then(function () {
        setStatus(job.who, '쉬는 중');
        var back = pathToReport(job.who).slice().reverse();
        return walkTo(job.who, back, 3.0).then(function () {
          chars[job.who].sitting = true;
          chars[job.who].facing = 'down';
        });
      });
    }).catch(function (e) {
      // 오류 처리
      state.activeCardId = '';
      setStatus('michael', '쉬는 중');
      if (job.who) {
        setStatus(job.who, '쉬는 중');
        chars[job.who].sitting = true;
        chars[job.who].facing = 'down';
        chars[job.who].path = [];
      }
      var userMsg = (e && e.user) ? e.user : '알 수 없는 문제가 생겼어요.';
      var detail = (e && e.detail) ? e.detail : '';
      setCardStatus(card.id, 'todo', '중단 · ' + clip(userMsg, 30));
      addLog((job.who ? STAFF[job.who].name : '시스템'), '일을 마치지 못했어요 — ' + userMsg, 'err');
      if (job.who && chars[job.who]) bubble(job.who, '잠깐 문제가 생겼어요…', 2600);
      pushResult({
        id: uid('res'),
        who: job.who || 'minsu',
        model: state.model,
        demo: false,
        error: userMsg + (detail ? ' (' + detail + ')' : ''),
        ts: Date.now(),
        timeText: clockText(new Date()),
        md: '요청을 다시 보내거나, 상단 [🔑 API 키 설정]에서 키와 모델을 확인해 주세요.\n\n- 담당: ' + (STAFF[job.who] ? STAFF[job.who].name : '-') + '\n- 모델: ' + state.model,
        task: text
      });
    });
  }

  function callEmployee(who, text) {
    if (!state.key || state.demo) return demoAnswer(who, text);
    return requestGeminiWithFallback({
      key: state.key,
      model: state.model,
      system: PROMPTS[who] + FORMAT_RULES,
      text: text,
      timeoutMs: 120000
    }).then(function (r) {
      if (r.fellBack) {
        addLog('시스템', r.requestedModel + ' 쪽이 바빠서 ' + r.attemptedModel + '로 이어서 처리했어요', 'ok');
      }
      return {
        text: r.text,
        model: r.model,
        demo: false,
        fellBack: !!r.fellBack,
        fallbackFrom: r.fellBack ? r.requestedModel : ''
      };
    });
  }

  /* =========================================================
     16. 화면 갱신 · 배지 · 모델
     ========================================================= */
  function updateBadge() {
    var badge = $('connBadge');
    var txt = $('connText');
    if (state.key && !state.demo) {
      badge.className = 'badge badge-ok';
      badge.innerHTML = '<span class="dot"></span>';
      var t = document.createElement('span');
      t.id = 'connText';
      t.textContent = '연결됨 · ' + state.model;
      badge.appendChild(t);
    } else {
      badge.className = 'badge badge-demo';
      badge.innerHTML = '<span class="dot"></span>';
      var t2 = document.createElement('span');
      t2.id = 'connText';
      t2.textContent = state.key ? '체험 모드 (키 있음)' : '체험 모드 (API 키 없음)';
      badge.appendChild(t2);
    }
  }

  function buildModelSelect() {
    var sel = $('modelSelect');
    sel.innerHTML = '';
    MODELS.forEach(function (m) {
      var o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.label;
      sel.appendChild(o);
    });
    var custom = document.createElement('option');
    custom.value = '__custom';
    custom.textContent = '직접 입력…';
    sel.appendChild(custom);

    var known = MODELS.some(function (m) { return m.id === state.model; });
    sel.value = known ? state.model : '__custom';
    $('modelCustom').classList.toggle('hidden', known);
    if (!known) $('modelCustom').value = state.model;
  }

  function currentModel() {
    var sel = $('modelSelect');
    if (sel.value === '__custom') {
      var v = $('modelCustom').value.trim();
      return v || DEFAULT_MODEL;
    }
    return sel.value || DEFAULT_MODEL;
  }

  function setKeyStatus(msg, cls) {
    var el = $('keyStatus');
    el.textContent = msg;
    el.className = 'status-line' + (cls ? ' ' + cls : '');
  }

  /* =========================================================
     17. 이벤트 배선
     ========================================================= */
  function openModal(id) { $(id).classList.add('open'); }
  function closeModal(id) { $(id).classList.remove('open'); }

  function bind() {
    // 모달 열기/닫기
    $('btnKey').addEventListener('click', function () {
      $('keyInput').value = state.key || '';
      buildModelSelect();
      if (state.key && state.demo) setKeyStatus('지금은 체험 모드예요. [저장]을 누르면 실제 AI로 다시 연결됩니다.', 'ing');
      else if (state.key) setKeyStatus('키가 저장되어 있어요. 이 컴퓨터에서만 쓰입니다.', 'ok');
      else setKeyStatus('아직 키가 없어요. 위 1~3단계로 무료 키를 받아 주세요.', 'ing');
      openModal('modalKey');
    });
    $('btnHelp').addEventListener('click', function () { openModal('modalHelp'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
      btn.addEventListener('click', function () { closeModal(btn.getAttribute('data-close')); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.modal'), function (m) {
      m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('open'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        Array.prototype.forEach.call(document.querySelectorAll('.modal.open'), function (m) { m.classList.remove('open'); });
      }
    });

    // 키 저장 / 삭제 / 테스트 / 체험
    $('btnSaveKey').addEventListener('click', function () {
      var v = $('keyInput').value.trim();
      if (!v) { setKeyStatus('API 키를 붙여넣어 주세요.', 'bad'); return; }
      if (!/^[A-Za-z0-9_.\-]{20,}$/.test(v)) {
        setKeyStatus('키 형식이 조금 이상해요. AIza… 또는 AQ.… 로 시작하는 키 전체를 복사했는지 확인해 주세요.', 'bad');
        return;
      }
      state.key = v;
      state.demo = false;
      state.model = currentModel();
      var ok1 = LS.set(K.api, state.key);
      var ok2 = LS.set(K.model, state.model);
      updateBadge();
      if (ok1 && ok2) {
        setKeyStatus('저장 완료! 이제 직원들이 진짜 AI로 일합니다. [' + state.model + ']', 'ok');
        setTimeout(function () { closeModal('modalKey'); }, 1300);
      }
      else setKeyStatus('저장은 됐지만 이 브라우저가 자동 저장을 막고 있어요. 창을 닫으면 키를 다시 넣어야 합니다.', 'ing');
      addLog('시스템', 'API 키를 저장했습니다. 모델: ' + state.model, 'ok');
      toast('API 키를 저장했어요');
    });

    $('btnDelKey').addEventListener('click', function () {
      if (!window.confirm('저장된 API 키를 지울까요? (칸반·결과·로그는 그대로 남아요)')) return;
      state.key = '';
      state.demo = true;
      LS.del(K.api);
      $('keyInput').value = '';
      updateBadge();
      setKeyStatus('키를 지웠습니다. 지금은 체험 모드로 동작해요.', 'ing');
      addLog('시스템', 'API 키를 삭제했습니다. 체험 모드로 전환합니다.');
    });

    $('btnShowKey').addEventListener('click', function () {
      var inp = $('keyInput');
      if (inp.type === 'password') { inp.type = 'text'; $('btnShowKey').textContent = '숨기기'; }
      else { inp.type = 'password'; $('btnShowKey').textContent = '보기'; }
    });

    $('btnTest').addEventListener('click', function () { testConnection(); });

    $('btnDemo').addEventListener('click', function () {
      state.demo = true;
      updateBadge();
      closeModal('modalKey');
      addLog('시스템', '체험 모드로 둘러봅니다. (예시 답변)');
      toast('체험 모드로 시작합니다');
    });

    $('modelSelect').addEventListener('change', function () {
      var isCustom = $('modelSelect').value === '__custom';
      $('modelCustom').classList.toggle('hidden', !isCustom);
      if (isCustom) { $('modelCustom').focus(); return; }
      state.model = $('modelSelect').value;
      LS.set(K.model, state.model);
      updateBadge();
    });
    $('modelCustom').addEventListener('change', function () {
      state.model = currentModel();
      LS.set(K.model, state.model);
      updateBadge();
    });

    // 담당자 선택
    Array.prototype.forEach.call(document.querySelectorAll('#assigneeChips .chip-btn'), function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(document.querySelectorAll('#assigneeChips .chip-btn'), function (b) {
          b.setAttribute('aria-pressed', 'false');
        });
        btn.setAttribute('aria-pressed', 'true');
        state.pickAssignee = btn.getAttribute('data-assignee');
        if (state.pickAssignee !== 'auto') {
          $('stageHint').textContent = STAFF[state.pickAssignee].name + '에게 직접 맡깁니다';
        } else {
          $('stageHint').textContent = '충의 팀장이 요청을 보고 직원에게 일을 넘깁니다';
        }
      });
    });

    // 예시 버튼
    Array.prototype.forEach.call(document.querySelectorAll('.ex-btn'), function (btn) {
      btn.addEventListener('click', function () {
        var who = btn.getAttribute('data-example');
        $('taskInput').value = EXAMPLES[who].text;
        selectAssignee(who);
        saveDraft();
        $('taskInput').focus();
        $('taskInput').scrollTop = 0;
        toast(STAFF[who].name + ' 예시를 넣었어요. [🚀 일 시키기]를 눌러 보세요');
      });
    });

    // 보내기
    $('btnSubmit').addEventListener('click', submit);
    $('taskInput').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    var draftTimer = null;
    $('taskInput').addEventListener('input', function () {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(saveDraft, 500);
    });

    // 결과 복사 / 재시도
    $('btnCopy').addEventListener('click', function () {
      var rec = state.activeResult;
      if (!rec) return;
      copyText(rec.md || '').then(function () {
        var b = $('btnCopy');
        b.textContent = '✅ 복사됨';
        b.classList.add('copy-ok');
        setTimeout(function () { b.textContent = '📋 결과 복사'; b.classList.remove('copy-ok'); }, 1600);
      }).catch(function () { toast('복사가 안 됐어요. 결과를 직접 선택해서 복사해 주세요'); });
    });
    $('btnRetry').addEventListener('click', function () {
      var rec = state.activeResult;
      if (!rec) return;
      enqueue(rec.task || '', rec.who || 'auto');
      toast('같은 요청을 다시 보냈어요');
    });

    // 기록 지우기 / 백업 / 복원
    $('btnClear').addEventListener('click', function () {
      if (!window.confirm('칸반 보드·업무 결과·로그를 모두 지울까요?\n(API 키는 그대로 남습니다)')) return;
      state.cards = [];
      state.logs = [];
      state.results = [];
      state.activeResult = null;
      LS.del(K.cards); LS.del(K.logs); LS.del(K.results);
      renderKanban();
      renderLogs();
      renderHistory();
      showResult(null);
      addLog('시스템', '기록을 모두 지웠습니다.');
      toast('기록을 지웠어요');
    });

    $('btnBackup').addEventListener('click', function () {
      var data = {
        app: '내 AI 오피스',
        savedAt: new Date().toISOString(),
        model: state.model,
        cards: state.cards,
        logs: state.logs,
        results: state.results
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      var d = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = '내_AI_오피스_백업_' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('백업 파일을 저장했어요 (API 키는 포함되지 않아요)');
    });

    $('btnRestore').addEventListener('click', function () { $('fileRestore').click(); });
    $('fileRestore').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result));
          if (!data || (!data.cards && !data.logs && !data.results)) throw new Error('형식이 달라요');
          if (!window.confirm('지금 기록을 백업 파일 내용으로 바꿀까요?')) return;
          state.cards = Array.isArray(data.cards) ? data.cards : [];
          state.logs = Array.isArray(data.logs) ? data.logs : [];
          state.results = Array.isArray(data.results) ? data.results : [];
          saveCards(); saveLogs(); saveResults();
          renderKanban(); renderLogs(); renderHistory();
          if (state.results.length) showResult(state.results[0]);
          addLog('시스템', '백업 파일을 불러왔습니다.');
          toast('불러오기 완료');
        } catch (err) {
          toast('불러오지 못했어요. 백업 파일인지 확인해 주세요');
        }
      };
      reader.readAsText(f);
      e.target.value = '';
    });
  }

  function selectAssignee(who) {
    Array.prototype.forEach.call(document.querySelectorAll('#assigneeChips .chip-btn'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-assignee') === who ? 'true' : 'false');
    });
    state.pickAssignee = who;
    $('stageHint').textContent = who === 'auto'
      ? '충의 팀장이 요청을 보고 직원에게 일을 넘깁니다'
      : STAFF[who].name + '에게 직접 맡깁니다';
  }

  function saveDraft() {
    LS.set(K.draft, $('taskInput').value.slice(0, 20000));
  }

  function submit() {
    var text = $('taskInput').value;
    if (!text.trim()) {
      toast('할 일을 먼저 적어 주세요');
      $('taskInput').focus();
      return;
    }
    enqueue(text, state.pickAssignee || 'auto');
    $('taskInput').value = '';
    saveDraft();
    $('taskInput').focus();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
    }
    return fallbackCopy(text);
  }
  function fallbackCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  /* =========================================================
     18. 연결 테스트
     ========================================================= */
  function testConnection() {
    var key = $('keyInput').value.trim() || state.key;
    var model = currentModel();
    if (!key) { setKeyStatus('먼저 API 키를 넣어 주세요.', 'bad'); return; }
    setKeyStatus('연결 확인 중… (5~15초 걸릴 수 있어요)', 'ing');
    var t0 = Date.now();
    requestGeminiWithFallback({
      key: key,
      model: model,
      system: '너는 연결 상태를 확인하는 도우미야. 짧게 답해.',
      text: '연결 테스트입니다. "연결 성공"이라고만 답해 주세요.',
      timeoutMs: 60000
    }).then(function (r) {
      var sec = ((Date.now() - t0) / 1000).toFixed(1);
      if (r.fellBack) {
        setKeyStatus('✅ 연결 성공! ' + r.requestedModel + ' 쪽이 바빠서 ' + r.attemptedModel + '가 응답했어요 (' + sec + '초). 설정에서 이 모델을 고르면 다음부터 바로 됩니다.', 'ok');
      } else {
        setKeyStatus('✅ 연결 성공! ' + r.attemptedModel + ' · ' + sec + '초 · 응답: ' + clip(r.text, 20), 'ok');
      }
    }).catch(function (e) {
      setKeyStatus('❌ ' + (e.user || '연결 실패') + (e.detail ? ' (' + e.detail + ')' : ''), 'bad');
    });
  }

  /* =========================================================
     19. 예시 문구
     ========================================================= */
  var EXAMPLES = {
    minsu: {
      text: '[카톡] 푸른내과의원 박 실장님\n' +
        '에이원주 10갑\n' +
        '비오정 4갑\n' +
        '세이프키트 250ml 3갑\n' +
        '지난주 반품했던 에이쓰리겔 1박스는 재고가 남아 있어서 그대로 쓰겠다고 하십니다.\n' +
        '냉장 품목이라 아이스박스로 부탁드려요.'
    },
    jiyeon: {
      text: '거래처 / 회전일 / 미수잔고\n' +
        '푸른내과의원 / 112일 / 3,240,000\n' +
        '행복통증의학과의원 / 96일 / 8,150,000\n' +
        '중앙가정의원 / 74일 / 1,980,000\n' +
        '해솔한의원 / 128일 / 640,000\n' +
        '새봄내과의원 / 41일 / 4,320,000\n' +
        '이번 달 수금 목표는 1,500만원입니다.'
    },
    hyunwoo: {
      text: '푸른내과의원 박 실장님께 보낼 문자.\n' +
        '9월분 3,240,000원이 아직 입금 확인이 안 됩니다. 이번 주 금요일까지 입금 부탁드리는 정중한 문자 초안 써 줘.'
    },
    dayoung: {
      text: '한빛제약 에이쓰리겔 제품 홍보 문구랑 30초 릴스 대본 만들어 줘.\n' +
        '타깃은 의원급 원장님, 핵심은 빠른 회복과 부담 없는 단가, 냉장 유통 안정성.'
    }
  };

  /* =========================================================
     20. 초기화
     ========================================================= */
  function restore() {
    state.key = LS.get(K.api, '') || '';
    state.model = LS.get(K.model, DEFAULT_MODEL) || DEFAULT_MODEL;
    var draft = LS.get(K.draft, '');
    if (draft) $('taskInput').value = String(draft);
    state.cards = LS.get(K.cards, []) || [];
    state.logs = LS.get(K.logs, []) || [];
    state.results = LS.get(K.results, []) || [];
    state.pickAssignee = 'auto';

    if (!Array.isArray(state.cards)) state.cards = [];
    if (!Array.isArray(state.logs)) state.logs = [];
    if (!Array.isArray(state.results)) state.results = [];

    // 이전에 끝나지 못한 카드는 '할 일'로 되돌린다
    var interrupted = 0;
    state.cards.forEach(function (c) {
      if (c && (c.status === 'doing' || c.status === 'review')) {
        c.status = 'todo';
        c.note = '이전에 중단됨';
        interrupted++;
      }
    });
    if (interrupted) {
      state.logs.push({ t: Date.now(), who: '시스템', msg: '이전에 하던 업무 ' + interrupted + '개가 중간에 끊겨서 [할 일]로 되돌렸어요.', c: 'err' });
    }
  }

  function init() {
    buildOverlay();
    setupCanvas();
    measureTags();
    restore();
    updateBadge();
    buildModelSelect();
    renderKanban();
    renderLogs();
    renderHistory();
    if (state.results.length) showResult(state.results[0]);
    bind();
    selectAssignee('auto');

    if (!state.logs.length) {
      addLog('시스템', '사무실에 불이 켜졌습니다. 충의와 직원 4명이 출근했어요.');
      addLog('충의', '오늘 업무는 아래 입력창에 그대로 붙여넣어 주세요. 제가 직원에게 나눠 줄게요.');
      if (!state.key) addLog('시스템', '지금은 체험 모드예요. 🔑 API 키를 넣으면 진짜 AI가 일합니다.');
    }
    if (!storageOK) {
      addLog('시스템', '이 브라우저가 자동 저장을 막고 있어요. 창을 닫으면 기록이 사라집니다.', 'err');
    }
    setStatus('michael', '쉬는 중');
    bubble('michael', '어서 오세요! 일은 아래에 붙여넣어 주세요.', 4200);

    requestAnimationFrame(frame);
    window.addEventListener('resize', function () { setupCanvas(); measureTags(); });
    // 진행 중 카드의 경과 시간만 주기적으로 갱신
    setInterval(function () {
      var el = document.querySelector('.kcard.doing .meta');
      var c = state.activeCardId ? getCard(state.activeCardId) : null;
      if (el && c && c.startedAt) {
        el.textContent = pad2(new Date(c.createdAt).getHours()) + ':' + pad2(new Date(c.createdAt).getMinutes()) +
          ' · ' + Math.max(0, Math.round((Date.now() - c.startedAt) / 1000)) + '초째';
      }
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
