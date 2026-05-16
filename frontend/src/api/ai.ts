import { request } from './client';
import type { AIRecommendOut } from '@/types/api';

export function recommend(query: string): Promise<AIRecommendOut> {
  return request<AIRecommendOut>('/ai/recommend', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}
