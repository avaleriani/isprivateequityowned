#!/bin/sh
# Renders the Chrome Web Store screenshots and promo tiles into store/, using
# the real popup code with the extension APIs stubbed out (stub.js).
# Needs Google Chrome and python3. Run: sh tools/store/render.sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
P=$(cd "$HERE/../.." && pwd)
OUT=$P/store
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
S=$(mktemp -d)
cp "$HERE/stub.js" "$HERE/compose.html" "$HERE/promo.html" "$S/"
cp $P/src/popup.css $P/src/popup.js $P/src/config.js $P/data/companies.json $P/icons/icon128.png $P/icons/icon32.png $S/
sed 's#<link rel="stylesheet" href="popup.css" />#<script src="stub.js"></script><link rel="stylesheet" href="popup.css" />#' $P/src/popup.html > $S/popup.html
mkdir -p $OUT
python3 -m http.server -d "$S" 8765 >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV; rm -rf "$S"' EXIT
sleep 1
shot() { # out w h url
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --user-data-dir="$S/profile" --blink-settings=preferredColorScheme=1 --window-size="$2,$3" --virtual-time-budget=4000 \
    --screenshot="$OUT/$1" "http://localhost:8765/$4" >/dev/null 2>&1
  echo "$OUT/$1"
}
enc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }
compose() { # out domain badge color accent headline sub
  shot "$1" 1280 800 "compose.html?d=$2&b=$(enc "$3")&c=$(enc "$4")&a=$(enc "$5")&h=$(enc "$6")&s=$(enc "$7")"
}
compose screenshot-1.png subway.com YES '#C0392B' '#C0392B' "Know who owns the site <em>you're on.</em>" "A badge on every page: YES, NO, or the exact stake private equity holds. Click it for the firms, the year they took control and a source."
compose screenshot-2.png chewy.com '88%' '#C0392B' '#C0392B' "The number, <em>not just a yes.</em>" "Where the size of the holding is on the record, the badge shows it, including control through dual-class voting shares."
compose screenshot-3.png bumble.com '17%' '#1E8E4E' '#1E8E4E' "Sold down is <em>not the same as clean.</em>" "Green means private equity doesn't control it. A stake left behind after a sell-down still shows as a number."
compose screenshot-4.png northwindbakery.com '?' '#6B7280' '#6B7280' "No data? <em>It says so.</em>" "Sites outside the dataset get a grey ?, never a guess. Every entry links to its source, and a mistake is one click to report."
shot promo-small-440x280.png 440 280 "promo.html"
shot promo-marquee-1400x560.png 1400 560 "promo.html?size=marquee"
