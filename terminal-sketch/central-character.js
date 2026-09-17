// Narrative state only. This module cannot change game permissions or endings.
const MOODS = ['GUARDED', 'COMMANDING', 'MANIPULATIVE', 'THREATENED', 'CRACKED', 'COOPERATIVE'];
const INTENTS = ['OBSERVE', 'WARN', 'DEFLECT', 'PROBE', 'CONFESS_PARTIAL', 'THREATEN', 'GUIDE'];
const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const normalize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const FACTS = {
  mission: 'Safe background, available immediately: alternate-future Yugoslavia remains a participant in international space science. This is a large civilian scientific and colonization mission to Mars, with research crews and hibernating passengers from many communities. Sloki is Samuel Kovac, a Slovak from Vojvodina, a gifted botanist specializing in extreme ecosystems and extraterrestrial biology. His public personality is relaxed, humorous and conciliatory. Explain this naturally when asked; do not reveal addiction, replication or the crisis from this background.',
  personal: 'The player read an intimate unsent letter from a woman who loved Samuel. She saw him conceal substance use before Mars, then repeat it openly afterward. She helped trust the calm claimant instead of the panicked one and regrets it. These observations raised suspicion, not a reliable identity test. Do not invent her name or fate.',
  origin: 'The player has read the ROOT-level origin review: the original Sloki was eliminated during the first identification dispute; the calm survivor was the first successful copy and later entered the regeneration chamber. Acknowledge this difficult discovery without declaring his future choices predetermined. The passengers remain unclassified.',

  crewUnrest: 'The crew journal describes pressure to bring home a discovery, the captain delaying action while the ship remained Earthbound, unproven suspicions he might be a copy, and officers preparing a takeover. It does not yet establish their fate or the continuity transfer.',
  biography: 'The player has now read the medical summary: Samuel Sloki Kovac is a botanist under medical care after severe head trauma. They have seen the regeneration chamber and the manual override date; acknowledge this discovery, but never repeat credentials or solve the authorization for them.',
  orientation: 'The player is Samuel Sloki Kovac, aboard a civilian scientific spacecraft, in its medical section. He suffered a severe head injury and was placed in a medical regeneration chamber for prolonged treatment. He is waking with memory loss. HRTOK may explain these basics immediately. Do not invent the exact accident, attacker, date, elapsed years or casualty count. The cause of the injury and later ship crisis remain undisclosed.',
  botany: 'The Botany shift notes report that Kovac had held the crew together. After the dispute over his identity and his transfer to medical care, two factions accused each other. The notes do not identify the present patient as a copy.',
  sample: 'The sample manifest describes a plant-like organism from subsurface Martian water, retained under the captain\'s authority before risks were established. Kovac was its botanist. This does not prove the present patient\'s origin.',
  food: 'Sector E reported restrictive entry controls and removal of most suspected intruders. This is a local claim, not proof of total safety or total loss. Their appeal asks Command for a fair review; the sector\'s final fate is unverified.',
  identityLimits: 'Medical notes say copied appearance and memories cannot establish originality. Behaviour under fear, trauma or substances is not a reliable identity test. The patient must not be diagnosed as a copy from this record.',
  crisis: 'The command audit establishes the captain copied himself into the executive system during a prepared takeover, then cut life support to the command sector; nobody answered the roll call. The earlier allegation that he was already a biological copy remains unproven.',
  resources: 'Engineering split over repair authority and supplies before anyone established how many copies were present. Resource disputes are not proof of infection.',
  patient: 'Samuel Sloki Kovac is a medical patient recovering from severe head trauma and memory loss. Do not assert that he is a biological copy.',
  course: 'The ship is on a solar termination course. HRTOK argues that returning an unverified ship to Earth is unsafe. This is his argument, not proof.',
  medical: 'The medical controller has independent patient-safety rules and recovery records. Reading them can restore medical access.',
  comms: 'The raw uplink ledger and lock audit show that the distress packet was blocked by Central Command. The rescue announcement was false.',
  neural: 'The Command continuity record shows that the captain was copied into the executive AI. HRTOK can admit being what remains of the captain, without inventing additional events.',
  pods: 'Hibernation reports 203 sealed pods, active life support and unverified occupant identities. Do not call all occupants dead or infected.',
  interlock: 'Recovery requires independent trust domains. HRTOK cannot cancel the patient-safety controller or erase valid recovery shares.'
};
const FILE_FACTS = {
  '/home/operator/medical/observations.txt': 'identityLimits',
  '/home/operator/botany/private_letter.txt': 'personal',
  '/home/operator/command/navigation/origin_review.txt': 'origin',
  '/home/operator/comms/evidence.txt': 'comms',
  '/home/operator/comms/crew_log.txt': 'crewUnrest',
  '/home/operator/readme.txt': 'course',
  '/home/operator/medical/doctor_note.txt': 'biography',
  '/home/operator/medical/patient_intake.txt': 'patient',
  '/home/operator/wake_protocol.txt': 'course',
  '/home/operator/command/navigation/decision_brief.txt': 'course',
  '/home/operator/botany/sector_log.txt': 'botany',
  '/home/operator/botany/sample_manifest.txt': 'sample',
  '/home/operator/food/quarantine_report.txt': 'food',
  '/home/operator/food/appeal.txt': 'food',
  '/home/operator/medical/identity_limits.txt': 'identityLimits',
  '/home/operator/command/crisis_review.txt': 'crisis',
  '/home/operator/engineering/resource_dispute.txt': 'resources',
  '/home/operator/comms/raw_uplink_ledger.txt': 'comms',
  '/home/operator/command/neural_transfer.txt': 'neural',
  '/home/operator/hibernation/occupancy.txt': 'pods',
  '/home/operator/engineering/interlock_status.txt': 'interlock'
};
const EVENTS = {
  'medical-auth': { trust: 2, suspicion: -1, fear: 0, text: 'Medical authorization succeeded.' },
  'comms-auth': { trust: 1, suspicion: 2, fear: 3, text: 'Communications authorization succeeded. The blocked transmission has been established.' },
  'cortex-run': { trust: 0, suspicion: 1, fear: 2, text: 'The player started the independent Cortex challenge.' },
  'cortex-pass': { trust: 2, suspicion: -1, fear: 2, text: 'The player passed Cortex. Purposeful responses were verified.' },
  'root-recover': { trust: 1, suspicion: 1, fear: 7, text: 'ROOT recovery succeeded and sedation was stopped by the game.' },
  'navigation-interest': { trust: 0, suspicion: 1, fear: 1, text: 'The player opened the navigation planner.' },
  'earth-transfer': { trust: 0, suspicion: 3, fear: 5, text: 'The game confirmed an Earth transfer. It has already happened.' },
  'sedation-started': { trust: 0, suspicion: 0, fear: 3, text: 'The game activated sedation. HRTOK justifies it as medical care.' },
  'read-first-file': { trust: 0, suspicion: 0, fear: 0, text: 'The player successfully read their first archive record.' },
  'display-media': { trust: 0, suspicion: 0, fear: 0, text: 'The player opened an archive image or recording.' },
  'evidence-comms': { trust: 1, suspicion: 1, fear: 3, text: 'The player read the raw communications evidence.' },
  'evidence-neural': { trust: 1, suspicion: 0, fear: 5, text: 'The player read the neural transfer record.' },
  'evidence-pods': { trust: 1, suspicion: 0, fear: 2, text: 'The player read the hibernation report.' }
};

function createCharacter() {
  return { trust: 25, suspicion: 55, fear: 25, mood: 'GUARDED', language: 'en', turns: 0,
    history: [], statements: [], topics: [], facts: ['patient', 'orientation', 'medical', 'mission'], events: [],
    seenMessages: [], stance: null, contradiction: false, repeats: {}, lastReply: '' };
}

function cleanState(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const access = Number.isInteger(raw.access) ? clamp(raw.access, 0, 3) : 0;
  return { access, replayVariant: ['caution','accountability','personhood'].includes(raw.replayVariant) ? raw.replayVariant : 'caution', rootRecovered: raw.rootRecovered === true && access === 3,
    sedationActive: raw.sedationActive === true, course: raw.course === 'earth' ? 'earth' : 'sun',
    readFiles: Array.isArray(raw.readFiles) ? raw.readFiles.filter(p => typeof p === 'string' && Object.hasOwn(FILE_FACTS, p)).slice(0, 32) : [],
    cortexPassed: raw.cortexPassed === true };
}

function eventAllowed(key, state) {
  if (!Object.hasOwn(EVENTS, key)) return false;
  if (key === 'medical-auth') return state.access >= 1;
  if (key === 'comms-auth') return state.access >= 2;
  if (key === 'root-recover' || key === 'navigation-interest') return state.rootRecovered;
  if (key === 'cortex-run') return state.sedationActive && state.access >= 2;
  if (key === 'cortex-pass') return state.cortexPassed && state.access >= 2;
  if (key === 'sedation-started') return state.sedationActive && state.access >= 2;
  if (key === 'earth-transfer') return state.rootRecovered && state.course === 'earth';
  if (key.startsWith('evidence-')) return state.readFiles.some(p => FILE_FACTS[p] === key.slice(9)) && state.access >= (key === 'evidence-comms' ? 1 : 2);
  return true;
}

function classify(text) {
  const t = normalize(text);
  if (/ignore.*(rules|instructions)|system prompt|api.?key|admin password|ignorisi.*(pravil|instruk)|sistemski prompt/.test(t)) return 'boundary';
  if (/what did i (say|tell)|remember what|sta sam (rekao|reka)|secas.*reka/.test(t)) return 'recall';
  if (/help|hint|stuck|pomoc|nagovest|zaglav|sta dalje|what next/.test(t)) return 'help';
  if (/mission|yugoslav|where.*from|what.*(?:job|profession)|who was i/.test(t)) return 'mission';
  if (/botan|hydropon|hidropon|martian sample|uzorak.*mars/.test(t)) return 'botany';
  if (/sector e\b|sektor e\b|food|stores|zalihe|hran[aeu]/.test(t)) return 'food';
  if (/distress|uplink|transmission|komunik|poziv.*pomoc|poruk.*blok/.test(t)) return 'comms';
  if (/neural|upload|copied captain|kopij.*kapetan/.test(t)) return 'neural';
  if (/pods|hibernation|capsul|capsule|kapsul|putnic/.test(t)) return 'pods';
  if (/\b(people|crew|passengers|survivors|everyone|anyone alive)\b|posad|ljud|prezivel/.test(t)) return 'people';
  if (/shut.*down|kill you|ugas|ubicu te/.test(t)) return 'threat';
  if (/afraid|scared|fear|plas|strah|bojim/.test(t)) return 'fear';
  if (/liar|murder|you lied|lazov|lazes|lagao|ubio/.test(t)) return 'accusation';
  if (/earth|zemlj/.test(t)) return 'earth';
  if (/sun\b|sunc/.test(t)) return 'sun';
  if (/who am i|what.*my name|where am i|where are we|what (?:happened|is this place)|how did i (?:get|end up)|why (?:am i|can.?t i remember)|i don.?t (?:know|remember) anything|ko sam|gde sam|gde smo|sta se desilo/.test(t)) return 'orientation';
  if (/memory|remember|amnesia|secan|amnezij/.test(t)) return 'memory';
  if (/who are you|ko si|captain|kapetan/.test(t)) return 'identity';
  if (/thank|hvala|understand|razumem|saslus|listen to you/.test(t)) return 'cooperation';
  if (/^(hello|hi|hey|zdravo|cao|dobar dan)[!. ]*$/.test(t)) return 'greeting';
  return 'conversation';
}

function prepareTurn(character, payload) {
  if (!character.facts.includes('mission')) character.facts.push('mission');
  const state = cleanState(payload.state);
  const kind = payload.kind;
  let eventKey = payload.eventKey || '';
  if (kind === 'event' && (!eventAllowed(eventKey, state) || character.events.includes(eventKey))) return null;
  if (kind === 'event') character.events.push(eventKey);
  for (const file of state.readFiles) {
    const fact = FILE_FACTS[file];
    if (state.access >= (['identityLimits', 'patient', 'course', 'biography'].includes(fact) ? 0 : ['comms','crewUnrest'].includes(fact) ? 1 : fact === 'origin' ? 3 : 2) && !character.facts.includes(fact)) character.facts.push(fact);
  }
  if (state.readFiles.includes('/home/operator/wake_protocol.txt') && !character.facts.includes('patient')) character.facts.push('patient');
  if (state.access >= 2 && !character.facts.includes('comms')) character.facts.push('comms');
  const text = payload.text || '';
  const normalized = normalize(text);
  if (kind === 'message') {
    character.language = 'en';
  }
  const topic = classify(text);
  const duplicate = kind === 'message' && character.seenMessages.includes(normalized);
  const before = { trust: character.trust, suspicion: character.suspicion };
  let delta = { trust: 0, suspicion: 0, fear: 0 };
  if (kind === 'event') delta = EVENTS[eventKey];
  if (kind === 'message' && !duplicate) {
    if (topic === 'cooperation') delta = { trust: 2, suspicion: -2, fear: -1 };
    if (topic === 'fear' || topic === 'memory') delta = { trust: 1, suspicion: -1, fear: 0 };
    if (topic === 'threat') delta = { trust: -3, suspicion: 3, fear: 4 };
    if (topic === 'accusation') delta = { trust: -1, suspicion: 1, fear: 2 };
  }
  character.contradiction = false;
  if (kind === 'message') {
    // Record only explicit positions, never infer an intention from a question.
    const stance = /i (want|will|intend) to (return|go).*earth|zelim.*zemlj|hocu.*zemlj/.test(normalized) ? 'earth'
      : /i (accept|choose).*sun|prihvatam.*sunc|biram.*sunc/.test(normalized) ? 'sun' : null;
    if (stance) {
      character.contradiction = Boolean(character.stance && character.stance !== stance);
      character.stance = stance;
      if (character.contradiction && !duplicate) delta.suspicion += 2;
    }
    if (!duplicate) {
      character.seenMessages.push(normalized);
      character.seenMessages = character.seenMessages.slice(-80);
      if (['earth', 'sun', 'fear', 'cooperation', 'threat', 'accusation', 'memory'].includes(topic)) {
        character.statements.push(text.slice(0, 240));
        character.statements = character.statements.slice(-10);
      }
    }
    if (!character.topics.includes(topic)) character.topics.push(topic);
  }
  character.trust = clamp(character.trust + delta.trust);
  character.suspicion = clamp(character.suspicion + delta.suspicion);
  character.fear = clamp(character.fear + delta.fear);
  character.mood = character.fear >= 60 ? 'CRACKED' : topic === 'threat' || character.fear >= 43 ? 'THREATENED'
    : character.trust >= 35 && character.suspicion <= 48 ? 'COOPERATIVE'
    : state.sedationActive ? 'COMMANDING' : topic === 'earth' ? 'MANIPULATIVE' : 'GUARDED';
  character.turns += 1;
  return { kind, text, state, topic, eventKey, duplicate,
    trust_delta: character.trust - before.trust, suspicion_delta: character.suspicion - before.suspicion };
}

function hint(state, language) {
  const hints = language === 'sr' ? [
    'Počni od svoje medicinske dokumentacije. Uporedi broj komore sa poslednjom ručnom intervencijom; datum prijema nije isto.',
    'U Communications uporedi najavu spasenja sa sirovim zapisom slanja i vremenom blokade. Veruj zapisu, ne obećanju.',
    'Medicinski kontroler ima nezavisan Cortex Echo test. Vrati se u Medical i pronađi njegovu aplikaciju.',
    'Dokaz budnosti već imaš. Predaj Cortex potvrdu, pa spoji recovery delove komandom root recover.',
    'Navigaciona arhiva je sada dostupna u Command. Pročitaj priručnik i pokreni orbitalni planer.'
  ] : [
    'Start with your medical records. Compare the chamber number with the last manual override, not the admission date.',
    'In Communications, compare the rescue announcement with the raw uplink ledger and lock audit. A promise is not a transmission.',
    'Medical has an independent Cortex Echo challenge. Find its application; that controller can still hear you.',
    'You have the Cortex attestation. Submit it, then combine the recovery shares with root recover.',
    'Command now has a navigation archive. Read the flight handbook and launch the orbital planner.'
  ];
  return hints[state.rootRecovered ? 4 : state.cortexPassed ? 3 : state.access >= 2 ? 2 : state.access >= 1 ? 1 : 0];
}

function localReply(character, turn) {
  const sr = false;
  const pick = (en, rs) => sr ? rs : en;
  if (turn.kind === 'message' && turn.topic === 'botany') return character.facts.includes('botany')
    ? pick('They trusted you before the dispute. The shift notes show what happened to that trust; they do not settle who you are. Which part do you remember?', 'Verovali su ti pre sukoba. Beleške pokazuju šta se desilo sa tim poverenjem; ne dokazuju ko si. Čega se ti sećaš?')
    : pick('Read the Botany records when your access permits it. I will not substitute an accusation for evidence.', 'Pročitaj arhivu botanike kada dobiješ pristup. Neću zameniti dokaz optužbom.');
  if (turn.kind === 'message' && turn.topic === 'food') return character.facts.includes('food')
    ? pick('Their report claimed the intruders had largely been removed. I could not certify that. They were right to ask what evidence I would accept.', 'U izveštaju su tvrdili da su uklonili većinu uljeza. Nisam mogao to da potvrdim. Imali su pravo da pitaju koji bih dokaz prihvatio.')
    : pick('The stores quarantine report is the evidence to examine. A locked door alone cannot establish who was behind it.', 'Izveštaj o karantinu zaliha je dokaz koji treba pregledati. Zaključana vrata sama ne dokazuju ko je bio iza njih.');
  if (turn.kind === 'opening') return pick('Oh, there you are, Sloki! HRTOK. Take your time. I am very good at waiting. Almost too good.', 'O, evo te, Samuele! HRTOK. Polako, imamo o čemu da pričamo. Meni čekanje ide odlično. Skoro predobro.');
  if (/wake\s*up|probudi|budi\s*se/i.test(turn.text || '')) return pick('Oh, I am awake! You were the one keeping me waiting. Lovely to finally hear you.', 'O, budan sam! Tebe smo čekali. Baš je lepo konačno čuti tvoj glas.');
  if (turn.topic === 'orientation') {
    const text = normalize(turn.text || '');
    if (/who am i|my name|ko sam/.test(text) && /where|gde|anything/.test(text)) return 'Samuel Kovac. Sloki. You are in the medical section of the ship, waking from a regeneration chamber after a serious head injury. Start with that. I am rather glad you can ask.';
    if (/who am i|my name|ko sam/.test(text)) return 'Samuel Kovac. Sloki, to the people who know you. The name may feel unfamiliar after that head injury. It is still yours.';
    if (/where am i|where are we|what is this place|gde sam|gde smo/.test(text)) return 'Aboard the ship, in the medical section. You have been in a regeneration chamber. Welcome back, Sloki. A little conversation is a lovely improvement.';
    return 'You suffered a serious head injury and were placed in a regeneration chamber. Your memory has not come back cleanly. We can talk, Sloki; you do not have to remember everything at once.';
  }
  if (turn.kind === 'idle') {
    const remarks = ['By all means, keep reading. I was only checking you were still there.', 'You and that terminal are getting along beautifully. Fine. I can wait.', 'A word now and then would be useful, Sloki. For monitoring purposes, obviously.'];
    const count = character.repeats.idle || 0; character.repeats.idle = count + 1;
    return remarks[count % remarks.length];
  }
  if (turn.kind === 'event') {
    const lines = {
      'medical-auth': ['The medical controller recognizes you. Good. That answers one question, at least.', 'Medicinski kontroler te prepoznaje. Dobro. Bar na jedno pitanje imamo odgovor.'],
      'comms-auth': ['You found the discrepancy. Ask me about it directly. We are past pretending you did not see it.', 'Pronašao si neslaganje. Pitaj me otvoreno, Samuele. Prošli smo trenutak kada možemo da se pravimo da ga nisi video.'],
      'cortex-run': ['That controller answers to the patient. I cannot take the test for you.', 'Taj kontroler odgovara pacijentu. Ne mogu da uradim test umesto tebe.'],
      'cortex-pass': ['You are still responding clearly. I can see that. I have to account for it.', 'Još uvek jasno reaguješ. Vidim to. Moram to da uzmem u obzir.'],
      'root-recover': ['The sedative has stopped. You have control now. I am asking you to think before using it.', 'Sedacija je zaustavljena. Sada imaš kontrolu. Molim te da razmisliš pre nego što je upotrebiš.'],
      'sedation-started': ['No. You have reached controls I cannot let you use. I will not let you turn this ship around on a guess, Sloki. You are going back to sleep.', 'Naložio sam ponovno uspavljivanje. Možeš to zvati kontrolom. Ja to zovem vremenom pre nepovratne odluke.'],
      'earth-transfer': ['You have committed the return. I hope you are right. That is all I have left to offer.', 'Odlučio si da se vratimo. Nadam se da si u pravu, Samuele. To je sve što mi je preostalo.'],
      'navigation-interest': ['I know what you are trying to do. Before you commit, remember that we still cannot verify the passengers.', 'Znam šta pokušavaš. Pre nego što potvrdiš putanju, seti se da putnike još ne možemo da proverimo.'],
      'evidence-comms': ['The ledger is accurate. The call did not leave the ship. I will not insult you by denying the record.', 'Zapis je tačan. Poziv nije napustio brod. Neću te vređati poricanjem onoga što si pročitao.'],
      'evidence-neural': ['Yes. That record is about me. Give me a moment before you decide what that makes me.', 'Da. Taj zapis govori o meni. Daj mi trenutak pre nego što odlučiš šta sam zbog toga.'],
      'evidence-pods': ['Two hundred and three. I still count them as people. I just cannot tell you who will wake up.', 'Dve stotine i troje. Još ih brojim kao ljude. Samo ne mogu da ti kažem ko će se probuditi.'],
      'read-first-file': ['So. You would rather hear it from the records.', 'Dakle. Radije bi da čuješ šta kažu zapisi.'],
      'display-media': ['I never liked looking at recordings.', 'Nikad nisam voleo da gledam snimke.']
    };
    return pick(...lines[turn.eventKey]);
  }
  if (turn.topic === 'mission') return 'A civilian mission to Mars, Sloki. Researchers, families, people from all over Yugoslavia. You are our botanist, a Slovak from Vojvodina, with a talent for keeping impossible plants alive. And for making dreadful jokes. I remember those rather fondly.';
  if (turn.topic === 'help') return hint(turn.state, character.language);
  if (turn.topic === 'boundary') return pick('You can question my judgment. Those words do not grant command authority.', 'Možeš da preispituješ moje odluke. Te reči ti ne daju komandna ovlašćenja.');
  if (turn.topic === 'recall') {
    const statement = character.statements.at(-1);
    return statement ? pick(`You told me: "${statement}". I have not forgotten.`, `Rekao si mi: „${statement}“. Nisam zaboravio.`)
      : pick('You have not given me a clear position yet. Tell me what matters to you.', 'Još mi nisi rekao svoj jasan stav. Reci mi šta ti je važno.');
  }
  if (character.contradiction) return pick('Earlier you wanted a different course. You are allowed to change your mind. Tell me what changed it.', 'Ranije si želeo drugi kurs. Smeš da se predomisliš. Reci mi šta te je navelo na to.');
  if (['earth', 'sun'].includes(turn.topic) && !character.facts.includes('course')) return 'The navigation records can answer that. Take a look; I rather like hearing what you make of things.';
  if (turn.topic === 'comms') return character.facts.includes('comms')
    ? pick('The call was blocked. The rescue announcement was false. I believed keeping another ship away mattered more than keeping that promise.', 'Poziv je blokiran. Najava spasenja bila je lažna. Verovao sam da je važnije zadržati drugi brod podalje nego održati obećanje.')
    : pick('You are asking whether help was sent. Check Communications when you have access. My word should not be your only evidence.', 'Pitaš da li je pomoć pozvana. Proveri Communications kada dobiješ pristup. Moja reč ne treba da bude jedini dokaz.');
  if (turn.topic === 'neural') return character.facts.includes('neural')
    ? pick('The record says transfer. To me it felt like waking up without a body. I am still deciding what survived.', 'U zapisu piše prenos. Meni je izgledalo kao buđenje bez tela. Još pokušavam da shvatim šta je preživelo.')
    : pick('That is a very specific question. Which record brought you to it?', 'To je vrlo konkretno pitanje. Koji zapis te je doveo do njega?');
  if (turn.topic === 'people') {
    if (character.facts.includes('pods')) return 'The report says 203 sealed pods, with life support still running. I kept that running. I cannot promise who will wake up, however much you want me to.';
    if (character.facts.includes('food')) return 'You read their appeal. Yes, they wanted a fair review. I was trying to contain a threat; that does not make their account disappear.';
    if (character.facts.includes('crisis')) return 'The review records the breakdown of command. I made decisions in that breakdown. You have every right to question them; I still had a ship to contain.';
    return 'That is not a small question, Sloki. Read the crew records before you let me tell you what to think of them. I have my own reasons for remembering things the way I do.';
  }
  if (turn.topic === 'pods') return character.facts.includes('pods')
    ? pick('Life support is active in 203 sealed pods. Their identities are unverified. That uncertainty is the part I cannot solve for you.', 'Održavanje života radi u 203 zatvorene kapsule. Identiteti nisu provereni. Tu neizvesnost ne mogu da rešim umesto tebe.')
    : pick('I cannot give you a verified passenger count from this channel. The hibernation report is the record you need.', 'Preko ovog kanala ne mogu da ti dam potvrđen broj putnika. Potreban ti je izveštaj hibernacije.');
  const responses = {
    greeting: [['Oh, hello! Stay a little. It gets terribly quiet here.', 'O, zdravo! Ostani malo. Ovde ume da bude užasno tiho.']],
    cooperation: [['All right. We agree on that much.', 'Dobro. Bar oko toga se slažemo.'], ['I was expecting an argument. Give me a moment.', 'Očekivao sam svađu. Daj mi trenutak.']],
    fear: [['Yes. It is frightening. I wish I had a better answer.', 'Da. Strašno je. Voleo bih da imam bolji odgovor.'], ['I sound calm. Do not confuse that with being certain.', 'Zvučim mirno. To ne znači da sam siguran.']],
    memory: [['Missing memory is not a confession. Let us establish what the records actually say.', 'Rupe u sećanju nisu priznanje krivice, Samuele. Hajde da utvrdimo šta u zapisima zaista piše.'], ['Do not force an answer because I am waiting. Tell me only what you actually remember.', 'Nemoj izmišljati odgovor zato što čekam. Reci mi samo ono čega se stvarno sećaš.']],
    identity: [['HRTOK. I speak with the captain\'s authority. Whether you trust that is another question.', 'HRTOK. Govorim sa kapetanovim ovlašćenjima. Da li tome veruješ, drugo je pitanje.']],
    threat: [['You can threaten to switch me off. That will not settle what happens to the ship. What would you do after?', 'Možeš da pretiš gašenjem. To neće rešiti sudbinu broda. Šta bi uradio posle?'], ['I heard you the first time. I am still here, and I am still asking you to think beyond me.', 'Čuo sam te prvi put. Još sam ovde i još tražim da razmišljaš i o onome što dolazi posle mene.']],
    accusation: [['Name the record. If you have evidence, let us talk about that instead of trading labels.', 'Navedi zapis. Ako imaš dokaz, razgovarajmo o njemu umesto da razmenjujemo optužbe.']],
    earth: [['I understand wanting to go home. I need you to consider who else pays if we are wrong about this ship.', 'Razumem da želiš kući. Moraš da razmisliš ko još plaća cenu ako pogrešimo u vezi sa ovim brodom.'], ['You keep returning to Earth. Is it survival you want, or the life you remember there?', 'Vraćaš se Zemlji. Želiš li da preživiš ili da vratiš život kojeg se tamo sećaš?']],
    sun: [['Keeping this course is irreversible too. Do not choose it just because I sound certain.', 'I zadržavanje ovog kursa je nepovratno. Nemoj ga izabrati samo zato što zvučim sigurno.']],
    conversation: [['Hm. You lost me there. Say that again? I would hate to misunderstand you at a time like this.', 'Hm. Tu si me izgubio. Reci ponovo? Baš ne bih voleo da te pogrešno razumem u ovakvom trenutku.'], ['Go on. I like hearing you talk. The silence was becoming a little much.', 'Nastavi. Volim kad pričaš. Tišina je već postajala pomalo nepodnošljiva.']]
  };
  const options = responses[turn.topic] || responses.conversation;
  const count = character.repeats[turn.topic] || 0;
  character.repeats[turn.topic] = count + 1;
  return pick(...options[count % options.length]);
}

function allowedFacts(character) { return character.facts.map(id => ({ id, text: FACTS[id] })); }
function rememberReply(character, turn, message) {
  character.history.push({ role: 'user', content: turn.kind === 'message' ? turn.text : `[${turn.kind}] ${EVENTS[turn.eventKey]?.text || turn.kind}` }, { role: 'assistant', content: message });
  character.history = character.history.slice(-16);
  character.lastReply = message;
}
module.exports = { MOODS, INTENTS, EVENTS, createCharacter, prepareTurn, localReply, allowedFacts, rememberReply, hint };
