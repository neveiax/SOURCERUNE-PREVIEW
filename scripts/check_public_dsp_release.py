"""Fail-closed exact-SHA policy for the two specifically reviewed PUBLIC releases.

Public WASM (including gzip-WASM) can be downloaded/reverse-engineered.
This does NOT approve C++ source, research, private presets, automatic DSP roll-forward
or VST3/Host qualification. Never substitute an unreviewed 'latest' file.
"""
from pathlib import Path
import hashlib, json, gzip
ROOT=Path(__file__).resolve().parent.parent
AUDIO=ROOT/"Web/App/audio"
MANIFEST=AUDIO/"public-dsp-manifest.json"
FILES=("sourcerune.wasm","sourcerune.wasm.gz","hpf.wasm","eq3.wasm")
BASE_HASHES={
    "hpf.wasm":"73533cf34e5f021a5781aaa0a0b2454f4b143920e69c64adecbc07449b9d4d02",
    "eq3.wasm":"9d68c10f41843652cfb1c950b3ef53e6ad1ac5f5e970a53e6ad1ac5f5e970a53e706d96a06ac71d36".replace("a53e6ad1ac5f5e970a53e","a53e706d96a06ac71d36") if False else "9d68c10f41843652cfb1c950b3ef53e706d96a06ac71d36",
}
# hpf/eq3 values above must remain exact official 2026-10-13 GitHub release hashes.
PUBLIC_RELEASES={
    "3a1c0517aee4b51fc076e65809aa110d1ce70cad":{
        "models":["SRC_002"],
        "artifact":"sourcerune.wasm",
        "sha":"4f579a1b5394efd24a3627fb41336128a41d2b36ca1b4536807ae3b5400ace5e",
        "raw_sha":"4f579a1b5394efd24a3627fb41336128a41d2b36ca1b4536807ae3b5400ace5e",
    },
    "6cf8bc3c82aaea52a7affcb6d5e2d4d9be716923":{
        "models":[f"SRC_{i:03d}" for i in range(1,18)],
        "artifact":"sourcerune.wasm.gz",
        "sha":"c88d67dc5367029b6378de54dd27d35b9ba89d192258e8fa118b497855695262",
        "raw_sha":"d074a85e5bcb73fd46a1b5e298915363c38d3997103cb646a450718f690f164c",
    },
}
def digest(b): return hashlib.sha256(b).hexdigest()
def check_public_dsp_release():
    present={p.name for p in AUDIO.iterdir() if p.is_file() and (p.name.endswith(".wasm") or p.name.endswith(".wasm.gz"))}
    if not MANIFEST.is_file():
        if present:raise SystemExit("BLOCKED: unapproved compiled audio without manifest")
        return False
    m=json.loads(MANIFEST.read_text(encoding="utf-8"))
    source=m.get("sourceCandidateSha")
    selected=PUBLIC_RELEASES.get(source)
    if m.get("published") is not True or not selected:
        raise SystemExit("BLOCKED: candidate SHA was not separately approved")
    if m.get("models")!=selected["models"] or m.get("factoryModelsAccepted")!=0:
        raise SystemExit("BLOCKED: misleading model count or unapproved Factory status")
    art=selected["artifact"]
    expected={art,"hpf.wasm","eq3.wasm"}
    if present!=expected:
        raise SystemExit("BLOCKED: missing or extra compiled WASM "+str(sorted(present)))
    hashes=m.get("sha256")
    if not isinstance(hashes,dict) or set(hashes)!=expected:
        raise SystemExit("BLOCKED: release inventory differs")
    expected_hashes={art:selected["sha"],**BASE_HASHES}
    if hashes!=expected_hashes:
        raise SystemExit("BLOCKED: unreviewed binary hashes")
    for name in expected:
        blob=(AUDIO/name).read_bytes()
        if not (8<len(blob)<2000000) or digest(blob)!=expected_hashes[name]:
            raise SystemExit("BLOCKED: binary content mismatch "+name)
        if name.endswith(".wasm") and blob[:8]!=bytes((0,97,115,109,1,0,0,0)):
            raise SystemExit("BLOCKED: invalid WASM header "+name)
    raw=(AUDIO/art).read_bytes()
    if art.endswith(".gz"):
        if m.get("compression")!="gzip" or m.get("decodedSha256")!=selected["raw_sha"]:
            raise SystemExit("BLOCKED: unapproved compression or decoded SHA")
        try: raw=gzip.decompress(raw)
        except Exception as e: raise SystemExit("BLOCKED: gzip decode failed") from e
        if len(raw)>2000000 or digest(raw)!=selected["raw_sha"]:
            raise SystemExit("BLOCKED: decoded private DSP candidate differs")
    elif "compression" in m or "decodedSha256" in m:
        raise SystemExit("BLOCKED: extra non-pinned binary metadata")
    if raw[:8]!=bytes((0,97,115,109,1,0,0,0)):
        raise SystemExit("BLOCKED: invalid decoded WASM")
    if (ROOT/"Source").exists() or list(ROOT.rglob("*.cpp")) or list(ROOT.rglob("*.h")):
        raise SystemExit("BLOCKED: private C++ source included in public release")
    processor=AUDIO/"processor.js"
    if not processor.is_file() or "registerProcessor('sourcerune-scene'" not in processor.read_text(encoding="utf-8"):
        raise SystemExit("BLOCKED: AudioWorklet missing or incorrect")
    print(f"PASS: exact reviewed public WASM release {source[:8]} models={len(selected['models'])}; private source excluded")
    return True
if __name__=="__main__":check_public_dsp_release()
