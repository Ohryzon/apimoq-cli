import path from 'node:path';

export const projectPaths = (cwd = process.cwd()) => {
  const dir = path.join(cwd, '.apimoq');
  return {
    dir,
    api: path.join(dir, 'api.json'),
    data: path.join(dir, 'data.json'),
    config: path.join(dir, 'config.json'),
    readme: path.join(dir, 'README.md')
  };
};
