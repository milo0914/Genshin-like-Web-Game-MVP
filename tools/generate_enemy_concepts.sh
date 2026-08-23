#!/usr/bin/env bash
# Enemy concept art generation script for local machine (Agnes API).
# Run on user machine, then send resulting URLs back.
set -e
KEY="sk-rTKjOCZ5LLuj6susg9L4C9UMeHRRRt9YoRwBmZGJsbBvyfyW"
BASE_URL="https://apihub.agnes-ai.com/v1/images/generations"
OUT_DIR="$(pwd)/agnes-out"
mkdir -p "$OUT_DIR"

style="anime-realistic hybrid style, 7.5-head-tall proportions, low-poly friendly shapes, clean linework, T-pose full body on plain light-gray background, high detail character design sheet"

declare -A prompts
prompts[prowler]="agile wolf-like humanoid swordsman E1 Prowler, slim build, electric purple aura, twin short daggers, sharp claws, heterochromia purple eyes, $style"
prompts[stoneguard]="massive armored stone golem E2 Stoneguard, bulky rocky body, huge tower shield, earth element, orange-brown crystals embedded in shoulders, $style"
prompts[embermancer]="robed fire sorcerer E3 Embermancer, hooded long robes, staff tipped with red flame crystal, ember particles, orange-red eyes, $style"
prompts[frost_archer]="nimble elven frost archer E4, light armor, longbow with ice-crystal string, pale blue skin, ice-blue hair and eyes, quiver on back, $style"
prompts[stormhorn]="large four-legged thunder beast E5 Stormhorn, single huge lightning horn, dark blue-grey hide, glowing purple eyes, electric sparks along spine, $style"

for name in prowler stoneguard embermancer frost_archer stormhorn; do
  echo "Generating $name..."
  curl -sS -X POST "$BASE_URL" \
    -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
    -d "{\"model\":\"agnes-image-2.1-flash\",\"prompt\":\"${prompts[$name]}\",\"size\":\"2K\",\"ratio\":\"2:3\",\"extra_body\":{\"response_format\":\"url\"}}" \
    > "$OUT_DIR/$name.json"
  url=$(python3 -c "import json,sys;d=json.load(open('$OUT_DIR/$name.json'));print(d['data'][0].get('url',''))" 2>/dev/null)
  echo "$name => $url"
done

echo "All done. JSON saved in $OUT_DIR/"
