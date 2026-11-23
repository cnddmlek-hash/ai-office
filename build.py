#!/usr/bin/env python3
"""src/index.html + src/office-art.js + src/app.js → index.html (단일 실행 파일) 조립.

PWA(GitHub Pages)에서 바로 열리는 파일은 저장소 루트의 index.html 하나다.
소스를 고친 뒤에는 이 스크립트를 다시 실행하면 된다:  python3 build.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
ART_TAG = '<script>/*__ART_JS__*/</script>'
APP_TAG = '<script>/*__APP_JS__*/</script>'


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def main():
    html = read('src/index.html')
    art = read('src/office-art.js')
    app = read('src/app.js')

    if ART_TAG not in html or APP_TAG not in html:
        print('오류: src/index.html 에 조립 표시(%s / %s)가 없습니다.' % (ART_TAG, APP_TAG))
        return 1

    html = html.replace(ART_TAG, '<script>\n' + art + '\n</script>')
    html = html.replace(APP_TAG, '<script>\n' + app + '\n</script>')

    if '__ART_JS__' in html or '__APP_JS__' in html:
        print('오류: 조립 표시가 남아 있습니다.')
        return 1

    out = os.path.join(ROOT, 'index.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print('built index.html (%d chars)' % len(html))
    return 0


if __name__ == '__main__':
    sys.exit(main())
