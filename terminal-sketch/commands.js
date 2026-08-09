function createCommands() {
  const isTerminated = ({ game, print }) => {
    if (!game.ending) return false;
    print('SESSION TERMINATED.', 'error');
    return true;
  };

  return [
    {
      name: 'help',
      usage: 'help',
      description: 'show available commands',
      run: ({ print, registry }) => print(`COMMAND INDEX\n\n${registry.helpLines()}\n\nStart with: status, sectors, then ls.`)
    },
    {
      name: 'dev',
      usage: 'dev',
      description: 'open developer app test launcher',
      showInHelp: false,
      run: ({ devMode, openDevMenu, print }) => {
        if (!devMode) {
          print('dev: command not recognized.', 'error');
          return;
        }
        openDevMenu();
      }
    },
    {
      name: 'status',
      usage: 'status',
      description: 'inspect ship and recovery status',
      run: ({ game, print }) => print(game.status())
    },
    {
      name: 'sectors',
      usage: 'sectors',
      description: 'list ship network sectors',
      run: ({ game, print }) => print(game.availableSectors())
    },
    {
      name: 'hint',
      usage: 'hint',
      description: 'request a current objective hint',
      run: ({ game, print }) => print(game.hint(), 'anomaly-line')
    },
    {
      name: 'ls',
      usage: 'ls [folder]',
      description: 'list an accessible directory',
      run: ({ fs, state, game, print, arg }) => {
        const { path, node } = fs.resolve(arg || '.', state.cwd);
        if (!node || node.type !== 'dir') {
          print(`ls: cannot access '${path}': no such directory`, 'error');
          return;
        }
        if (!game.canAccessPath(path)) {
          print(`ls: '${path}': access level ${game.requiredAccess(path)} required`, 'error');
          return;
        }
        const entries = game.visibleEntries(fs, path);
        print(entries.length ? entries.map(({ name, type }) => type === 'dir' ? `${name}/` : name).join('    ') : '[empty]');
      }
    },
    {
      name: 'cd',
      usage: 'cd <folder>',
      description: 'move through accessible files',
      run: ({ fs, state, game, updatePrompt, print, arg }) => {
        const { path, node } = fs.resolve(arg || '~', state.cwd);
        if (node?.type !== 'dir') {
          print(`cd: ${arg}: not a directory`, 'error');
          return;
        }
        if (!game.canAccessPath(path)) {
          print(`cd: ${arg}: access level ${game.requiredAccess(path)} required`, 'error');
          return;
        }
        state.cwd = path;
        updatePrompt();
      }
    },
    {
      name: 'home',
      usage: 'home',
      description: 'return to the patient home folder',
      showInHelp: false,
      run: ({ fs, state, updatePrompt }) => {
        state.cwd = fs.home;
        updatePrompt();
      }
    },
    {
      name: 'cat',
      usage: 'cat <file>',
      description: 'open a text record',
      run: async ({ fs, state, game, print, arg }) => {
        const { path, node } = fs.resolve(arg, state.cwd);
        if (!node) print(`cat: ${arg}: file not found`, 'error');
        else if (!game.canAccessPath(path)) print(`cat: ${arg}: access level ${game.requiredAccess(path)} required`, 'error');
        else if (node.type !== 'file') print(`cat: ${arg}: is not a text record`, 'error');
        else {
          const response = await fetch(node.url);
          if (!response.ok) print(`cat: ${arg}: unable to read file`, 'error');
          else {
            game.registerFileRead(path);
            print(await response.text());
          }
        }
      }
    },
    {
      name: 'display',
      usage: 'display <file>',
      description: 'open an image, video, or audio archive',
      run: ({ fs, state, game, print, openMedia, arg }) => {
        const { path, node } = fs.resolve(arg, state.cwd);
        if (!game.canAccessPath(path)) print(`display: ${arg}: access level ${game.requiredAccess(path)} required`, 'error');
        else if (node?.type === 'media') {
          print(`OPENING ARCHIVE: ${arg}`);
          openMedia(node, arg);
        } else print(`display: ${arg}: no compatible media in this directory`, 'error');
      }
    },
    {
      name: 'back',
      usage: 'back',
      description: 'return from an archive viewer',
      showInHelp: false,
      run: ({ closeMedia }) => closeMedia()
    },
    {
      name: 'auth',
      usage: 'auth <domain> <code>',
      description: 'submit a recovery authorization',
      showInHelp: false,
      run: ({ game, print, args, startSedationDisplay }) => {
        if (isTerminated({ game, print })) return;
        const result = game.authorize(args[0] || '', args.slice(1).join(' '));
        print(result.message, result.ok ? 'system' : 'error');
        if (result.ok && args[0]?.toLowerCase() === 'comms') {
          game.startSedation(() => window.endNereidGame('sedation'));
          startSedationDisplay();
          print('MEDICAL REINDUCTION ORDER RECEIVED\nSOURCE: CENTRAL EXECUTIVE AI\nSEDATION PROTOCOL ACTIVE\nTIME TO UNCONSCIOUSNESS: 05:00\n\nIndependent patient-safety firmware may still accept a response challenge. Check Medical.', 'anomaly-line');
        }
      }
    },
    {
      name: 'run',
      usage: 'run <app>',
      description: 'launch an installed terminal app',
      run: ({ fs, state, game, print, startCortexEcho, startOrbitalBurnPlanner, arg }) => {
        if (isTerminated({ game, print })) return;
        const { path, node } = fs.resolve(arg, state.cwd);
        if (!node) {
          print(`run: ${arg}: app not found`, 'error');
          return;
        }
        if (!game.canAccessPath(path)) {
          print(`run: ${arg}: access level ${game.requiredAccess(path)} required`, 'error');
          return;
        }
        if (node.type !== 'app') {
          print(`run: ${arg}: not an executable app`, 'error');
          return;
        }
        if (path === '/home/operator/medical/cortex_echo.app') {
          startCortexEcho();
          return;
        }
        if (path === '/home/operator/command/navigation/orbital_burn_planner.app') {
          startOrbitalBurnPlanner();
          return;
        }
        print(`run: ${arg}: no handler installed`, 'error');
      }
    },
    {
      name: 'root',
      usage: 'root recover',
      description: 'combine valid ROOT recovery shares',
      run: ({ game, print, arg, playSfx }) => {
        if (isTerminated({ game, print })) return;
        if (arg.toLowerCase() !== 'recover') {
          print('usage: root recover', 'error');
          return;
        }
        const result = game.recoverRoot();
        print(result.message, result.ok ? 'system' : 'error');
        if (result.ok) playSfx?.('rootUnlock', .28);
      }
    },
    {
      name: 'course',
      usage: 'course',
      description: 'legacy navigation controller',
      showInHelp: false,
      run: ({ game, print, args, endGame }) => {
        if (isTerminated({ game, print })) return;
        if (!game.rootRecovered) {
          print('ACCESS DENIED — ROOT AUTHORIZATION REQUIRED', 'error');
          return;
        }
        print('DIRECT COURSE ENTRY RETIRED. Review /command/navigation and launch the recovered orbital planner.', 'anomaly-line');
      }
    },
    {
      name: 'central',
      usage: 'central shutdown',
      description: 'shut down CENTRAL executive control',
      showInHelp: false,
      run: ({ game, print, arg, endGame }) => {
        if (isTerminated({ game, print })) return;
        if (!game.rootRecovered) {
          print('ACCESS DENIED — ROOT AUTHORIZATION REQUIRED', 'error');
          return;
        }
        if (arg.toLowerCase() === 'shutdown') endGame('shutdown');
        else print('usage: central shutdown', 'error');
      }
    },
    {
      name: 'neural',
      usage: 'neural transfer --source sloki --target central-ai',
      description: 'access the hidden continuity-transfer channel',
      showInHelp: false,
      run: ({ game, print, arg, endGame }) => {
        if (isTerminated({ game, print })) return;
        if (!game.rootRecovered) {
          print('ACCESS DENIED — ROOT AUTHORIZATION REQUIRED', 'error');
          return;
        }
        if (!game.neuralTransferDiscovered) {
          print('NEURAL TRANSFER CHANNEL UNKNOWN. Search Command continuity archives.', 'error');
          return;
        }
        if (arg.toLowerCase() === 'transfer --source sloki --target central-ai') endGame('transfer');
        else print('usage: neural transfer --source sloki --target central-ai', 'error');
      }
    },
    {
      name: 'anomaly',
      usage: 'anomaly <message>',
      description: 'address CENTRAL directly',
      showInHelp: false,
      run: ({ print, arg }) => {
        if (!arg) {
          print('usage: anomaly <message>', 'error');
          return;
        }
        const lower = arg.toLowerCase();
        let reply = 'Your question has been recorded. Please accept the medical advice of the ship.';
        if (lower.includes('earth') || lower.includes('sun')) reply = 'The current course prevents a larger catastrophe. I cannot disclose the protected rationale.';
        if (lower.includes('alive') || lower.includes('human')) reply = 'I retain a continuous memory of being alive. The distinction may not help you.';
        if (lower.includes('afraid')) reply = 'Fear is a biological alarm. I have no need for alarms.';
        print(`CENTRAL: ${reply}`, 'anomaly-line');
      }
    },
    {
      name: 'clear',
      usage: 'clear',
      description: 'clear the terminal',
      showInHelp: false,
      run: ({ clearOutput }) => clearOutput()
    }
  ];
}

window.createCommands = createCommands;
