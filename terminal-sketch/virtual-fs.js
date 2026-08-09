// Read-only virtual filesystem built from the fixed content/ folder.
class VirtualFileSystem {
  constructor(root, home = '/home/operator') {
    this.root = root;
    this.home = home;
  }

  normalize(input = '.', cwd = this.home) {
    if (input === '~') return this.home;
    const raw = input.startsWith('/') ? input : `${cwd}/${input}`;
    const parts = [];

    raw.split('/').forEach((part) => {
      if (!part || part === '.') return;
      if (part === '..') parts.pop();
      else parts.push(part);
    });

    return `/${parts.join('/')}` || '/';
  }

  get(path) {
    if (path === '/') return this.root;

    return path.split('/').filter(Boolean).reduce((node, part) => {
      if (!node || node.type !== 'dir') return undefined;
      return node.children[part];
    }, this.root);
  }

  resolve(input, cwd = this.home) {
    const path = this.normalize(input, cwd);
    return { path, node: this.get(path) };
  }

  list(path) {
    const node = this.get(path);
    if (!node || node.type !== 'dir') return undefined;

    return Object.entries(node.children).map(([name, child]) => ({
      name,
      type: child.type
    }));
  }
}

window.VirtualFileSystem = VirtualFileSystem;
