# Face Detection Models

This folder should contain the face-api.js models for face detection.

## Required Models

Download the following models from the face-api.js repository:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Required files:
- tiny_face_detector_model-weights_manifest.json
- tiny_face_detector_model-shard1

## Installation

1. Download the models from the link above
2. Place them in this `public/models` directory
3. The models will be loaded at runtime by the MockTestRunner component

## Alternative: Use CDN

If you prefer not to download the models, you can modify the MODEL_URL in MockTestRunner.tsx to use a CDN:

```typescript
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
```
