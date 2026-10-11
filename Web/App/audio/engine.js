// PUBLIC UI-ONLY shim: no AudioWorklet, wasm, DSP, or audio parameter recipes.
export async function createSceneNode(){throw Error("Audio DSP is private in this preview")}
export function parametersFromState(){return []}
export function hpfFromState(){return []}
export function eq3FromState(){return []}
export function audioSupportNote(){return "UI ONLY · AUDIO DISABLED"}
