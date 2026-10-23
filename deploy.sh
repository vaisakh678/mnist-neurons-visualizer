#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PROJECT=mnist-neurons-visualizer
export CLOUDFLARE_ACCOUNT_ID=4dc1e079a925e33dd124ca7430163406 # my cloudflare account

rm -rf dist && mkdir dist
cp -R shared dist/
cp -R web dist/2d
cp -R web3d dist/3d
printf '/ /3d/ 302\n' > dist/_redirects # homepage goes to the 3d one

npx --yes wrangler@4 pages project list | grep -q " $PROJECT " ||
  npx --yes wrangler@4 pages project create "$PROJECT" --production-branch main --force

npx --yes wrangler@4 pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true
