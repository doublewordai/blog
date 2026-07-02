// Distinct experts touched per layer (of 256) as N grows, three ways: a
// RUN of N (one sequence speculating N steps, "depth") vs a BATCH of N (N
// separate single-decode sequences, "width") vs the uniform coupon-collector
// ceiling (dataset-independent, closed form: E(1-(1-k/E)^N)). depth is
// computed exactly over every captured verify round; width is a Monte Carlo
// bootstrap over single-decode (position=0) rounds. depth/width here are the
// mean across the model's layers; the per-layer curves behind the chart's
// layer selector live in public/blog-data/speculating-on-the-margin/
// width-vs-depth-per-layer.json (lazily fetched, same shape per key).
// qwen speculates 15 MTP steps (runs to N=16); deepseek-v4-flash was captured
// at MTP num_steps=3, so its run tops out at N=4 and the chart clamps there.
// Same provenance/datasets as expertPopularityData.ts -- see that file and
// inference-lab/calibration. DeepSeek's SPEED-Bench sweep (EP=2+DPA on
// 2xB200) uses the same num_draft_tokens=4 as its HumanEval capture, so it
// shares npos/DS_N with it here.

export interface WidthVsDepthDataset {
  label: string
  model: string
  nRounds: number
  depth: number[]
  width: number[]
}

export interface WidthVsDepthModel {
  id: string
  label: string
  nList: number[]
  cc: number[]
  numLayers: number
  groups: { label: string; keys: string[] }[]
}

export const WIDTH_VS_DEPTH_DATASETS: Record<string, WidthVsDepthDataset> = {
  "humaneval": {
    label: "HumanEval",
    model: "qwen",
    nRounds: 75606,
    depth: [8.0, 13.127, 17.722, 21.915, 29.436, 36.026, 47.217, 56.432],
    width: [8.0, 15.211, 21.843, 27.865, 38.81, 48.399, 64.577, 77.859],
  },
  "speedbench/all": {
    label: "SPEED-Bench -- all categories",
    model: "qwen",
    nRounds: 617244,
    depth: [8.0, 12.871, 17.191, 21.131, 28.158, 34.353, 44.904, 53.582],
    width: [8.0, 15.56, 22.726, 29.44, 41.937, 53.245, 72.93, 89.32],
  },
  "speedbench/coding": {
    label: "SPEED-Bench -- coding",
    model: "qwen",
    nRounds: 60204,
    depth: [8.0, 13.046, 17.545, 21.666, 29.049, 35.516, 46.439, 55.386],
    width: [8.0, 15.254, 21.952, 28.096, 39.242, 48.909, 65.395, 79.09],
  },
  "speedbench/writing": {
    label: "SPEED-Bench -- writing",
    model: "qwen",
    nRounds: 89553,
    depth: [8.0, 12.69, 16.835, 20.574, 27.151, 32.898, 42.659, 50.713],
    width: [8.0, 15.403, 22.317, 28.722, 40.478, 50.71, 68.164, 82.448],
  },
  "speedbench/qa": {
    label: "SPEED-Bench -- qa",
    model: "qwen",
    nRounds: 27312,
    depth: [8.0, 12.849, 17.173, 21.131, 28.251, 34.599, 45.434, 54.356],
    width: [8.0, 15.391, 22.256, 28.595, 40.2, 50.333, 67.485, 81.505],
  },
  "speedbench/rag": {
    label: "SPEED-Bench -- rag",
    model: "qwen",
    nRounds: 23496,
    depth: [8.0, 13.083, 17.609, 21.726, 29.128, 35.665, 46.794, 56.08],
    width: [8.0, 15.379, 22.269, 28.669, 40.296, 50.578, 68.206, 82.507],
  },
  "speedbench/math": {
    label: "SPEED-Bench -- math",
    model: "qwen",
    nRounds: 59545,
    depth: [8.0, 12.951, 17.347, 21.383, 28.611, 35.061, 46.121, 55.213],
    width: [8.0, 15.369, 22.177, 28.557, 40.039, 50.177, 67.175, 81.234],
  },
  "speedbench/reasoning": {
    label: "SPEED-Bench -- reasoning",
    model: "qwen",
    nRounds: 74543,
    depth: [8.0, 12.942, 17.349, 21.396, 28.687, 35.136, 46.123, 55.125],
    width: [8.0, 15.503, 22.581, 29.153, 41.421, 52.196, 70.894, 86.421],
  },
  "speedbench/stem": {
    label: "SPEED-Bench -- stem",
    model: "qwen",
    nRounds: 74197,
    depth: [8.0, 12.856, 17.155, 21.102, 28.194, 34.511, 45.379, 54.343],
    width: [8.0, 15.524, 22.588, 29.18, 41.363, 52.268, 70.858, 86.234],
  },
  "speedbench/humanities": {
    label: "SPEED-Bench -- humanities",
    model: "qwen",
    nRounds: 73736,
    depth: [8.0, 12.804, 17.093, 21.011, 28.033, 34.282, 45.074, 53.999],
    width: [8.0, 15.467, 22.451, 28.958, 40.903, 51.511, 69.674, 84.581],
  },
  "speedbench/summarization": {
    label: "SPEED-Bench -- summarization",
    model: "qwen",
    nRounds: 19767,
    depth: [8.0, 13.064, 17.581, 21.663, 28.905, 35.255, 46.13, 55.14],
    width: [8.0, 15.342, 22.119, 28.418, 39.72, 49.677, 66.614, 80.288],
  },
  "speedbench/multilingual": {
    label: "SPEED-Bench -- multilingual",
    model: "qwen",
    nRounds: 43898,
    depth: [8.0, 12.969, 17.396, 21.442, 28.674, 35.057, 45.857, 54.662],
    width: [8.0, 15.468, 22.451, 29.031, 41.056, 51.775, 70.289, 85.818],
  },
  "speedbench/roleplay": {
    label: "SPEED-Bench -- roleplay",
    model: "qwen",
    nRounds: 70993,
    depth: [8.0, 12.717, 16.818, 20.505, 26.946, 32.479, 41.699, 49.228],
    width: [8.0, 14.933, 21.023, 26.518, 36.018, 44.307, 57.702, 68.518],
  },
  "deepseek-v4-flash/humaneval": {
    label: "HumanEval",
    model: "deepseek-v4-flash",
    nRounds: 23888,
    depth: [6.0, 9.944, 13.403, 16.625],
    width: [6.0, 11.41, 16.41, 21.02],
  },
  "deepseek-v4-flash/speedbench/all": {
    label: "SPEED-Bench -- all categories",
    model: "deepseek-v4-flash",
    nRounds: 381226,
    depth: [6.0, 9.715, 13.148, 16.645],
    width: [6.0, 11.724, 17.205, 22.468],
  },
  "deepseek-v4-flash/speedbench/coding": {
    label: "SPEED-Bench -- coding",
    model: "deepseek-v4-flash",
    nRounds: 27876,
    depth: [6.0, 9.953, 13.427, 16.614],
    width: [6.0, 11.547, 16.745, 21.59],
  },
  "deepseek-v4-flash/speedbench/writing": {
    label: "SPEED-Bench -- writing",
    model: "deepseek-v4-flash",
    nRounds: 82460,
    depth: [6.0, 9.603, 13.074, 16.888],
    width: [6.0, 11.601, 16.9, 21.934],
  },
  "deepseek-v4-flash/speedbench/qa": {
    label: "SPEED-Bench -- qa",
    model: "deepseek-v4-flash",
    nRounds: 14958,
    depth: [6.0, 9.593, 12.995, 16.766],
    width: [6.0, 11.567, 16.769, 21.659],
  },
  "deepseek-v4-flash/speedbench/rag": {
    label: "SPEED-Bench -- rag",
    model: "deepseek-v4-flash",
    nRounds: 6414,
    depth: [6.0, 10.051, 13.682, 17.325],
    width: [6.0, 11.618, 16.922, 21.959],
  },
  "deepseek-v4-flash/speedbench/math": {
    label: "SPEED-Bench -- math",
    model: "deepseek-v4-flash",
    nRounds: 64958,
    depth: [6.0, 9.794, 13.179, 16.356],
    width: [6.0, 11.504, 16.588, 21.361],
  },
  "deepseek-v4-flash/speedbench/reasoning": {
    label: "SPEED-Bench -- reasoning",
    model: "deepseek-v4-flash",
    nRounds: 32781,
    depth: [6.0, 9.718, 13.149, 16.727],
    width: [6.0, 11.628, 16.956, 22.028],
  },
  "deepseek-v4-flash/speedbench/stem": {
    label: "SPEED-Bench -- stem",
    model: "deepseek-v4-flash",
    nRounds: 66915,
    depth: [6.0, 9.747, 13.139, 16.393],
    width: [6.0, 11.663, 17.012, 22.107],
  },
  "deepseek-v4-flash/speedbench/humanities": {
    label: "SPEED-Bench -- humanities",
    model: "deepseek-v4-flash",
    nRounds: 43949,
    depth: [6.0, 9.76, 13.222, 16.811],
    width: [6.0, 11.662, 17.041, 22.129],
  },
  "deepseek-v4-flash/speedbench/summarization": {
    label: "SPEED-Bench -- summarization",
    model: "deepseek-v4-flash",
    nRounds: 6062,
    depth: [6.0, 9.768, 13.55, 17.575],
    width: [6.0, 11.44, 16.484, 21.213],
  },
  "deepseek-v4-flash/speedbench/multilingual": {
    label: "SPEED-Bench -- multilingual",
    model: "deepseek-v4-flash",
    nRounds: 16888,
    depth: [6.0, 9.449, 12.616, 15.643],
    width: [6.0, 11.466, 16.505, 21.197],
  },
  "deepseek-v4-flash/speedbench/roleplay": {
    label: "SPEED-Bench -- roleplay",
    model: "deepseek-v4-flash",
    nRounds: 17965,
    depth: [6.0, 9.545, 13.098, 17.287],
    width: [6.0, 11.331, 16.134, 20.583],
  },
}

export const WIDTH_VS_DEPTH_MODELS: WidthVsDepthModel[] = [
  {
    id: 'qwen',
    label: 'Qwen3.6-35B-A3B',
    nList: [1, 2, 3, 4, 6, 8, 12, 16],
    cc: [8.0, 15.75, 23.258, 30.531, 44.403, 57.421, 81.104, 101.962],
    numLayers: 40,
    groups: [
      { label: 'HumanEval', keys: ['humaneval'] },
      { label: 'SPEED-Bench (qualitative)', keys: ["speedbench/all", "speedbench/coding", "speedbench/writing", "speedbench/qa", "speedbench/rag", "speedbench/math", "speedbench/reasoning", "speedbench/stem", "speedbench/humanities", "speedbench/summarization", "speedbench/multilingual", "speedbench/roleplay"] },
    ],
  },
  {
    id: 'deepseek-v4-flash',
    label: 'DeepSeek-V4-Flash',
    nList: [1, 2, 3, 4],
    cc: [6.0, 11.859, 17.581, 23.169],
    numLayers: 43,
    groups: [
      { label: 'HumanEval', keys: ['deepseek-v4-flash/humaneval'] },
      { label: 'SPEED-Bench (qualitative)', keys: ["deepseek-v4-flash/speedbench/all", "deepseek-v4-flash/speedbench/coding", "deepseek-v4-flash/speedbench/writing", "deepseek-v4-flash/speedbench/qa", "deepseek-v4-flash/speedbench/rag", "deepseek-v4-flash/speedbench/math", "deepseek-v4-flash/speedbench/reasoning", "deepseek-v4-flash/speedbench/stem", "deepseek-v4-flash/speedbench/humanities", "deepseek-v4-flash/speedbench/summarization", "deepseek-v4-flash/speedbench/multilingual", "deepseek-v4-flash/speedbench/roleplay"] },
    ],
  },
]

export const WIDTH_VS_DEPTH_DEFAULT_MODEL = 'qwen'
export const WIDTH_VS_DEPTH_DEFAULT = 'speedbench/all'
