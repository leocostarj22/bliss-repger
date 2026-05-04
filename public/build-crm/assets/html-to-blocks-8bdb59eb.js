import{v as r}from"./main-e97fb062.js";function o(t){const e=t.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);return e?e.join(`
`):""}function s(t){return t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,"")}function c(t){return t.trim()?[{id:r(),type:"html",props:{code:t}}]:[]}export{o as extractStyleBlocks,c as htmlToBlocks,s as stripStyleTags};
