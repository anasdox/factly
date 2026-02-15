import * as fs from 'fs';
import * as path from 'path';
import { BenchmarkResult } from './types';

const RESULTS_DIR = path.resolve(__dirname, '../../results');

export function saveResult(result: BenchmarkResult): string {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const ts = result.timestamp.replace(/[:.]/g, '-');
  const target = result.target;
  const label = `${target.provider}-${target.model}-t${target.tempExtraction}`;
  const filename = `${ts}_${label}.json`;
  const filePath = path.join(RESULTS_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
  return filePath;
}

export function loadResult(filePath: string): BenchmarkResult {
  const resolved = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(resolved, 'utf-8'));
}

export function listResults(): Array<{ path: string; id: string; timestamp: string; configName: string; overallScore: number }> {
  if (!fs.existsSync(RESULTS_DIR)) return [];

  const files = fs.readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json') && f !== '.gitkeep')
    .sort()
    .reverse();

  return files.map((f) => {
    const filePath = path.join(RESULTS_DIR, f);
    try {
      const result: BenchmarkResult = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        path: filePath,
        id: result.id,
        timestamp: result.timestamp,
        configName: result.config.name,
        overallScore: result.overallScore,
      };
    } catch {
      return {
        path: filePath,
        id: f,
        timestamp: '',
        configName: 'unknown',
        overallScore: 0,
      };
    }
  });
}
