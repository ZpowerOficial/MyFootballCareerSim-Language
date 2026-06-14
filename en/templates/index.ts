/**
 * Template translations - Patchable by community
 * Includes: news headlines, media reactions
 * Supports {{ref:path}} syntax for cross-referencing content
 */

import news from './news.json';
import media from './media.json';

export const templates = {
  news: news.news,
  newsType: news.newsType,
  media: media.media,
};

export default templates;
