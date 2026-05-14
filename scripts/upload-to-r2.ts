import path from 'node:path';
import fg from 'fast-glob';
import { execa } from 'execa';

async function main() {
  const args = process.argv.slice(2);
  const isLocal = args.includes('--local');
  
  const distDir = path.resolve('dist/content');
  const files = await fg('**/*.{html,json}', { cwd: distDir });
  
  const cwd = path.resolve('apps/web');

  for (const file of files) {
    const filePath = path.join(distDir, file);
    const key = `content/${file}`;
    
    let contentType = 'application/octet-stream';
    if (file.endsWith('.html')) contentType = 'text/html; charset=utf-8';
    if (file.endsWith('.json')) contentType = 'application/json; charset=utf-8';

    const cmdArgs = [
      'exec', 'wrangler', 'r2', 'object', 'put', `ml-learning-content/${key}`,
      `--file=${filePath}`,
      `--content-type=${contentType}`
    ];
    
    if (isLocal) {
      cmdArgs.push('--local');
    }

    console.log(`Uploading: ${key} ${isLocal ? '(local)' : ''}`);
    try {
      await execa('pnpm', cmdArgs, { cwd, stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to upload ${key}`);
      process.exit(1);
    }
  }
}

main().catch(console.error);