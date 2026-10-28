#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
# Always use the local daemon; preserve Docker registry configuration.
docker_local() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"
}
container="convenience-test-$$"
trap 'docker_local rm -f "$container" >/dev/null 2>&1 || true' EXIT
args=(--replSet rs0 --bind_ip_all)
if [[ "${TEST_STANDALONE:-}" == '1' ]]; then args=(--bind_ip_all); fi
docker_local run -d --name "$container" -p 127.0.0.1::27017 mongo:8.0 "${args[@]}" >/dev/null
ready=0
for attempt in {1..40}; do
  if docker_local exec "$container" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == '1' ]] || { docker_local logs "$container"; exit 1; }
if [[ "${TEST_STANDALONE:-}" != '1' ]]; then
  docker_local exec "$container" mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})' >/dev/null
  primary=0
  for attempt in {1..30}; do
    if docker_local exec "$container" mongosh --quiet --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then primary=1; break; fi
    sleep 1
  done
  [[ "$primary" == '1' ]] || { docker_local logs "$container"; exit 1; }
fi
port="$(docker_local port "$container" 27017/tcp)"
port="${port##*:}"
TEST_MONGODB_URI="mongodb://127.0.0.1:${port}/?directConnection=true" npm test
