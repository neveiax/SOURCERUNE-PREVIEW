"""Fail-closed signed-by-GitHub-build candidate allowlist for public compiled audio.

Publication makes these binaries downloadable. No claim of DSP secrecy,
complete 250-model coverage, true-peak verification or host qualification.
"""
from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parent.parent
AUDIO=ROOT/"Web/App/audio"
MANIFEST=AUDIO/"public-dsp-manifest.json"
PINNED_SOURCE="3a1c0517aee4b51fc076e65809aa110d1ce70cad"
FILES=("sourcerune.wasm","hpf.wasm","eq3.wasm")

def check_public_dsp_release():
    present=[p for p in ROOT.rglob("*.wasm") if ".git" not in p.parts]
    if not MANIFEST.is_file():
        if present: raise SystemExit("BLOCKED: compiled DSP without authorized release manifest")
        return False
    m=json.loads(MANIFEST.read_text(encoding="utf-8"))
    if m.get("published") is not True or m.get("sourceCandidateSha")!=PINNED_SOURCE:
        raise SystemExit("BLOCKED: unapproved candidate or publication flag")
    if m.get("models")!=["SRC_002"] or m.get("factoryModelsAccepted")!=0:
        raise SystemExit("BLOCKED: incorrect model coverage declaration")
    hashes=m.get("sha256")
    if not isinstance(hashes,dict) or set(hashes)!=set(FILES):
        raise SystemExit("BLOCKED: unapproved binary inventory")
    if set(p.resolve() for p in present)!={ (AUDIO/name).resolve() for name in FILES }:
        raise SystemExit("BLOCKED: unexpected WASM binaries present")
    for name in FILES:
        f=AUDIO/name
        b=f.read_bytes()
        if not (8<len(b)<2000000 and b[:8]==bytes((0,97,115,109,1,0,0,0))):
            raise SystemExit("BLOCKED: missing/invalid WASM: "+name)
        h=hashlib.sha256(b).hexdigest()
        if hashes[name]!=h:raise SystemExit("BLOCKED: unapproved compiled binary: "+name)
    if (ROOT/"Source").exists() or list(ROOT.rglob("*.cpp")) or list(ROOT.rglob("*.h")):
        raise SystemExit("BLOCKED: C++ source/private research included")
    if not (AUDIO/"processor.js").is_file():
        raise SystemExit("BLOCKED: missing AudioWorklet transport")
    if "registerProcessor('sourcerune-scene'" not in (AUDIO/"processor.js").read_text(encoding="utf-8"):
        raise SystemExit("BLOCKED: incorrect AudioWorklet processor")
    print("PASS: 3 pinned-hash public WASM binaries; only SRC_002 physical model claimed")
    return True

if __name__=="__main__":
    check_public_dsp_release()
