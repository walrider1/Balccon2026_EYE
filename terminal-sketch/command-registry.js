// Commands are registered as data + one handler each. The help screen is
// generated from this registry, so new commands document themselves.
class CommandRegistry {
  constructor(commands = []) {
    this.commands = new Map();
    commands.forEach((command) => this.register(command));
  }

  register(command) {
    const names = [command.name, ...(command.aliases || [])];
    names.forEach((name) => this.commands.set(name, command));
    return this;
  }

  parse(rawInput) {
    return rawInput.trim().match(/"[^"]*"|'[^']*'|\S+/g)
      ?.map((token) => token.replace(/^['"]|['"]$/g, '')) || [];
  }

  execute(rawInput, context) {
    const tokens = this.parse(rawInput);
    const name = tokens.shift().toLowerCase();
    const command = this.commands.get(name);

    if (!command) {
      context.print(`${name}: command not recognized. Type 'help'.`, 'error');
      return;
    }

    command.run({ ...context, args: tokens, arg: tokens.join(' ') });
  }

  helpLines() {
    return [...new Set(this.commands.values())]
      .filter((command) => command.showInHelp !== false)
      .map((command) => `  ${command.usage.padEnd(28)} ${command.description}`)
      .join('\n');
  }

  commandNames() {
    return [...this.commands.keys()].sort();
  }
}

window.CommandRegistry = CommandRegistry;
