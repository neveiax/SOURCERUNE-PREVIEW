"""Fail-closed published source tree allowlist for SOURCERUNE-PREVIEW."""
from pathlib import Path
import subprocess
ALLOWED = {
    "README.md", "index.html", "viewer.css", "viewer.js", "interaction-lab.mjs", "interaction-state.mjs", ".nojekyll",
    ".github/workflows/snapshot-ui.yml",
    "scripts/bootstrap_assets.py", "scripts/check_allowlist.py", "scripts/interaction-smoke.mjs",
    "assets/UI_01.png", "assets/UI_02.png",
}
def main():
    files=set(subprocess.check_output(["git","ls-files"],text=True).splitlines())
    pending=set(subprocess.check_output(["git","ls-files","--others","--exclude-standard"],text=True).splitlines())
    unexpected=sorted((files|pending)-ALLOWED)
    if unexpected: raise SystemExit("BLOCKED: disallowed files: "+", ".join(unexpected))
    for name in ("assets/UI_01.png","assets/UI_02.png"):
        if not Path(name).is_file(): raise SystemExit("BLOCKED: missing "+name)
    for name in ("index.html","viewer.css","viewer.js","interaction-lab.mjs","interaction-state.mjs"):
        content=Path(name).read_text(encoding="utf-8")
        for forbidden in ("raw.githubusercontent.com", "github.com/ureia-dev/SOURCERUNE/blob",
                          "<script src=\"https://", "https://api.github.com", "AudioWorklet",
                          "WebAssembly", "createSceneNode"):
            if forbidden in content: raise SystemExit(f"BLOCKED: {name} contains {forbidden}")
    print("PASS: only public visual UI assets and the verified site source are publishable")
if __name__=="__main__":
    main()
