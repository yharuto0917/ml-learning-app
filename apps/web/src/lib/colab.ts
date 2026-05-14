import {
  GITHUB_NOTEBOOKS_BRANCH,
  GITHUB_NOTEBOOKS_REPO,
  NOTEBOOKS_BASE_PATH,
} from './constants';

export function colabUrl(notebookPath: string): string {
  const cleaned = notebookPath.replace(/^\/+/, '');
  return `https://colab.research.google.com/github/${GITHUB_NOTEBOOKS_REPO}/blob/${GITHUB_NOTEBOOKS_BRANCH}/${NOTEBOOKS_BASE_PATH}/${cleaned}`;
}
