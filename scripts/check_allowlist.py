"""Fail-closed published path and SHA allowlist for SOURCERUNE-PREVIEW."""
from pathlib import Path
import subprocess, json, re, struct
from hashlib import sha1

ALLOWED = {
    "README.md", "index.html", "viewer.css", "viewer.js",
    "interaction-state.mjs", "interaction-lab.mjs", "card-layout.mjs", "stage-controls.mjs", ".nojekyll",
    ".github/workflows/snapshot-ui.yml",
    "scripts/bootstrap_assets.py", "scripts/check_allowlist.py",
    "scripts/interaction-smoke.mjs", "scripts/card-layout-smoke.mjs",
    "scripts/native-card-smoke.mjs",
    "assets/UI_01.png", "assets/UI_02.png", "assets/approved_ui_manifest.json",
}
PINNED={"UI_01":"d2fc997e788361954726e712097373da75a4cec6",
        "UI_02":"df0623a87b3c2405ee5adfcba2b44f387d50887b"}
def blobsha(content):
    return sha1(b"blob "+str(len(content)).encode()+b"\0"+content).hexdigest()
def main():
    root=Path(__file__).resolve().parent.parent
    manifest=json.loads((root/"assets/approved_ui_manifest.json").read_text(encoding="utf-8"))
    if manifest.get("source_commit")!="c035db4d6d5f409cdbedc4f9c874089ea1750fda" or len(manifest.get("entries",[]))!=50:
        raise SystemExit("BLOCKED: unexpected image manifest")
    for entry in manifest["entries"]:
        dest=entry["output_path"]
        if not re.fullmatch(r"assets/library/UI_0[12]/(SOURCE|TRANSMISSION|WALL_COVER|SPACE_ENVIRONMENT)/[A-Za-z0-9_]+\.png",dest):
            raise SystemExit("BLOCKED: manifest path not approved: "+dest)
        if not entry["source_path"].startswith("Assets/UI/"+entry["ui"]+"/"+entry["group"]+"/"):
            raise SystemExit("BLOCKED: manifest origin inconsistent")
        if not re.fullmatch(r"[a-f0-9]{40}",entry["git_blob_sha"]):
            raise SystemExit("BLOCKED: invalid expected SHA")
        ALLOWED.add(dest)
        image=root/dest
        if not image.is_file() or image.stat().st_size!=entry["bytes"] or blobsha(image.read_bytes())!=entry["git_blob_sha"]:
            raise SystemExit("BLOCKED: PNG missing or inconsistent with manifest: "+dest)
    for name,sha in PINNED.items():
        image=root/"assets"/(name+".png")
        if not image.is_file() or blobsha(image.read_bytes())!=sha:
            raise SystemExit("BLOCKED: pinned UI screenshot missing or tampered")
        raw=image.read_bytes()
        expected={"UI_01":(1499,807),"UI_02":(1672,941)}[name]
        actual=struct.unpack(">II",raw[16:24]) if raw.startswith(b"\x89PNG\r\n\x1a\n") else None
        if actual!=expected:
            raise SystemExit(f"BLOCKED: {name} screenshot {actual} does not match approved shell {expected}")
    tracked=set(subprocess.check_output(["git","ls-files"],text=True,cwd=root).splitlines())
    untracked=set(subprocess.check_output(["git","ls-files","--others","--exclude-standard"],text=True,cwd=root).splitlines())
    unexpected=sorted((tracked|untracked)-ALLOWED)
    if unexpected:
        raise SystemExit("BLOCKED: unapproved public files: "+", ".join(unexpected))
    for name in ("index.html","viewer.css","viewer.js","interaction-lab.mjs","interaction-state.mjs","stage-controls.mjs","card-layout.mjs"):
        content=(root/name).read_text(encoding="utf-8")
        for forbidden in ("raw.githubusercontent.com","github.com/ureia-dev/SOURCERUNE/blob",
                          '<script src="https://',"https://api.github.com","AudioWorklet","WebAssembly","createSceneNode"):
            if forbidden in content: raise SystemExit(f"BLOCKED: {name} contains {forbidden}")
    print(f"PASS: strict public allowlist / {len(manifest['entries'])} approved UI module images")
if __name__ == "__main__":
    main()
