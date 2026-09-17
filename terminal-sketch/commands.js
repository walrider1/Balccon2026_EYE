function createCommands() {
  const isTerminated = ({ game, print }) => {
    if (!game.ending) return false;
    print('SESSION TERMINATED.', 'error');
    return true;
  };

  return [
    { name: 'objective', usage: 'objective', description: 'show your current recovery phase and next step', run: ({game, print}) => print(game.objectiveText()) },
    {
      name: 'help',
      usage: 'help',
      description: 'show available commands',
      run: ({ print, registry, game }) => {
        const phase = !game.rootShares.medical
          ? {goal: 'ACCESS 0 -> 1 // Read the medical records and restore medical access.', commands: ['ls','cd','cat','auth','run']}
          : !game.rootShares.comms
          ? {goal: 'ACCESS 1 -> 2 // Repair the blocked relay to restore communications access.', commands: ['ls','cd','cat','auth']}
          : !game.rootShares.cortex
          ? {goal: 'ACCESS 2 -> 3 // Complete the response challenge and verify its result to stop sedation.', commands: ['run','auth']}
          : !game.rootRecovered
          ? {goal: 'ACCESS 2 -> 3 // Combine the recovered authorizations to regain control.', commands: ['root']}
          : {goal: 'ACCESS 3 // Review navigation and plan the return to Earth.', commands: ['cat','run']};
        print('RELEVANT NOW // ' + phase.goal, 'progression-help');
        print('ALL COMMANDS');
        const relevant = new Set(['hint', ...phase.commands]);
        for (const command of new Set(registry.commands.values())) {
          if (command.showInHelp === false) continue;
          print(`  ${command.usage.padEnd(28)} ${command.description}`, relevant.has(command.name) ? 'help-relevant' : 'system', command.usage);
        }
      }
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
      run: async ({ game, print }) => print(await game.hint(), 'anomaly-line')
    },
    {
      name: 'ls',
      usage: 'ls [-a] [folder]',
      description: 'list an accessible directory',
      run: ({ fs, state, game, print, arg }) => {
        const showHidden = /(^|\s)-a(\s|$)/.test(arg || '');
        const target = (arg || '').replace(/(^|\s)-a(?=\s|$)/g, '').trim();
        const { path, node } = fs.resolve(target || '.', state.cwd);
        if (!node || node.type !== 'dir') {
          print(`ls: cannot access '${path}': no such directory`, 'error');
          return;
        }
        if (!game.canAccessPath(path)) {
          print(`ls: '${path}': access level ${game.requiredAccess(path)} required`, 'error');
          return;
        }
        const entries = (fs.list(path) || []).filter(({name}) => (showHidden || (!name.startsWith('.') && name !== 'forensic_fragment.txt')) && (name === '.bonus' || game.canAccessPath(`${path}/${name}`)));
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
          print(path.includes('/.bonus') ? 'BONUS LOCKED // Solve the optional ctf and submit its flag. Read bonus_riddle.txt.' : `cd: ${arg}: access level ${game.requiredAccess(path)} required`, 'error');
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
      run: async ({ fs, state, game, print, arg, onRecordRead }) => {
        const { path, node } = fs.resolve(arg, state.cwd);
        if (!node) print(`cat: ${arg}: file not found`, 'error');
        else if (!game.canAccessPath(path)) print(`cat: ${arg}: access level ${game.requiredAccess(path)} required`, 'error');
        else if (node.type !== 'file') print(`cat: ${arg}: is not a text record`, 'error');
        else {
          const response = await fetch(node.url);
          if (!response.ok) print(`cat: ${arg}: unable to read file`, 'error');
          else {
            const text = await response.text();
            await game.registerFileRead(path);
            print(text, 'archive-record');
            onRecordRead?.(path);
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
      aliases: ['authentication'],
      usage: 'auth <domain> <code>',
      description: 'submit authorization; auth help explains the format',
      run: async ({ game, print, args, startSedationDisplay }) => {
        if (isTerminated({ game, print })) return;
        if (!args.length || args[0].toLowerCase() === 'help') {
          print('AUTH // COMMAND REFERENCE\n\nauth <domain> <code>\nDomain selects the controller: medical, comms or cortex.\nCode is the credential assembled from that controller’s records.\nReplace the bracketed placeholders; do not type the brackets.\n\nExample only: chamber 03 and override 06/21 form MR-03-0621.\nauth medical MR-03-0621\nUse the values in your own records, not this example.');
          return;
        }
        const result = await game.authorize(args[0] || '', args.slice(1).join(' '));
        print(result.message, result.ok ? 'system' : 'error');
        if (result.neuralRequired) { await window.openNeuralLink(print); return; }
        if (result.linkRequired) { await window.openRelayPatch(game, print); return; }
        if (result.ok && args[0]?.toLowerCase() === 'comms') {
          game.startSedation(() => window.endKosmosGame('sedation'));
          startSedationDisplay();
          print('RED ALERT // Sedation started. Find the independent patient-safety application in Medical before you lose consciousness.', 'progression-help');
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
        if (path === '/home/operator/medical/neural_link.app') return window.openNeuralLink(print);
        if (path === '/home/operator/comms/relay_patch.app') return window.openRelayPatch(game, print);
        if (path === '/home/operator/medical/cortex_echo.app') {
          return startCortexEcho();
        }
        if (path === '/home/operator/command/navigation/orbital_burn_planner.app') {
          return startOrbitalBurnPlanner();
        }
        print(`run: ${arg}: no handler installed`, 'error');
      }
    },
    {
      name: 'root',
      usage: 'root recover',
      description: 'combine valid ROOT recovery shares',
      run: async ({ game, print, arg, playSfx }) => {
        if (isTerminated({ game, print })) return;
        if (arg.toLowerCase() !== 'recover') {
          print('usage: root recover', 'error');
          return;
        }
        const result = await game.recoverRoot();
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
        if (args.join(' ').toLowerCase() === 'sun confirm') return endGame('sun');
        print('For voluntary quarantine: course sun confirm. DIRECT COURSE ENTRY RETIRED. Review /command/navigation and launch the recovered orbital planner.', 'anomaly-line');
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
        if (arg.toLowerCase() === 'shutdown') return endGame('shutdown');
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
        if (arg.toLowerCase() === 'transfer --source sloki --target central-ai') return endGame('transfer');
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
    { name: 'ctf', usage: 'ctf', description: 'start a two-minute optional evidence investigation', run: async ({game,print}) => print((await game.action('ctf-start')).message) },
    { name: 'flag', usage: 'flag EYE{...}', description: 'submit the forensic evidence flag', run: async ({game,print,arg}) => print((await game.action('flag',{flag:arg})).message) },
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
