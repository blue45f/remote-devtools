# !/bin/bash

Help() {
  echo "프로젝트 내의 모든 node_modules와 빌드 아티팩트 혹은 캐시 (next 등)를 삭제합니다.\n\
  \n\
  -h, --help \t\t 도움말을 출력합니다. \n\
  -s, --store \t\t pnpm store까지 삭제합니다. \n\
  "
}

RemoveNodeModules() {
  echo "루트폴더 내 모든 node_modules 폴더 및 next.js 빌드 결과물을 삭제합니다."
  find . \( -name 'node_modules' -o -name '.next' \) -type d -prune -exec rm -rf '{}' +
}

RemovePNPMStore() {
  echo "pnpm 스토어를 삭제합니다."
  pnpm_store_path=$(pnpm store path)
  if [[ $pnpm_store_path ]]; then
    find $pnpm_store_path -type d -name 'files' -exec rm -rf '{}' +
  else
    echo 'pnpm 스토어 경로를 찾을 수 없습니다. 스토어를 수동으로 삭제 해주세요. (~/.pnpm-store)'
  fi
}

if [[ "$#" -eq 0 ]]; then
  RemoveNodeModules
  exit
fi

while [[ "$#" -gt 0 ]]; do
  case $1 in
    -h|--help) Help; exit;;
    -s|--store)
      RemoveNodeModules;
      RemovePNPMStore;
      exit;;
    *) Help; exit;;
  esac
done
