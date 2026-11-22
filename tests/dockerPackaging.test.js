'use strict';

const fs = require('fs');
const path = require('path');

describe('Docker Packaging Validation ([C])', () => {
  const rootDir = path.join(__dirname, '..');

  it('Dockerfile tồn tại và cấu hình đúng multi-stage, Node 24 alpine, non-root', () => {
    const dockerfilePath = path.join(rootDir, 'Dockerfile');
    expect(fs.existsSync(dockerfilePath)).toBe(true);
    const content = fs.readFileSync(dockerfilePath, 'utf8');

    expect(content).toContain('node:24-alpine');
    expect(content).toContain('USER node');
    expect(content).toContain('EXPOSE 3000');
    expect(content).toContain('HEALTHCHECK');
    expect(content).toContain('docker/entrypoint.sh');
  });

  it('docker/entrypoint.sh tồn tại, dùng LF và gọi migration + AUTO_SEED', () => {
    const entrypointPath = path.join(rootDir, 'docker', 'entrypoint.sh');
    expect(fs.existsSync(entrypointPath)).toBe(true);
    const content = fs.readFileSync(entrypointPath, 'utf8');

    expect(content.includes('\r\n')).toBe(false);
    expect(content).toContain('npx sequelize-cli db:migrate');
    expect(content).toContain('AUTO_SEED');
    expect(content).toContain('exec "$@"');
  });

  it('.dockerignore và .gitattributes tồn tại', () => {
    const dockerignorePath = path.join(rootDir, '.dockerignore');
    const gitattributesPath = path.join(rootDir, '.gitattributes');

    expect(fs.existsSync(dockerignorePath)).toBe(true);
    expect(fs.existsSync(gitattributesPath)).toBe(true);

    const dockerignore = fs.readFileSync(dockerignorePath, 'utf8');
    expect(dockerignore).toContain('node_modules');
    expect(dockerignore).toContain('.env');

    const gitattributes = fs.readFileSync(gitattributesPath, 'utf8');
    expect(gitattributes).toContain('eol=lf');
  });
});
