"""Expose the local frontend and API through public localtunnel URLs.

WARNING: this rewrites VITE_API_BASE_URL in Finovara/.env.local to point at the
backend tunnel. That URL dies with this process, so local development breaks
until the value is put back — restore it with:

    VITE_API_BASE_URL=http://localhost:8000

then restart Vite, which reads env only at startup.
"""

import subprocess
import time
import re
import sys
import os

def start_tunnel(port):
    print(f"Starting tunnel for port {port}...")
    proc = subprocess.Popen(
        f"npx -y localtunnel --port {port}",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        shell=True
    )
    url = None
    start_time = time.time()
    while time.time() - start_time < 30:
        line = proc.stdout.readline()
        if not line:
            break
        line_str = line.strip()
        print(f"[{port}] {line_str}")
        match = re.search(r'your url is:\s*(https?://\S+)', line_str, re.IGNORECASE)
        if match:
            url = match.group(1)
            break
        time.sleep(0.1)
    return proc, url

def update_backend_env(frontend_url):
    env_path = os.path.join("backend", ".env")
    if not os.path.exists(env_path):
        print(f"Backend .env not found at {env_path}")
        return
    with open(env_path, "r") as f:
        content = f.read()

    # Find CORS_ORIGINS line
    new_cors = f"CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,{frontend_url}"
    if "CORS_ORIGINS=" in content:
        content = re.sub(r"CORS_ORIGINS=.*", new_cors, content)
    else:
        content += f"\n{new_cors}\n"

    with open(env_path, "w") as f:
        f.write(content)
    print("Updated backend/.env with frontend tunnel URL.")

def update_frontend_env(backend_url):
    env_path = os.path.join("Finovara", ".env.local")
    if not os.path.exists(env_path):
        print(f"Frontend .env.local not found at {env_path}")
        return
    with open(env_path, "r") as f:
        content = f.read()

    new_api = f"VITE_API_BASE_URL={backend_url}"
    if "VITE_API_BASE_URL=" in content:
        content = re.sub(r"VITE_API_BASE_URL=.*", new_api, content)
    else:
        content += f"\n{new_api}\n"

    with open(env_path, "w") as f:
        f.write(content)
    print("Updated Finovara/.env.local with backend tunnel URL.")

def main():
    # 1. Kill any existing localtunnel processes
    if sys.platform == "win32":
        subprocess.run("taskkill /f /im node.exe", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # 2. Start tunnels
    api_proc, api_url = start_tunnel(8000)
    web_proc, web_url = start_tunnel(5173)

    if not api_url or not web_url:
        print("Failed to retrieve public URLs from localtunnel.")
        if api_proc: api_proc.terminate()
        if web_proc: web_proc.terminate()
        sys.exit(1)

    print("\n" + "="*60)
    print(f"PUBLIC FRONTEND URL: {web_url}")
    print(f"PUBLIC BACKEND API:  {api_url}")
    print("="*60 + "\n")

    # 3. Update environment configurations
    update_backend_env(web_url)
    update_frontend_env(api_url)

    print("Tunnels are active. Keep this script running to share the link.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down tunnels...")
    finally:
        api_proc.terminate()
        web_proc.terminate()

if __name__ == "__main__":
    main()
