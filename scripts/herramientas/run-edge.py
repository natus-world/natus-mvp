# Recreate the Supabase edge runtime container with a file limit this sandbox allows (20000, not 65536),
# the working dir the workers need, and the egress proxy's CA so Deno can fetch JSR/npm imports.
# Capture inspect.json and main-index.ts first, as the skill natus-entorno-local explains, then:
#   python3 -I scripts/herramientas/run-edge.py /tmp/claude-0/edge/inspect.json
# A new Edge Function must be added to FUNCTIONS_CONFIG in inspect.json, or locally it answers 404.
import json, os, subprocess, sys
repo = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
edge = os.path.dirname(os.path.abspath(sys.argv[1]))
c = json.load(open(sys.argv[1]))[0]
name = c['Name'].lstrip('/')
subprocess.run(['docker', 'rm', '-f', name], capture_output=True)
ca = '/root/.ccr/ca-bundle.crt'
cmd = ['docker', 'run', '-d', '--name', name,
       '--network', 'supabase_network_natus-mvp', '--network-alias', 'edge_runtime',
       '--ulimit', 'nofile=20000:20000', '--add-host', 'host.docker.internal:host-gateway',
       '-v', f'{ca}:/etc/ccr-ca.crt:ro', '-e', 'DENO_CERT=/etc/ccr-ca.crt', '-e', 'DENO_TLS_CA_STORE=system',
       '-e', 'SSL_CERT_FILE=/etc/ccr-ca.crt', '-v', f'{ca}:/etc/ssl/certs/ca-certificates.crt:ro']
for k, v in (c['Config'].get('Labels') or {}).items():
    cmd += ['--label', f'{k}={v}']
main_index = f'{repo}/supabase/.temp/start-secrets/supabase_edge_runtime_natus-mvp/main/index.ts'
for b in c['HostConfig']['Binds']:
    b = b.replace(main_index, os.path.join(edge, 'main-index.ts'))
    cmd += ['-v', b.replace(',Z', '')]
for e in c['Config']['Env']:
    cmd += ['-e', e]
if c['Config'].get('WorkingDir'):
    cmd += ['-w', c['Config']['WorkingDir']]
cmd += ['--entrypoint', c['Config']['Entrypoint'][0], c['Config']['Image']] + c['Config']['Cmd']
r = subprocess.run(cmd, capture_output=True, text=True)
print(r.stdout.strip(), r.stderr.strip()[:500])
