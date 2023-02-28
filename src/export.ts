import { exec } from 'child_process';
import { readFile, rm, writeFile } from 'fs/promises';
import { normalizePath, Notice, TFile } from 'obsidian';
import MarkdownIt from 'markdown-it';
import { embedImageToHtml } from './convertImage';
import markdownItFrontMatter from 'markdown-it-front-matter';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse/lib';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';

export async function exportSlide(
  file: TFile,
  ext: 'html' | 'pdf' | 'pptx',
  basePath: string,
  themeDir: string,
) {
  const exportDir = normalizePath(`${process.env.USERPROFILE}/Downloads`);
  if (!file) return;
  const filePath = normalizePath(`${basePath}/${file.path}`);
  const tmpPath = `${exportDir}/${file.basename}.tmp`;

  let frontMatter;

  const md = new MarkdownIt().use(markdownItFrontMatter, v => {
    frontMatter = v;
  });

  const result = md.render(await readFile(filePath, 'utf-8'));
  const embedded = await embedImageToHtml(result);

  let reverseConverted = (
    await unified()
      .use(rehypeParse)
      .use(rehypeRemark)
      .use(remarkStringify)
      .process(embedded.body.innerHTML)
  ).value;

  reverseConverted = `---\n${frontMatter}\n---\n${reverseConverted}`;

  await writeFile(tmpPath, reverseConverted);

  const cmd = `npx -y @marp-team/marp-cli@latest --stdin false --allow-local-files --theme-set "${themeDir}" -o "${exportDir}/${file.basename}.${ext}" -- "${tmpPath}"`;

  new Notice(`Exporting "${file.basename}.${ext}" to "${exportDir}"`, 20000);
  exec(cmd, () => {
    new Notice('Exported successfully', 20000);
    rm(tmpPath);
  });
}
