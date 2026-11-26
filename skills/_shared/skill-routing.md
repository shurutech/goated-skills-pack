# Domain skill routing

One table: what the task touches, which skill to load. Process skills
(`issue-intake`, `plan-contract`, the builders, `module-loop`) decide the flow;
domain skills add knowledge on top. Load only the rows that match. A skill that
does not match the problem stays unloaded.

When work is handed to a builder or implementer, name the matched skills in its
brief so it invokes them itself; a subagent does not inherit the parent
session's loaded skills.

This file is a template. The rows below are **optional third-party skills**
(not part of this pack); install the ones you use from their source repos and
delete the rest. Add your own rows for your stack.

## 3D, three.js, WebGL (example: `CloudAI-X/threejs-skills`, `iart-ai/webgl-animation-skills`)

| The task touches | Skill |
|---|---|
| New scene, camera, renderer, resize, render loop | `threejs-fundamentals` |
| three.js inside React (R3F, drei) | `threejs-react-three-fiber` (plus the row for the feature itself) |
| Shapes, 3D text, custom vertex data, instancing, point clouds | `threejs-geometry` |
| Material choice, PBR tuning, blending, transparency | `threejs-materials` |
| Images on materials, UVs, color space, render targets | `threejs-textures` |
| Lights, shadows, environment lighting | `threejs-lighting` |
| Loading glTF, HDR, textures; progress and disposal | `threejs-loaders` |
| Shrinking or validating a model before shipping it | `threejs-asset-pipeline` |
| Keyframe, skeletal, morph or procedural animation | `threejs-animation` |
| Clicks, hover, drag, camera controls, raycasting | `threejs-interaction` |
| Bloom, depth of field, colour grading, screen effects | `threejs-postprocessing` |
| Custom vertex/fragment shader on a three.js material, TSL | `threejs-shaders` |
| Standalone GLSL: gradient/noise background, SDF, image transition | `shader-glsl` |
| Scene is slow, janks, or eats memory | `threejs-performance` |

A 3D feature usually needs two or three rows (for example fundamentals +
loaders + performance). Load those, not the whole set.

## UI motion (examples: `kylezantos/design-motion-principles`, `patricio0312rev/skills`, `ibelick/ui-skills`)

| The task touches | Skill |
|---|---|
| Deciding what should move, timing, easing; auditing existing motion | `design-motion-principles` |
| Writing Motion components: enter/exit, layout, gestures, scroll, sequences | `framer-motion-animator` |
| Animation stutters or janks; reviewing animation performance | `fixing-motion-performance` |

If your app uses the newer `motion` package rather than `framer-motion`, keep
the patterns and swap the import; reuse existing motion helpers in your
codebase before adding a new one.

## Web design (example: `vercel-labs/agent-skills`, Anthropic's `frontend-design` plugin)

| The task touches | Skill |
|---|---|
| New UI or a visual direction to choose | `frontend-design` |
| Checking finished UI code against interface guidelines (a11y, focus, forms, motion) | `web-design-guidelines` |
| Module redesign or responsive round | `module-loop` (this pack; it owns the flow, the rows above compose inside it) |

Your project's own design rules win over any generic guidance these skills give.

## Code quality and maintenance (examples: `anthropics/knowledge-work-plugins`, `mattpocock/skills`)

| The task touches | Skill |
|---|---|
| "What should we refactor", debt audit, maintenance backlog | `tech-debt` |
| Module boundaries, shallow modules, architecture clean-up | `improve-codebase-architecture` |
| Bugs in a diff or PR | your code-review skill or `commit-review` (this pack) |

Audit skills produce findings, not fixes. Each fix that follows is a normal
change and goes back through `issue-intake` sizing.
